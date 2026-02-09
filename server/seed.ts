import { db } from "./db";
import { leads, appointments, aiAgents, dashboardStats } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedUserData(userId: string) {
  const existingStats = await db.select().from(dashboardStats).where(eq(dashboardStats.userId, userId));
  if (existingStats.length > 0) return;

  await db.insert(dashboardStats).values({
    userId,
    totalLeads: 1284,
    activeLeads: 342,
    appointmentsBooked: 156,
    conversionRate: 34.5,
    revenue: 127450,
  });

  const seedLeads = [
    { userId, name: "Sarah Johnson", email: "sarah@growthdigital.com", phone: "+1 (555) 234-5678", source: "Google Ads", status: "hot", score: 92 },
    { userId, name: "Robert Chen", email: "robert@scaleup.io", phone: "+1 (555) 345-6789", source: "Facebook", status: "qualified", score: 88 },
    { userId, name: "Emma Wilson", email: "emma@clientmax.com", phone: "+1 (555) 456-7890", source: "Instagram", status: "warm", score: 75 },
    { userId, name: "David Park", email: "david@growthlab.co", phone: "+1 (555) 567-8901", source: "Referral", status: "new", score: 60 },
    { userId, name: "Lisa Anderson", email: "lisa@agencypro.com", phone: "+1 (555) 678-9012", source: "Website", status: "hot", score: 95 },
    { userId, name: "Michael Torres", email: "michael@scaledigital.com", phone: "+1 (555) 789-0123", source: "Google Ads", status: "warm", score: 70 },
    { userId, name: "Jennifer Kim", email: "jennifer@boostmedia.com", phone: "+1 (555) 890-1234", source: "Cold Outreach", status: "qualified", score: 82 },
    { userId, name: "Alex Rivera", email: "alex@funnelpro.com", phone: "+1 (555) 901-2345", source: "Facebook", status: "new", score: 45 },
  ];

  await db.insert(leads).values(seedLeads);

  const now = new Date();
  const seedAppointments = [
    { userId, leadName: "Robert Chen", type: "Discovery Call", date: new Date(now.getTime() + 2 * 60 * 60 * 1000), status: "scheduled" },
    { userId, leadName: "Lisa Anderson", type: "Sales Call", date: new Date(now.getTime() + 5 * 60 * 60 * 1000), status: "scheduled" },
    { userId, leadName: "David Park", type: "Strategy Session", date: new Date(now.getTime() + 24 * 60 * 60 * 1000), status: "scheduled" },
    { userId, leadName: "Sarah Johnson", type: "Follow-Up Call", date: new Date(now.getTime() + 26 * 60 * 60 * 1000), status: "scheduled" },
    { userId, leadName: "Emma Wilson", type: "Discovery Call", date: new Date(now.getTime() - 24 * 60 * 60 * 1000), status: "completed" },
    { userId, leadName: "Michael Torres", type: "Sales Call", date: new Date(now.getTime() - 48 * 60 * 60 * 1000), status: "completed" },
  ];

  await db.insert(appointments).values(seedAppointments);

  const seedAgents = [
    { userId, name: "Lead Qualifier", type: "Qualification", status: "active", tasksCompleted: 1247, successRate: 94.2, description: "Automatically scores and qualifies incoming leads based on engagement, demographics, and behavior patterns." },
    { userId, name: "Email Nurturing", type: "Communication", status: "active", tasksCompleted: 3891, successRate: 87.5, description: "Sends personalized email sequences that adapt based on recipient behavior and engagement metrics." },
    { userId, name: "Appointment Setter", type: "Scheduling", status: "active", tasksCompleted: 856, successRate: 91.3, description: "Books qualified leads into available calendar slots and handles rescheduling automatically." },
    { userId, name: "Chat Responder", type: "Support", status: "active", tasksCompleted: 2134, successRate: 89.7, description: "Responds to incoming chat messages instantly, qualifying leads and answering common questions." },
    { userId, name: "Ad Optimizer", type: "Marketing", status: "paused", tasksCompleted: 567, successRate: 78.4, description: "Monitors ad performance across platforms and adjusts bids, targeting, and creative in real-time." },
    { userId, name: "Follow-Up Agent", type: "Retention", status: "active", tasksCompleted: 1923, successRate: 85.1, description: "Automatically follows up with leads who haven't responded, using multi-channel outreach." },
  ];

  await db.insert(aiAgents).values(seedAgents);
}
