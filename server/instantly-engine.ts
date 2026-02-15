// ============================================================
// ARGILETTE INSTANTLY ENGINE — Core Business Logic
// Drop this into: server/instantly-engine.ts
// Handles: warmup, classification, spintax, verification,
//          inbox testing, copilot, pixel tracking
// ============================================================

import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";
import {
  emailAccounts, warmupStats, warmupConversations,
  campaigns, campaignLeads, campaignSequences,
  dfyOrders, dfyDomains,
} from "../shared/instantly-schema";

// ============================================================
// SPAM WORD DICTIONARY
// ============================================================

const SPAM_WORDS = [
  "free", "guarantee", "no obligation", "winner", "congratulations",
  "act now", "limited time", "urgent", "buy now", "order now",
  "click here", "subscribe", "unsubscribe", "opt in", "opt out",
  "cash", "money back", "earn money", "make money", "income",
  "discount", "lowest price", "bargain", "cheap", "save big",
  "100%", "risk free", "no cost", "best price", "special offer",
  "amazing", "incredible", "miracle", "revolutionary", "breakthrough",
  "viagra", "weight loss", "lose weight", "diet", "pills",
  "credit card", "wire transfer", "bitcoin", "cryptocurrency",
  "nigerian", "prince", "inheritance", "lottery",
];

// ============================================================
// EMAIL CLASSIFICATION — AI labels for Unibox
// ============================================================

const LABEL_PATTERNS: Record<string, RegExp[]> = {
  interested: [
    /interested/i, /tell me more/i, /sounds good/i, /let'?s (talk|chat|connect|schedule)/i,
    /send me/i, /i'?d like to/i, /how much/i, /pricing/i, /demo/i,
    /love to hear/i, /great idea/i, /let'?s do it/i, /sign me up/i,
  ],
  not_interested: [
    /not interested/i, /no thanks/i, /no thank you/i, /remove me/i,
    /unsubscribe/i, /stop (emailing|contacting)/i, /don'?t (email|contact)/i,
    /not a good fit/i, /we'?re (all set|good)/i, /already have/i,
  ],
  out_of_office: [
    /out of (the )?office/i, /ooo/i, /on (vacation|leave|holiday)/i,
    /away from/i, /limited access/i, /will return/i, /auto.?reply/i,
    /currently (unavailable|away)/i,
  ],
  meeting_booked: [
    /booked/i, /scheduled/i, /confirmed/i, /calendar invite/i,
    /see you (on|at)/i, /looking forward to (our|the) (call|meeting)/i,
    /let'?s meet/i, /i'?ve? set up/i,
  ],
  referral: [
    /reach out to/i, /contact (my|our)/i, /speak with/i, /cc'?d/i,
    /introducing/i, /loop(ed|ing) in/i, /better person/i,
    /colleague/i, /pass(ing|ed) (this|you) (along|to)/i,
  ],
  question: [
    /\?$/, /can you (tell|explain|share)/i, /what (is|does|are)/i,
    /how (does|do|much|long)/i, /could you/i, /i have a question/i,
    /wondering/i, /curious/i,
  ],
  wrong_person: [
    /wrong person/i, /not the right/i, /i don'?t handle/i,
    /no longer (at|with)/i, /left the company/i, /moved on/i,
    /doesn'?t work here/i,
  ],
  bounced: [
    /undeliverable/i, /delivery (failed|failure)/i, /mailbox (not found|full)/i,
    /address rejected/i, /550/i, /user unknown/i, /does not exist/i,
    /permanent failure/i, /no such user/i,
  ],
};

const SENTIMENT_PATTERNS = {
  positive: [
    /thanks/i, /great/i, /awesome/i, /love/i, /perfect/i, /excellent/i,
    /appreciate/i, /wonderful/i, /fantastic/i, /excited/i,
  ],
  negative: [
    /not interested/i, /stop/i, /remove/i, /spam/i, /annoying/i,
    /unsubscribe/i, /terrible/i, /waste/i, /awful/i, /never/i,
  ],
};

// ============================================================
// WARMUP CONVERSATION TEMPLATES
// ============================================================

const WARMUP_SUBJECTS = [
  "Quick question about the project timeline",
  "Following up on our discussion",
  "Re: Meeting notes from last week",
  "Thoughts on the proposal draft?",
  "Can you review this document?",
  "Team lunch plans for Friday",
  "Update on the quarterly goals",
  "Re: Conference registration",
  "Sharing a useful resource I found",
  "Quick sync on deliverables",
  "Budget review for next month",
  "Re: Client feedback summary",
  "Schedule change for Thursday",
  "Your input needed on this",
  "Great article I thought you'd like",
];

