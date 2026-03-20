import type { Express, RequestHandler } from "express";
import { pool } from "./db";
import { randomUUID } from "crypto";
import { identifyVisitorByIP } from "./visitor-intelligence";

const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const getIP = (req: any): string =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
  req.headers["x-real-ip"] ||
  req.socket?.remoteAddress ||
  "unknown";

const parseUA = (ua: string = "") => {
  const browser =
    ua.includes("Chrome") && !ua.includes("Edg") ? "Chrome" :
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Safari") && !ua.includes("Chrome") ? "Safari" :
    ua.includes("Edg") ? "Edge" :
    ua.includes("OPR") ? "Opera" : "Other";

  const device =
    /iPhone|iPad|iPod/.test(ua) ? "iOS" :
    /Android/.test(ua) ? "Android" :
    /Windows/.test(ua) ? "Windows" :
    /Mac/.test(ua) ? "Mac" :
    /Linux/.test(ua) ? "Linux" : "Other";

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  return { browser, device, isMobile };
};

export function registerTrackerPublicRoutes(app: Express) {

  app.post("/api/tracker/pageview", async (req, res) => {
    try {
      const {
        session_id, visitor_id, user_id,
        page, title, referrer,
        utm_source, utm_medium, utm_campaign, utm_term,
        screen_width, screen_height, timezone,
      } = req.body;

      const ip = getIP(req);
      const ua = req.headers["user-agent"] || "";
      const { browser, device, isMobile } = parseUA(ua);

      await pool.query(`
        INSERT INTO track_pageviews
          (session_id, visitor_id, user_id, page, title, referrer,
           utm_source, utm_medium, utm_campaign, utm_term,
           ip, browser, device, is_mobile,
           screen_width, screen_height, timezone)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [session_id, visitor_id, user_id, page, title, referrer,
         utm_source, utm_medium, utm_campaign, utm_term,
         ip, browser, device, isMobile,
         screen_width, screen_height, timezone]
      );

      await pool.query(`
        INSERT INTO track_visitors (visitor_id, user_id, first_ip, first_browser, first_device, first_seen, last_seen, visit_count)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW(), 1)
        ON CONFLICT (visitor_id) DO UPDATE SET
          last_seen   = NOW(),
          visit_count = track_visitors.visit_count + 1,
          user_id     = COALESCE(EXCLUDED.user_id, track_visitors.user_id)`,
        [visitor_id, user_id || null, ip, browser, device]
      );

      res.json({ ok: true });
    } catch (e: any) {
      console.error("tracker/pageview:", e.message);
      res.json({ ok: false });
    }
  });

  app.post("/api/tracker/session", async (req, res) => {
    try {
      const { session_id, visitor_id, user_id, entry_page, referrer, utm_source, utm_medium, utm_campaign } = req.body;
      const ip = getIP(req);
      const ua = req.headers["user-agent"] || "";
      const { browser, device, isMobile } = parseUA(ua);

      await pool.query(`
        INSERT INTO track_sessions
          (session_id, visitor_id, user_id, entry_page, referrer,
           utm_source, utm_medium, utm_campaign, ip, browser, device, is_mobile)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (session_id) DO UPDATE SET
          last_activity = NOW(),
          user_id = COALESCE(EXCLUDED.user_id, track_sessions.user_id)`,
        [session_id, visitor_id, user_id || null, entry_page, referrer,
         utm_source, utm_medium, utm_campaign, ip, browser, device, isMobile]
      );
      res.json({ ok: true });
    } catch (e) {
      res.json({ ok: false });
    }
  });

  app.post("/api/tracker/session/end", async (req, res) => {
    try {
      const { session_id, duration_seconds, exit_page, page_count } = req.body;
      await pool.query(`
        UPDATE track_sessions
        SET duration_seconds=$1, exit_page=$2, page_count=$3, ended_at=NOW()
        WHERE session_id=$4`,
        [duration_seconds, exit_page, page_count, session_id]
      );
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.post("/api/tracker/click", async (req, res) => {
    try {
      const {
        session_id, visitor_id, page,
        element_type, element_text, element_id, element_class,
        href, x, y, is_rage_click,
      } = req.body;

      await pool.query(`
        INSERT INTO track_clicks
          (session_id, visitor_id, page, element_type, element_text,
           element_id, element_class, href, x, y, is_rage_click)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [session_id, visitor_id, page, element_type, element_text,
         element_id, element_class, href, x, y, is_rage_click || false]
      );

      const ip = getIP(req);
      if (ip && ip !== "127.0.0.1" && ip !== "unknown" && visitor_id) {
        const textLower = (element_text || "").toLowerCase();
        const hrefLower = (href || "").toLowerCase();
        const pageLower = (page || "").toLowerCase();
        const isHighIntent = ["billing", "pricing", "service", "contact", "demo", "schedule", "quote", "book", "call"].some(
          k => textLower.includes(k) || hrefLower.includes(k) || pageLower.includes(k)
        );

        if (isHighIntent) {
          try {
            const ownerResult = await pool.query(`SELECT user_id FROM track_sessions WHERE session_id = $1 LIMIT 1`, [session_id]);
            const ownerId = ownerResult.rows[0]?.user_id;
            if (ownerId) {
              const identity = await identifyVisitorByIP(visitor_id, ip, ownerId);
              console.log(`[Tracker] High-intent click: "${element_text}" on ${page} — visitor: ${identity?.name || identity?.company || identity?.email || "anonymous"} (${ip})`);
            }
          } catch {}
        }
      }

      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.post("/api/tracker/search", async (req, res) => {
    try {
      const { session_id, visitor_id, user_id, query, page, results_count, clicked_result } = req.body;

      await pool.query(`
        INSERT INTO track_searches
          (session_id, visitor_id, user_id, query, page, results_count, clicked_result)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [session_id, visitor_id, user_id || null, query, page, results_count || 0, clicked_result || null]
      );

      await pool.query(`
        INSERT INTO track_search_terms (query, count, last_searched_at)
        VALUES ($1, 1, NOW())
        ON CONFLICT (query) DO UPDATE SET
          count = track_search_terms.count + 1,
          last_searched_at = NOW()`,
        [query?.toLowerCase()?.trim()]
      );

      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.post("/api/tracker/scroll", async (req, res) => {
    try {
      const { session_id, visitor_id, page, max_depth_percent, time_to_bottom_seconds } = req.body;
      await pool.query(`
        INSERT INTO track_scroll
          (session_id, visitor_id, page, max_depth_percent, time_to_bottom_seconds)
        VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (session_id, page) DO UPDATE SET
          max_depth_percent = GREATEST(track_scroll.max_depth_percent, EXCLUDED.max_depth_percent),
          time_to_bottom_seconds = COALESCE(EXCLUDED.time_to_bottom_seconds, track_scroll.time_to_bottom_seconds)`,
        [session_id, visitor_id, page, max_depth_percent, time_to_bottom_seconds || null]
      );
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.post("/api/tracker/form", async (req, res) => {
    try {
      const {
        session_id, visitor_id, page,
        form_id, form_name, event_type, field_name,
        time_on_form_seconds,
      } = req.body;

      await pool.query(`
        INSERT INTO track_forms
          (session_id, visitor_id, page, form_id, form_name,
           event_type, field_name, time_on_form_seconds)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [session_id, visitor_id, page, form_id, form_name,
         event_type, field_name, time_on_form_seconds || null]
      );
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.get("/api/tracker/email/open/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const ip = getIP(req);
      const ua = req.headers["user-agent"] || "";
      const { browser, device, isMobile } = parseUA(ua);

      await pool.query(`
        INSERT INTO track_email_events
          (token, event_type, ip, user_agent, browser, device, is_mobile)
        VALUES ($1,'open',$2,$3,$4,$5,$6)`,
        [token, ip, ua, browser, device, isMobile]
      );

      await pool.query(`
        UPDATE track_email_sends
        SET opens = opens + 1,
            first_opened_at = COALESCE(first_opened_at, NOW()),
            last_opened_at  = NOW(),
            open_device     = $2,
            open_browser    = $3
        WHERE token = $1`,
        [token, device, browser]
      );

      const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.set({ "Content-Type": "image/gif", "Cache-Control": "no-store, no-cache" });
      res.end(gif);
    } catch (e) {
      const gif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");
      res.set("Content-Type", "image/gif");
      res.end(gif);
    }
  });

  app.get("/api/tracker/email/click/:token/:link_id", async (req, res) => {
    try {
      const { token, link_id } = req.params;
      const ip = getIP(req);
      const ua = req.headers["user-agent"] || "";
      const { browser, device, isMobile } = parseUA(ua);

      await pool.query(`
        INSERT INTO track_email_events
          (token, event_type, link_id, ip, user_agent, browser, device, is_mobile)
        VALUES ($1,'click',$2,$3,$4,$5,$6,$7)`,
        [token, link_id, ip, ua, browser, device, isMobile]
      );

      await pool.query(`
        UPDATE track_email_sends
        SET clicks = clicks + 1,
            first_clicked_at = COALESCE(first_clicked_at, NOW()),
            last_clicked_at  = NOW()
        WHERE token = $1`,
        [token]
      );

      const result = await pool.query(
        `SELECT original_url FROM track_email_links WHERE token=$1 AND link_id=$2`,
        [token, link_id]
      );

      const url = result.rows[0]?.original_url || "/";
      res.redirect(302, url);
    } catch (e) {
      res.redirect(302, "/");
    }
  });

  app.post("/api/tracker/email/send", async (req, res) => {
    try {
      const { user_id, recipient_email, recipient_name, subject, campaign, links = [] } = req.body;
      const token = randomUUID();

      await pool.query(`
        INSERT INTO track_email_sends
          (token, user_id, recipient_email, recipient_name, subject, campaign)
        VALUES ($1,$2,$3,$4,$5,$6)`,
        [token, user_id, recipient_email, recipient_name, subject, campaign]
      );

      const trackedLinks: any[] = [];
      for (let i = 0; i < links.length; i++) {
        const link_id = `l${i + 1}`;
        await pool.query(`
          INSERT INTO track_email_links (token, link_id, original_url, label)
          VALUES ($1,$2,$3,$4)`,
          [token, link_id, links[i].url, links[i].label || ""]
        );
        trackedLinks.push({
          link_id,
          original_url: links[i].url,
          tracked_url: `/api/tracker/email/click/${token}/${link_id}`,
        });
      }

      res.json({
        token,
        pixel_url: `/api/tracker/email/open/${token}`,
        tracked_links: trackedLinks,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/tracker/identify", async (req, res) => {
    try {
      const { visitor_id, user_id, email, name, company } = req.body;
      await pool.query(`
        UPDATE track_visitors
        SET user_id  = COALESCE($2, user_id),
            email    = COALESCE($3, email),
            name     = COALESCE($4, name),
            company  = COALESCE($5, company)
        WHERE visitor_id = $1`,
        [visitor_id, user_id, email, name, company]
      );
      await pool.query(
        `UPDATE track_sessions SET user_id=$1 WHERE visitor_id=$2 AND user_id IS NULL`,
        [user_id, visitor_id]
      );
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

  app.post("/api/tracker/event", async (req, res) => {
    try {
      const { session_id, visitor_id, user_id, event_name, event_category, properties, page } = req.body;
      await pool.query(`
        INSERT INTO track_custom_events
          (session_id, visitor_id, user_id, event_name, event_category, properties, page)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [session_id, visitor_id, user_id || null, event_name, event_category, JSON.stringify(properties || {}), page]
      );
      res.json({ ok: true });
    } catch (e) { res.json({ ok: false }); }
  });

}

export function registerTrackerDashboardRoutes(app: Express) {

  app.get("/api/tracker/dashboard", requireAuth, async (req, res) => {
    try {
      const { days = 7 } = req.query;
      const d = parseInt(days as string);
      const since = `NOW() - INTERVAL '${d} days'`;

      const [visitors, sessions, topPages, topSearches, devices, browsers, emails, rageClicks, formAbandons] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT visitor_id) AS total,
                 COUNT(DISTINCT CASE WHEN first_seen >= ${since} THEN visitor_id END) AS new_visitors,
                 COUNT(DISTINCT CASE WHEN first_seen < ${since} THEN visitor_id END) AS returning_visitors
          FROM track_visitors WHERE last_seen >= ${since}`),

        pool.query(`
          SELECT COUNT(*) AS total,
                 ROUND(AVG(duration_seconds)) AS avg_duration,
                 ROUND(AVG(page_count),1) AS avg_pages,
                 COUNT(CASE WHEN page_count=1 THEN 1 END) AS bounces
          FROM track_sessions WHERE created_at >= ${since}`),

        pool.query(`
          SELECT page, COUNT(*) AS views, COUNT(DISTINCT visitor_id) AS unique_visitors
          FROM track_pageviews WHERE created_at >= ${since}
          GROUP BY page ORDER BY views DESC LIMIT 10`),

        pool.query(`
          SELECT query, COUNT(*) AS count,
                 COUNT(DISTINCT visitor_id) AS unique_searchers,
                 ROUND(AVG(results_count),0) AS avg_results
          FROM track_searches WHERE created_at >= ${since}
          GROUP BY query ORDER BY count DESC LIMIT 20`),

        pool.query(`
          SELECT device, COUNT(*) AS count
          FROM track_sessions WHERE created_at >= ${since}
          GROUP BY device ORDER BY count DESC`),

        pool.query(`
          SELECT browser, COUNT(*) AS count
          FROM track_sessions WHERE created_at >= ${since}
          GROUP BY browser ORDER BY count DESC`),

        pool.query(`
          SELECT COUNT(*) AS sent,
                 COUNT(CASE WHEN opens > 0 THEN 1 END) AS opened,
                 COUNT(CASE WHEN clicks > 0 THEN 1 END) AS clicked,
                 ROUND(AVG(opens),1) AS avg_opens,
                 ROUND(100.0 * COUNT(CASE WHEN opens>0 THEN 1 END) / NULLIF(COUNT(*),0),1) AS open_rate,
                 ROUND(100.0 * COUNT(CASE WHEN clicks>0 THEN 1 END) / NULLIF(COUNT(*),0),1) AS ctr
          FROM track_email_sends WHERE created_at >= ${since}`),

        pool.query(`
          SELECT page, element_text, element_id, COUNT(*) AS rage_count
          FROM track_clicks WHERE is_rage_click=true AND created_at >= ${since}
          GROUP BY page, element_text, element_id ORDER BY rage_count DESC LIMIT 10`),

        pool.query(`
          SELECT form_name, page,
                 COUNT(CASE WHEN event_type='start' THEN 1 END) AS started,
                 COUNT(CASE WHEN event_type='submit' THEN 1 END) AS submitted,
                 COUNT(CASE WHEN event_type='abandon' THEN 1 END) AS abandoned,
                 ROUND(100.0 * COUNT(CASE WHEN event_type='abandon' THEN 1 END) /
                       NULLIF(COUNT(CASE WHEN event_type='start' THEN 1 END),0),1) AS abandon_rate
          FROM track_forms WHERE created_at >= ${since}
          GROUP BY form_name, page ORDER BY abandoned DESC LIMIT 10`),
      ]);

      res.json({
        period_days: d,
        visitors: visitors.rows[0],
        sessions: sessions.rows[0],
        top_pages: topPages.rows,
        top_searches: topSearches.rows,
        devices: devices.rows,
        browsers: browsers.rows,
        email: emails.rows[0],
        rage_clicks: rageClicks.rows,
        form_abandons: formAbandons.rows,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/visitors", requireAuth, async (req, res) => {
    try {
      const { days = 7, limit = 50, offset = 0 } = req.query;
      const d = parseInt(days as string);
      const result = await pool.query(`
        SELECT v.visitor_id, v.user_id, v.email, v.name, v.company,
               v.first_browser, v.first_device, v.first_seen, v.last_seen, v.visit_count,
               s.last_page, s.utm_source, s.utm_campaign,
               (SELECT COUNT(*) FROM track_pageviews p WHERE p.visitor_id=v.visitor_id) AS total_pageviews,
               (SELECT query FROM track_searches sr WHERE sr.visitor_id=v.visitor_id ORDER BY sr.created_at DESC LIMIT 1) AS last_search
        FROM track_visitors v
        LEFT JOIN LATERAL (
          SELECT exit_page AS last_page, utm_source, utm_campaign
          FROM track_sessions WHERE visitor_id=v.visitor_id ORDER BY last_activity DESC LIMIT 1
        ) s ON true
        WHERE v.last_seen >= NOW() - INTERVAL '${d} days'
        ORDER BY v.last_seen DESC
        LIMIT $1 OFFSET $2`,
        [parseInt(limit as string), parseInt(offset as string)]
      );
      res.json({ visitors: result.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/visitor/:id", requireAuth, async (req, res) => {
    try {
      const vid = req.params.id;
      const [profile, sessions, pageviews, searches, clicks, events] = await Promise.all([
        pool.query(`SELECT * FROM track_visitors WHERE visitor_id=$1`, [vid]),
        pool.query(`SELECT * FROM track_sessions WHERE visitor_id=$1 ORDER BY created_at DESC LIMIT 20`, [vid]),
        pool.query(`SELECT * FROM track_pageviews WHERE visitor_id=$1 ORDER BY created_at DESC LIMIT 50`, [vid]),
        pool.query(`SELECT * FROM track_searches WHERE visitor_id=$1 ORDER BY created_at DESC LIMIT 30`, [vid]),
        pool.query(`SELECT * FROM track_clicks WHERE visitor_id=$1 ORDER BY created_at DESC LIMIT 50`, [vid]),
        pool.query(`SELECT * FROM track_custom_events WHERE visitor_id=$1 ORDER BY created_at DESC LIMIT 50`, [vid]),
      ]);
      res.json({
        profile: profile.rows[0],
        sessions: sessions.rows,
        pageviews: pageviews.rows,
        searches: searches.rows,
        clicks: clicks.rows,
        events: events.rows,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/emails", requireAuth, async (req, res) => {
    try {
      const { days = 30, limit = 50 } = req.query;
      const d = parseInt(days as string);
      const result = await pool.query(`
        SELECT s.token, s.recipient_email, s.recipient_name, s.subject, s.campaign,
               s.opens, s.clicks, s.open_device, s.open_browser,
               s.first_opened_at, s.last_opened_at, s.first_clicked_at,
               s.created_at,
               COUNT(DISTINCT e.id) FILTER (WHERE e.event_type='open') AS open_events,
               COUNT(DISTINCT e.id) FILTER (WHERE e.event_type='click') AS click_events
        FROM track_email_sends s
        LEFT JOIN track_email_events e ON e.token=s.token
        WHERE s.created_at >= NOW() - INTERVAL '${d} days'
        GROUP BY s.token, s.recipient_email, s.recipient_name, s.subject,
                 s.campaign, s.opens, s.clicks, s.open_device, s.open_browser,
                 s.first_opened_at, s.last_opened_at, s.first_clicked_at, s.created_at
        ORDER BY s.created_at DESC LIMIT $1`,
        [parseInt(limit as string)]
      );
      res.json({ emails: result.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/tracker/realtime", requireAuth, async (req, res) => {
    try {
      const [active, recent] = await Promise.all([
        pool.query(`
          SELECT COUNT(DISTINCT visitor_id) AS active_visitors
          FROM track_sessions WHERE last_activity >= NOW() - INTERVAL '5 minutes'`),
        pool.query(`
          SELECT p.page, p.title, p.created_at,
                 v.visitor_id, v.name, v.company, v.first_device
          FROM track_pageviews p
          LEFT JOIN track_visitors v ON v.visitor_id=p.visitor_id
          WHERE p.created_at >= NOW() - INTERVAL '5 minutes'
          ORDER BY p.created_at DESC LIMIT 20`),
      ]);
      res.json({
        active_visitors: parseInt(active.rows[0]?.active_visitors || 0),
        recent_activity: recent.rows,
        timestamp: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
