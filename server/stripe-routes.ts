import type { Express } from "express";
import Stripe from "stripe";
import { db } from "./db";
import { subscriptions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  starter: { amount: 0, name: "Starter" },
  pro: { amount: 4900, name: "Pro" },
  agency: { amount: 9900, name: "Agency" },
};

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

async function upsertSubscription(userId: string, data: {
  plan: string;
  status: string;
  amount: number;
  paymentMethod: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date;
  notes?: string;
}) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  if (existing) {
    await db.update(subscriptions).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({
      userId,
      ...data,
    });
  }
}

export function registerStripeRoutes(app: Express) {
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      const stripe = getStripe();
      let event: Stripe.Event;

      const rawBody = (req as any).rawBody as Buffer;
      if (!rawBody) {
        console.error("[Stripe Webhook] No raw body available");
        return res.status(400).json({ error: "No raw body" });
      }

      if (process.env.STRIPE_WEBHOOK_SECRET) {
        const sig = req.headers["stripe-signature"] as string;
        if (!sig) {
          return res.status(400).json({ error: "Missing stripe-signature header" });
        }
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
      } else if (process.env.NODE_ENV === "production") {
        console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET is required in production");
        return res.status(500).json({ error: "Webhook secret not configured" });
      } else {
        console.warn("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not set — accepting unverified event (dev only)");
        event = req.body as Stripe.Event;
      }

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const plan = session.metadata?.plan || "starter";
          const planConfig = PLAN_PRICES[plan] || PLAN_PRICES.starter;
          const customerEmail = session.customer_email || session.customer_details?.email;

          let userId: string | null = null;
          if (customerEmail) {
            const [user] = await db
              .select()
              .from(users)
              .where(eq(users.email, customerEmail));
            if (user) userId = user.id;
          }

          if (userId) {
            await upsertSubscription(userId, {
              plan,
              status: "active",
              amount: planConfig.amount / 100,
              paymentMethod: "stripe",
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              currentPeriodStart: new Date(),
            });
            console.log(`[Stripe] Subscription activated for user ${userId} — ${plan}`);
          } else {
            console.log(`[Stripe] Checkout completed for ${customerEmail} but no user found yet — will reconcile on signup`);
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const subId = (invoice as any).subscription as string;
          if (subId) {
            const [sub] = await db
              .select()
              .from(subscriptions)
              .where(eq(subscriptions.stripeSubscriptionId, subId));

            if (sub) {
              await db
                .update(subscriptions)
                .set({
                  status: "active",
                  currentPeriodStart: invoice.period_start
                    ? new Date(invoice.period_start * 1000)
                    : new Date(),
                  currentPeriodEnd: invoice.period_end
                    ? new Date(invoice.period_end * 1000)
                    : undefined,
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.id, sub.id));
            }
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const [sub] = await db
            .select()
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, subscription.id));

          if (sub) {
            await db
              .update(subscriptions)
              .set({
                status: "cancelled",
                cancelledAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(subscriptions.id, sub.id));
          }
          break;
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("[Stripe Webhook] Error:", err.message);
      res.status(400).json({ error: err.message });
    }
  });

  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const stripe = getStripe();
      const { plan, email, name } = req.body;

      if (!plan || !PLAN_PRICES[plan]) {
        return res.status(400).json({ error: "Invalid plan selected" });
      }

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const planConfig = PLAN_PRICES[plan];
      const domain = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://argilette.co";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        customer_email: email,
        metadata: { plan, name: name || "" },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `ArgiFlow ${planConfig.name} Plan`,
              },
              unit_amount: planConfig.amount,
              recurring: {
                interval: "month",
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${domain}/signup?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
        cancel_url: `${domain}/?cancelled=true`,
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("[Stripe Checkout] Error:", err.message);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  app.get("/api/stripe/subscription", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId));

      if (!sub) {
        return res.json({ plan: "none", status: "inactive" });
      }

      res.json(sub);
    } catch (err: any) {
      console.error("[Stripe Subscription] Error:", err.message);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  app.post("/api/stripe/create-portal-session", async (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const stripe = getStripe();

      const [sub] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, req.session.userId));

      if (!sub?.stripeCustomerId) {
        return res.status(400).json({ error: "No active Stripe subscription found" });
      }

      const domain = process.env.REPLIT_DEV_DOMAIN
        ? `https://${process.env.REPLIT_DEV_DOMAIN}`
        : "https://argilette.co";

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${domain}/settings`,
      });

      res.json({ url: portalSession.url });
    } catch (err: any) {
      console.error("[Stripe Portal] Error:", err.message);
      res.status(500).json({ error: "Failed to create portal session" });
    }
  });
}

export { upsertSubscription, PLAN_PRICES };