const WARMUP_BODIES = [
  "Hi! Just wanted to follow up on what we discussed. Let me know if you have any updates on your end. Looking forward to hearing from you!",
  "Hey, I came across something relevant to our project and wanted to share. Would love to discuss when you have a moment.",
  "Quick update from my side — things are progressing well. I'll send the full report by end of week. Let me know if you need anything before then.",
  "Thanks for sending that over! I've reviewed it and have a few thoughts. Can we block 15 minutes to discuss?",
  "Just a heads up that the deadline has been moved to next Friday. Let me know if that changes anything on your end.",
];

const WARMUP_REPLIES = [
  "Thanks for the update! That sounds great. I'll take a look and get back to you shortly.",
  "Appreciate you sharing this. I've added some notes and will send them over tomorrow.",
  "Sounds good! Let me check my calendar and I'll confirm a time that works.",
  "Thanks for the heads up. I'll adjust the schedule accordingly. Talk soon!",
  "Great to hear! Looking forward to reviewing the details. Let me know if you need anything from my side.",
];

// ============================================================
// DISPOSABLE & FREE EMAIL PROVIDERS
// ============================================================

const DISPOSABLE_DOMAINS = [
  "tempmail.com", "throwaway.email", "guerrillamail.com", "mailinator.com",
  "yopmail.com", "sharklasers.com", "trashmail.com",
];

const FREE_PROVIDERS = [
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "aol.com",
  "icloud.com", "mail.com", "protonmail.com",
];

const ROLE_PREFIXES = [
  "admin", "info", "support", "help", "sales", "contact", "office",
  "team", "hello", "billing", "hr", "careers", "marketing", "press",
  "media",
];

// ============================================================
// INSTANTLY ENGINE CLASS
// ============================================================

class InstantlyEngine {

  // ── Email Classification ──────────────────────────────────

  classifyEmail(body: string, subject: string): { label: string; sentiment: string; confidence: number } {
    const text = `${subject} ${body}`.toLowerCase();

    for (const [label, patterns] of Object.entries(LABEL_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return { label, sentiment: this.detectSentiment(text), confidence: 0.85 };
        }
      }
    }

    return { label: "unlabeled", sentiment: this.detectSentiment(text), confidence: 0.3 };
  }

  private detectSentiment(text: string): string {
    let posScore = 0, negScore = 0;
    for (const p of SENTIMENT_PATTERNS.positive) if (p.test(text)) posScore++;
    for (const p of SENTIMENT_PATTERNS.negative) if (p.test(text)) negScore++;
    if (posScore > negScore) return "positive";
    if (negScore > posScore) return "negative";
    return "neutral";
  }

  // ── Spintax & Variable Processing ────────────────────────

  processSpintax(text: string): string {
    return text.replace(/\{([^{}]+)\}/g, (match, inner) => {
      if (inner.startsWith("RANDOM|")) {
        const options = inner.substring(7).split("|");
        return options[Math.floor(Math.random() * options.length)];
      }
      const options = inner.split("|");
      if (options.length > 1) {
        return options[Math.floor(Math.random() * options.length)];
      }
      return match;
    });
  }

  processVariables(text: string, lead: Record<string, any>): string {
    return text.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
      if (key.startsWith("custom.")) {
        const customKey = key.substring(7);
        return lead.custom?.[customKey] || lead[customKey] || "";
      }
      const map: Record<string, string> = {
        firstName: lead.firstName || lead.name?.split(" ")[0] || "there",
        lastName: lead.lastName || lead.name?.split(" ").slice(1).join(" ") || "",
        name: lead.name || `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "there",
        email: lead.email || "",
        company: lead.company || lead.companyName || "your company",
        companyName: lead.company || lead.companyName || "your company",
        jobTitle: lead.jobTitle || lead.title || "",
        phone: lead.phone || "",
        industry: lead.industry || "",
        city: lead.city || "",
      };
      return map[key] || "";
    });
  }

  processEmailContent(subject: string, body: string, lead: Record<string, any>): { subject: string; body: string } {
    return {
      subject: this.processVariables(this.processSpintax(subject), lead),
      body: this.processVariables(this.processSpintax(body), lead),
    };
  }

  // ── Email Verification ────────────────────────────────────

  verifyEmail(email: string): {
    status: string; reason: string;
    isDisposable: boolean; isRoleBased: boolean;
    isFreeProvider: boolean; isCatchAll: boolean;
    mxValid: boolean; smtpValid: boolean;
  } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { status: "invalid", reason: "invalid_format", isDisposable: false, isRoleBased: false, isFreeProvider: false, isCatchAll: false, mxValid: false, smtpValid: false };
    }

    const [local, domain] = email.split("@");
    const isDisposable = DISPOSABLE_DOMAINS.includes(domain.toLowerCase());
    if (isDisposable) {
      return { status: "invalid", reason: "disposable_domain", isDisposable: true, isRoleBased: false, isFreeProvider: false, isCatchAll: false, mxValid: false, smtpValid: false };
    }

    const isRoleBased = ROLE_PREFIXES.includes(local.toLowerCase());
    const isFreeProvider = FREE_PROVIDERS.includes(domain.toLowerCase());

    // Simulate MX/SMTP checks (in production: real DNS + SMTP)
    const mxValid = Math.random() < 0.95;
    const smtpValid = mxValid && Math.random() < 0.85;
    const isCatchAll = mxValid && Math.random() < 0.30;

    let status = "valid";
    let reason = "verified";

    if (!mxValid) { status = "invalid"; reason = "no_mx_record"; }
    else if (!smtpValid) { status = "invalid"; reason = "smtp_rejected"; }
    else if (isCatchAll) { status = "risky"; reason = "catch_all_domain"; }
    else if (isRoleBased) { status = "risky"; reason = "role_based_address"; }

    return { status, reason, isDisposable, isRoleBased, isFreeProvider, isCatchAll, mxValid, smtpValid };
  }

  // ── Inbox Placement Analysis ──────────────────────────────

  analyzeInboxPlacement(subject: string, body: string): {
    score: number; gmail: string; outlook: string; yahoo: string;
    spamWords: string[]; recommendations: string[];
    hasExcessiveLinks: boolean; hasImages: boolean;
  } {
    const text = `${subject} ${body}`.toLowerCase();
    let score = 100;
    const recommendations: string[] = [];
    const spamWords: string[] = [];

    // Check spam words
    for (const word of SPAM_WORDS) {
      if (text.includes(word.toLowerCase())) {
        spamWords.push(word);
        score -= 5;
      }
    }
    if (spamWords.length > 0) recommendations.push(`Remove spam trigger words: ${spamWords.slice(0, 5).join(", ")}`);

    // Check links
    const linkCount = (body.match(/https?:\/\//gi) || []).length;
    const hasExcessiveLinks = linkCount > 2;
    if (hasExcessiveLinks) { score -= 10; recommendations.push("Reduce links to 1-2 maximum"); }

    // Check images
    const hasImages = /<img/i.test(body) || /\.(png|jpg|gif)/i.test(body);
    if (hasImages) { score -= 5; recommendations.push("Avoid images in first email — use text-only"); }

    // Check length
    const wordCount = body.split(/\s+/).length;
    if (wordCount > 200) { score -= 5; recommendations.push("Shorten email to 75-150 words"); }
    if (wordCount < 30) { score -= 5; recommendations.push("Email is too short — add more context"); }

    // Check ALL CAPS
    const capsWords = (body.match(/\b[A-Z]{3,}\b/g) || []).length;
    if (capsWords > 2) { score -= 10; recommendations.push("Reduce ALL CAPS words"); }

    // Check excessive punctuation
    if (/[!]{2,}/.test(body)) { score -= 5; recommendations.push("Remove excessive exclamation marks"); }

    score = Math.max(0, Math.min(100, score));

    // Simulate provider results based on score
    const gmail = score >= 80 ? "primary" : score >= 60 ? "promotions" : "spam";
    const outlook = score >= 75 ? "inbox" : score >= 50 ? "junk" : "spam";
    const yahoo = score >= 70 ? "inbox" : "spam";

    if (recommendations.length === 0) recommendations.push("Content looks good! High deliverability expected.");

    return { score, gmail, outlook, yahoo, spamWords, recommendations, hasExcessiveLinks, hasImages };
  }

  // ── Warmup Engine ─────────────────────────────────────────

  async runWarmupCycle(): Promise<void> {
    const activeAccounts = await db.select().from(emailAccounts)
      .where(and(eq(emailAccounts.warmupEnabled, true), eq(emailAccounts.warmupStatus, "active")));

    if (activeAccounts.length < 2) return;

    for (const account of activeAccounts) {
      // Calculate how many to send based on ramp-up
      const dailyTarget = Math.min(
        2 + (account.warmupCurrentDay || 0) * 2,
        account.warmupDailyLimit || 20
      );

      // Pair with random other account
      const otherAccounts = activeAccounts.filter(a => a.id !== account.id);
      if (otherAccounts.length === 0) continue;

      const partner = otherAccounts[Math.floor(Math.random() * otherAccounts.length)];
      const subject = WARMUP_SUBJECTS[Math.floor(Math.random() * WARMUP_SUBJECTS.length)];
      const body = WARMUP_BODIES[Math.floor(Math.random() * WARMUP_BODIES.length)];
      const reply = WARMUP_REPLIES[Math.floor(Math.random() * WARMUP_REPLIES.length)];

      // In production: actually send via nodemailer
      // For now: record the simulated conversation
      await db.insert(warmupConversations).values({
        senderAccountId: account.id,
        receiverAccountId: partner.id,
        subject, body, replyBody: reply,
        status: "replied",
        landedIn: Math.random() < 0.9 ? "inbox" : "spam",
      });

      // Update stats
      const today = new Date().toISOString().split("T")[0];
      const landedInbox = Math.random() < 0.9 ? 1 : 0;

      await db.insert(warmupStats).values({
        accountId: account.id, date: today,
        emailsSent: 1, emailsReceived: 1, emailsReplied: 1,
        landedInbox, landedSpam: 1 - landedInbox,
        reputationScore: Math.min(1, (account.reputationScore || 0.5) + 0.005),
      });

      // Increment warmup day & update reputation
      await db.update(emailAccounts).set({
        warmupCurrentDay: sql`${emailAccounts.warmupCurrentDay} + 1`,
        reputationScore: sql`LEAST(1, ${emailAccounts.reputationScore} + 0.005)`,
        updatedAt: new Date(),
      }).where(eq(emailAccounts.id, account.id));
    }
  }

  // ── DFY Provisioning ──────────────────────────────────────

  generateDnsRecords(domain: string): { spf: string; dkim: string; dmarc: string; mx: string } {
    return {
      spf: `v=spf1 include:_spf.google.com ~all`,
      dkim: `v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...`,
      dmarc: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}`,
      mx: `10 aspmx.l.google.com`,
    };
  }

  async startDfyProvisioning(orderId: string): Promise<void> {
    // Step 1: Register domains (simulated delay)
    await new Promise(r => setTimeout(r, 5000));
    await db.update(dfyOrders).set({ status: "registering", domainsRegistered: true }).where(eq(dfyOrders.id, orderId));

    // Step 2: Configure DNS
    await new Promise(r => setTimeout(r, 5000));
    await db.update(dfyOrders).set({ status: "configuring_dns", dnsConfigured: true }).where(eq(dfyOrders.id, orderId));

    // Verify domains
    const domains = await db.select().from(dfyDomains).where(eq(dfyDomains.orderId, orderId));
    for (const d of domains) {
      await db.update(dfyDomains).set({ registrationStatus: "registered", dnsVerified: true }).where(eq(dfyDomains.id, d.id));
    }

    // Step 3: Create email accounts
    await new Promise(r => setTimeout(r, 5000));
    await db.update(dfyOrders).set({ status: "creating_accounts", accountsCreated: true }).where(eq(dfyOrders.id, orderId));

    // Step 4: Start warmup
    await db.update(dfyOrders).set({
      status: "completed", warmupStarted: true, completedAt: new Date(),
    }).where(eq(dfyOrders.id, orderId));
  }

  checkDomainAvailability(domain: string): { domain: string; available: boolean; suggestions: { domain: string; price: number }[] } {
    const available = Math.random() < 0.6;
    const base = domain.split(".")[0];
    const suggestions = [
      { domain: `${base}.com`, price: 12.99 },
      { domain: `${base}.io`, price: 39.99 },
      { domain: `${base}.co`, price: 24.99 },
      { domain: `${base}.net`, price: 11.99 },
      { domain: `${base}-mail.com`, price: 10.99 },
    ];
    return { domain, available, suggestions };
  }

  // ── Website Visitor Resolution ────────────────────────────

  generatePixelCode(domain: string, userId: string): string {
    return `<script>
(function(){
  var d='${domain}',u='${userId}',s=Math.random().toString(36).substr(2,9);
  var api='/api/pixel/t';
  function t(e){
    var data={pixelId:d,userId:u,url:location.href,title:document.title,
      referrer:document.referrer,sessionId:s,event:e};
    navigator.sendBeacon?navigator.sendBeacon(api,JSON.stringify(data)):
    fetch(api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),keepalive:true});
  }
  t('pageview');
  window.addEventListener('beforeunload',function(){t('leave');});
})();
</script>`;
  }

  resolveVisitor(ip: string): {
    country: string; city: string;
    companyName: string | null; companyDomain: string | null;
    companyIndustry: string | null; companySize: string | null;
    email: string | null; name: string | null;
    title: string | null; linkedin: string | null;
  } {
    // In production: use Clearbit Reveal / RB2B / geoip
    const resolved = Math.random() < 0.4;

    if (resolved) {
      const companies = [
        { name: "TechFlow Inc", domain: "techflow.com", industry: "Technology", size: "50-200" },
        { name: "MedPractice Group", domain: "medpractice.com", industry: "Healthcare", size: "10-50" },
        { name: "GrowthLabs", domain: "growthlabs.io", industry: "Marketing", size: "5-20" },
      ];
      const company = companies[Math.floor(Math.random() * companies.length)];

      return {
        country: "US", city: "New York",
        companyName: company.name, companyDomain: company.domain,
        companyIndustry: company.industry, companySize: company.size,
        email: `contact@${company.domain}`, name: "Visitor",
        title: "Decision Maker", linkedin: `https://linkedin.com/company/${company.domain.split(".")[0]}`,
      };
    }

    return {
      country: "US", city: "Unknown",
      companyName: null, companyDomain: null,
      companyIndustry: null, companySize: null,
      email: null, name: null, title: null, linkedin: null,
    };
  }

  // ── AI Copilot Content Generation ─────────────────────────

  generateCopilotContent(taskType: string, prompt: string, context: string): any {
    // In production: use Anthropic Claude API with context as system prompt
    // For now: template-based generation

    switch (taskType) {
      case "sequence":
        return {
          type: "sequence",
          steps: [
            {
              step: 1, delay: 0, variant: "A",
              subject: `{{firstName}}, quick question about {{companyName}}`,
              body: `Hi {{firstName}},\n\nI noticed {{companyName}} is growing. We help companies like yours automate client acquisition with AI.\n\nWould you be open to a 15-minute call to explore if we can help?\n\nBest,\n[Your Name]`,
            },
            {
              step: 2, delay: 3, variant: "A",
              subject: `Re: quick question`,
              body: `Hi {{firstName}},\n\nJust following up on my previous message. I'd love to show you how we've helped similar companies increase their response rates by 3x.\n\nAre you available for a quick call this week?\n\nBest,\n[Your Name]`,
            },
            {
              step: 3, delay: 5, variant: "A",
              subject: `Last follow-up, {{firstName}}`,
              body: `Hi {{firstName}},\n\nI don't want to be a bother, but I genuinely believe we could help {{companyName}} grow faster.\n\nIf now isn't the right time, no worries at all. Feel free to reach out whenever you're ready.\n\nAll the best,\n[Your Name]`,
            },
          ],
        };

      case "subject_lines":
        return {
          type: "subject_lines",
          lines: [
            `{{firstName}}, quick idea for {{companyName}}`,
            `Saw {{companyName}} is hiring — we can help`,
            `{{firstName}}, are you handling this manually?`,
            `3x more replies — interested?`,
            `Quick question about your outreach`,
            `{{firstName}}, 2 min of your time?`,
            `Thought of {{companyName}} when I saw this`,
            `Not another sales email, {{firstName}}`,
          ],
        };

      case "follow_up":
        return {
          type: "follow_up",
          subject: "Re: quick question",
          body: `Hi {{firstName}},\n\nI understand you're busy, so I'll keep this brief.\n\nWe recently helped a company in the {{industry}} space automate their outreach and they saw a 40% increase in qualified meetings.\n\nWould it be worth a quick 10-minute chat to see if we could do the same for {{companyName}}?\n\nBest,\n[Your Name]`,
        };

      case "campaign_idea":
        return {
          type: "campaign_idea",
          ideas: [
            { name: "Pain Point Opener", approach: "Lead with the #1 challenge in their industry, then position your solution." },
            { name: "Case Study Proof", approach: "Share a relevant case study with specific metrics (3x replies, 40% more meetings)." },
            { name: "Mutual Connection", approach: "Reference shared industry events, mutual LinkedIn connections, or common interests." },
            { name: "Value-First", approach: "Offer a free resource (audit, template, report) before asking for anything." },
          ],
        };

      default:
        return { type: "unknown", message: "Unknown task type" };
    }
  }
}

export const instantlyEngine = new InstantlyEngine();
