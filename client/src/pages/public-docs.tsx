import { useState } from "react";
import { ArrowLeft, Zap, BookOpen, ChevronDown, Rocket, Mail, Search, Users, Brain, Settings } from "lucide-react";

const docSections = [
  {
    title: "Getting Started",
    icon: Rocket,
    articles: [
      {
        title: "Quick Start Guide",
        desc: "Set up your ArgiFlow account and launch your first campaign in under 15 minutes.",
        content: [
          { heading: "1. Create Your Account", text: "Visit argilette.co and click \"Start Your 30-Day Free Trial.\" Enter your name, email, and a secure password. No credit card is required to get started." },
          { heading: "2. Complete Your Profile", text: "After signing up, you'll be guided through a quick onboarding where you set your company name, industry, target market, and preferred language (English or French). This helps ArgiFlow customize your AI agents and outreach templates." },
          { heading: "3. Connect Your Email", text: "Navigate to Email & Outreach > Email Accounts and connect your business email. ArgiFlow supports Gmail, Outlook, and custom SMTP. We recommend starting email warmup immediately to build sender reputation before launching campaigns." },
          { heading: "4. Set Up Your First Campaign", text: "Go to Email & Outreach > Campaigns and click \"New Campaign.\" Choose a target audience, select an AI-generated email template (or write your own), configure your sending schedule, and launch. ArgiFlow's AI will personalize each email based on the recipient's company data." },
          { heading: "5. Monitor Results", text: "Visit your Analytics dashboard to track open rates, click rates, reply rates, and booked meetings in real-time. ArgiFlow's AI will automatically optimize your campaigns based on performance data." },
        ],
      },
      {
        title: "Platform Overview",
        desc: "Understand the core modules — AI Agents, Intelligence, Outreach, CRM, Marketing, and Analytics.",
        content: [
          { heading: "AI Agents", text: "13+ specialized AI agents handle different aspects of your sales process — from Lead Scout (finding new prospects) to Email Writer (crafting personalized outreach) to Voice Caller (making AI-powered phone calls). Each agent can operate autonomously or under your supervision." },
          { heading: "Sales Intelligence", text: "The B2B Data Engine aggregates information from multiple public sources including OpenCorporates, SEC EDGAR, Wikidata, GitHub, and web search to provide comprehensive company and contact intelligence. Use it for lead discovery, enrichment, intent scoring, and technographic analysis." },
          { heading: "Email & Outreach", text: "A complete email infrastructure including account management, domain warmup, campaign builder with A/B testing, unified inbox with AI classification, email verification, and white-label sending domains via AWS SES. The AI Copilot helps generate compelling email content." },
          { heading: "CRM & Pipeline", text: "Manage your contacts, deals, and sales pipeline with visual Kanban boards. Track every interaction, set follow-up reminders, and use AI-powered lead scoring to prioritize your highest-value prospects." },
          { heading: "Marketing & Web", text: "The AI Marketing Suite includes 33 marketing skills, an AI Website Builder, and Marketing Autopilot that generates 30-day marketing plans and executes campaigns across multiple channels automatically." },
          { heading: "Analytics & Intelligence", text: "Comprehensive dashboards for tracking campaign performance, revenue attribution, visitor behavior, agent activity, and ROI. The Visitor Intelligence Engine identifies anonymous website visitors and tracks their journey from email to website." },
        ],
      },
      {
        title: "Account Settings",
        desc: "Configure your profile, team members, billing, and notification preferences.",
        content: [
          { heading: "Profile Settings", text: "Update your name, email, company information, timezone, and preferred language from Settings > Profile. Your profile data is used by AI agents to personalize outreach on your behalf." },
          { heading: "AI Provider", text: "ArgiFlow supports 9 AI providers: OpenAI, Anthropic, Google Gemini, Mistral, Groq, Together AI, Cohere, OpenRouter, and Ollama. You can switch providers at any time from Settings > AI Provider, or bring your own API key (BYOK) for maximum control and cost efficiency." },
          { heading: "Billing & Subscription", text: "Manage your subscription plan (Starter, Pro, or Agency), view usage, and update payment methods from Settings > Billing. ArgiFlow uses Stripe for secure payment processing. Your 30-day free trial includes full Pro-tier access." },
          { heading: "Credits", text: "Certain actions (AI generation, voice calls, advanced intelligence lookups) consume credits. Monitor your credit balance and purchase additional credits from Settings > Credits. Credits are deducted per action and auto-refunded if an action fails." },
          { heading: "Notifications", text: "Configure email notifications for campaign milestones, meeting bookings, lead alerts, billing updates, and ARIA briefings from Settings > Notifications." },
        ],
      },
      {
        title: "ARIA Business Manager Setup",
        desc: "Onboard your autonomous AI business manager and configure approval workflows.",
        content: [
          { heading: "What is ARIA?", text: "ARIA is your autonomous AI Business Manager — an AI agent that manages your entire client acquisition pipeline. ARIA can find leads, send emails, make calls, book meetings, and provide daily business briefings, all running 24/7 on configurable cycles." },
          { heading: "Onboarding (Discovery)", text: "When you first access ARIA, you'll go through a conversational onboarding called AriaDiscovery. ARIA will ask about your business, target market, ideal customer profile, services, and goals. This information shapes how ARIA operates and makes decisions." },
          { heading: "Approval Modes", text: "ARIA supports three approval modes: Supervised (every action requires your approval), Semi-Auto (routine actions proceed automatically, important ones need approval), and Autopilot (ARIA acts fully autonomously). Start with Supervised and gradually increase autonomy as you build trust." },
          { heading: "Connectors", text: "ARIA connects to real tools to execute actions: AWS SES for sending emails, Twilio for SMS and calls, and Stripe for revenue tracking. Configure these from the Connectors tab in ARIA's dashboard." },
          { heading: "Daily Briefings", text: "ARIA generates daily briefings summarizing key metrics, actions taken, leads contacted, meetings booked, and recommendations. Access these from the Briefings tab or receive them via email." },
          { heading: "Chat Interface", text: "Communicate with ARIA through a natural language chat interface. Ask questions about your business, request specific actions, review decisions, and adjust strategy — all through conversation." },
        ],
      },
    ],
  },
  {
    title: "AI Agents",
    icon: Brain,
    articles: [
      {
        title: "Agent Catalog",
        desc: "Explore 13+ specialized AI agents — Lead Scout, Email Writer, Voice Caller, and more.",
        content: [
          { heading: "Lead Scout", text: "Automatically discovers new prospects matching your ideal customer profile using the B2B Data Engine. Searches across multiple data sources and delivers enriched lead profiles with contact information, company details, and intent signals." },
          { heading: "Email Writer", text: "Generates hyper-personalized cold emails, follow-ups, and nurture sequences using AI. Adapts tone, length, and messaging based on the recipient's industry, role, and engagement history." },
          { heading: "Voice Caller", text: "Makes AI-powered phone calls using natural-sounding speech via Deepgram. Qualifies leads, delivers pitches, handles objections, and books meetings — all through autonomous phone conversations." },
          { heading: "Analytics Brain", text: "Analyzes your campaign data, identifies trends, and provides actionable recommendations to improve performance. Monitors open rates, reply rates, conversion rates, and suggests optimizations." },
          { heading: "Intent Monitor", text: "Tracks buying signals across your website visitors, email recipients, and social interactions. Alerts you when a lead shows high purchase intent so you can prioritize follow-up." },
          { heading: "Meeting Booker", text: "Handles scheduling conversations, sends calendar invites, manages rescheduling, and sends pre-meeting briefings. Integrates with Calendly and native calendar booking." },
          { heading: "Additional Agents", text: "ArgiFlow also includes agents for content creation, social media management, ad optimization, competitor monitoring, proposal generation, and customer success. New agents are added regularly based on user feedback." },
        ],
      },
      {
        title: "Configuring Agents",
        desc: "Customize agent behavior, target markets, outreach tone, and working schedules.",
        content: [
          { heading: "Target Market", text: "Define your ideal customer profile (ICP) including industry, company size, geography, job titles, and technology stack. Agents use this to focus their efforts on the most relevant prospects." },
          { heading: "Outreach Tone", text: "Set the communication style for each agent: Professional, Casual, Friendly, Authoritative, or Custom. You can also provide example emails or scripts for the AI to learn from." },
          { heading: "Working Schedule", text: "Configure when agents should be active. Set business hours, timezone, and blackout periods. Emails and calls are only sent during configured windows to maintain professionalism." },
          { heading: "Volume Controls", text: "Set daily limits for emails sent, calls made, and leads contacted. This helps manage your credits budget and ensures compliance with sending limits and anti-spam regulations." },
          { heading: "Approval Rules", text: "For each agent, decide whether actions require manual approval, proceed automatically, or follow custom rules (e.g., auto-approve for leads below a certain value, require approval for enterprise prospects)." },
        ],
      },
      {
        title: "Autonomous Outreach Agent",
        desc: "Set up the 8-step outreach loop that finds, contacts, and books meetings automatically.",
        content: [
          { heading: "Step 1: Target Definition", text: "The agent starts by analyzing your ICP and business goals to define the target audience for this outreach cycle." },
          { heading: "Step 2: Lead Discovery", text: "Using the B2B Data Engine, the agent finds prospects matching your criteria and enriches them with contact details and company data." },
          { heading: "Step 3: Research & Personalization", text: "For each prospect, the agent researches recent news, social activity, and company updates to craft a personalized outreach angle." },
          { heading: "Step 4: Email Composition", text: "AI generates a personalized cold email for each prospect, incorporating the research findings and your brand voice." },
          { heading: "Step 5: Sending & Scheduling", text: "Emails are sent through your warmed-up email accounts at optimal times based on the recipient's timezone and historical engagement data." },
          { heading: "Step 6: Follow-Up Sequences", text: "The agent monitors responses and automatically sends follow-up emails to non-responders on a configurable schedule (typically 3, 7, and 14 days)." },
          { heading: "Step 7: Reply Handling", text: "Incoming replies are classified by the AI (interested, not interested, out of office, referral) and handled accordingly — interested replies trigger meeting booking." },
          { heading: "Step 8: Meeting Booking", text: "When a prospect shows interest, the agent initiates scheduling, sends calendar invites, and prepares a pre-meeting briefing with all relevant prospect data." },
        ],
      },
      {
        title: "Voice AI Calling",
        desc: "Configure Twilio integration for AI-powered phone calls with Deepgram speech processing.",
        content: [
          { heading: "Twilio Setup", text: "Connect your Twilio account by entering your Account SID and Auth Token in Settings > Integrations > Twilio. Purchase a phone number from Twilio to use as your outbound calling number." },
          { heading: "Deepgram Integration", text: "ArgiFlow uses Deepgram for real-time speech-to-text (STT) and text-to-speech (TTS) during calls. The integration is pre-configured — just ensure your Deepgram API key is set in your environment." },
          { heading: "Call Scripts", text: "Create and customize AI call scripts for different scenarios: cold calls, follow-ups, qualification calls, and meeting confirmations. The AI adapts the script in real-time based on the conversation flow." },
          { heading: "Call Recording & Transcripts", text: "All calls are automatically recorded and transcribed. Review transcripts from the Voice AI section, search across calls, and use insights to refine your scripts and approach." },
          { heading: "Compliance", text: "ArgiFlow supports configurable call compliance settings including time-of-day restrictions, do-not-call list management, and call recording consent announcements. Ensure you comply with local regulations (TCPA, GDPR) before using Voice AI." },
        ],
      },
    ],
  },
  {
    title: "Sales Intelligence",
    icon: Search,
    articles: [
      {
        title: "B2B Data Engine",
        desc: "How ArgiFlow aggregates data from OpenCorporates, SEC EDGAR, Wikidata, and more.",
        content: [
          { heading: "Data Sources", text: "ArgiFlow pulls data from OpenCorporates (company registrations), SEC EDGAR (public filings), Wikidata (structured knowledge), GitHub (tech stack signals), RDAP/WHOIS (domain ownership), DuckDuckGo (web presence), and direct web scraping for comprehensive business intelligence." },
          { heading: "How It Works", text: "When you search for a company or run lead discovery, ArgiFlow queries all available sources simultaneously, deduplicates results, and merges data into a unified company profile. This process typically takes 5-15 seconds per company." },
          { heading: "Data Points Collected", text: "Company name, address, industry, revenue range, employee count, founding date, key executives, technology stack, social profiles, recent news, funding history, and competitive landscape." },
          { heading: "Free Lead Intelligence Scraper", text: "ArgiFlow includes a zero-cost lead discovery tool that uses publicly available data sources to find and enrich leads without consuming credits. Ideal for startups and small businesses getting started with prospecting." },
        ],
      },
      {
        title: "Lead Enrichment",
        desc: "Auto-enrich contacts with verified emails, phone numbers, social profiles, and tech stack data.",
        content: [
          { heading: "Automatic Enrichment", text: "When you add a lead (manually or through discovery), ArgiFlow automatically enriches the record with verified email addresses, phone numbers, LinkedIn profiles, company data, and technology stack information." },
          { heading: "Email Verification", text: "All discovered email addresses are verified in real-time using multi-step validation: syntax check, domain verification (MX records), and mailbox ping. Only verified emails are added to your lead records." },
          { heading: "Bulk Enrichment", text: "Import a CSV of contacts or companies and ArgiFlow will enrich all records in batch. Enrichment progress is tracked in real-time and results are available for export." },
          { heading: "Data Freshness", text: "Lead data is refreshed automatically when accessed after 30 days, ensuring your contact information stays current. You can also trigger manual re-enrichment at any time." },
        ],
      },
      {
        title: "Intent Data & Scoring",
        desc: "Track buying signals and compute intent scores based on engagement and behavior.",
        content: [
          { heading: "What is Intent Data?", text: "Intent data captures signals that indicate a prospect is actively researching or considering a purchase. ArgiFlow tracks email engagement (opens, clicks), website visits, content downloads, and social interactions to build a comprehensive intent profile." },
          { heading: "Intent Score Calculation", text: "Each lead receives a dynamic intent score (0-100) based on weighted signals: email opens (+5), link clicks (+15), website visits (+10 per page), pricing page views (+25), demo requests (+50), and time-decay factors that reduce scores for older interactions." },
          { heading: "Visitor Intelligence", text: "The Visitor Intelligence Engine cross-references anonymous website visitor IPs with email tracking data to identify who's browsing your site. When an email recipient clicks a link and visits your website, ArgiFlow connects their entire email-to-website journey." },
          { heading: "Acting on Intent", text: "Configure automated workflows triggered by intent score thresholds: when a lead reaches a score of 70+, automatically assign to a sales rep, trigger a call from Voice AI, or send a high-priority follow-up email." },
        ],
      },
      {
        title: "Visitor Intelligence",
        desc: "Identify anonymous website visitors and cross-reference with email tracking data.",
        content: [
          { heading: "Tracking Snippet", text: "Add the ArgiFlow tracking snippet (a small JavaScript file) to your website. It captures page views, sessions, clicks, form behavior, and custom events without impacting page load performance." },
          { heading: "Email-to-Website Bridge", text: "When email recipients click links in your campaigns, the redirect appends a tracking token to the destination URL. The tracking snippet detects this token and calls ArgiFlow's identity resolution API to link the visitor to their email profile." },
          { heading: "Visitor Profiles", text: "View detailed visitor profiles showing: pages viewed, time on site, content engaged with, CTAs clicked, referring source, device and location data, and their complete email interaction history." },
          { heading: "Real-Time Alerts", text: "Get notified when high-value leads visit your website. Configure alerts based on lead score, pages visited (e.g., pricing page), or visit frequency." },
        ],
      },
    ],
  },
  {
    title: "Email & Outreach",
    icon: Mail,
    articles: [
      {
        title: "Campaign Builder",
        desc: "Create multi-step email sequences with A/B testing and smart scheduling.",
        content: [
          { heading: "Creating a Campaign", text: "Navigate to Email & Outreach > Campaigns > New Campaign. Select your target audience (from your CRM or a new lead list), choose a template or start from scratch, and configure your sending schedule." },
          { heading: "Multi-Step Sequences", text: "Build automated email sequences with multiple touchpoints. Define the timing between steps (e.g., Day 1: initial email, Day 3: follow-up if no open, Day 7: value-add, Day 14: final follow-up). Each step can have different content and conditional logic." },
          { heading: "A/B Testing", text: "Test different subject lines, email content, send times, or sender names. ArgiFlow automatically splits your audience, tracks performance, and identifies the winning variant. You can A/B test up to 5 variants simultaneously." },
          { heading: "AI Content Generation", text: "Use the AI Copilot to generate email content. Provide a brief description of your goal and the AI will create multiple variants in your brand voice. Review, edit, and approve before sending." },
          { heading: "Smart Scheduling", text: "ArgiFlow analyzes recipient timezone, industry norms, and historical engagement data to determine the optimal send time for each email. This maximizes open rates and reply rates." },
        ],
      },
      {
        title: "Email Warmup",
        desc: "Automated domain warming to maximize deliverability before launching campaigns.",
        content: [
          { heading: "Why Warmup Matters", text: "New email accounts and domains have no sending reputation. Sending large volumes immediately will trigger spam filters. Email warmup gradually builds your sender reputation by exchanging emails with a network of real inboxes." },
          { heading: "How It Works", text: "ArgiFlow's warmup engine sends and receives emails on your behalf, gradually increasing volume over 2-4 weeks. These emails are automatically opened, replied to, and moved from spam to inbox, training email providers to trust your domain." },
          { heading: "Warmup Schedule", text: "The default warmup schedule starts at 5 emails/day and ramps up to your target daily volume over 14-30 days. You can customize the schedule, warmup speed, and target volume from Email & Outreach > Warmup." },
          { heading: "Monitoring", text: "Track warmup progress with real-time metrics: emails sent, inbox placement rate, spam rate, and overall reputation score. ArgiFlow alerts you when warmup is complete and your domain is ready for campaigns." },
        ],
      },
      {
        title: "Sending Domains",
        desc: "Configure SPF, DKIM, DMARC for white-label sending via AWS SES.",
        content: [
          { heading: "Why Custom Domains?", text: "Sending from your own domain (e.g., outreach@yourdomain.com) instead of a generic email improves deliverability, brand recognition, and reply rates. ArgiFlow uses AWS SES as the primary sending infrastructure." },
          { heading: "SPF Configuration", text: "Add the ArgiFlow SPF record to your domain's DNS settings. This tells email providers that ArgiFlow is authorized to send emails on behalf of your domain. Example: v=spf1 include:amazonses.com ~all" },
          { heading: "DKIM Setup", text: "ArgiFlow generates unique DKIM signing keys for your domain. Add the provided CNAME records to your DNS. DKIM cryptographically signs each email, proving it hasn't been tampered with in transit." },
          { heading: "DMARC Policy", text: "Configure a DMARC policy to tell receiving servers how to handle emails that fail SPF or DKIM checks. Start with a monitoring policy (p=none) and gradually move to enforcement (p=quarantine or p=reject) as your authentication stabilizes." },
          { heading: "Verification", text: "After adding DNS records, ArgiFlow automatically verifies your domain configuration and displays the status for each record. Full verification typically takes 24-72 hours due to DNS propagation." },
        ],
      },
      {
        title: "Unified Inbox",
        desc: "AI-classified inbox that auto-labels replies by sentiment and intent.",
        content: [
          { heading: "Overview", text: "The Unified Inbox aggregates replies from all your connected email accounts into a single view. No more switching between Gmail, Outlook, and other providers — see everything in one place." },
          { heading: "AI Classification", text: "Every incoming reply is automatically classified by the AI into categories: Interested, Not Interested, Out of Office, Referral, Unsubscribe Request, Question, and Meeting Request. This classification happens in real-time with 95%+ accuracy." },
          { heading: "Priority Sorting", text: "Replies are sorted by priority: interested and meeting request replies appear at the top, while out-of-office and unsubscribe messages are deprioritized. This ensures you focus on the most valuable conversations first." },
          { heading: "Quick Actions", text: "From the inbox, you can reply (with AI-suggested responses), forward to a team member, add the contact to a campaign, update their CRM status, or schedule a follow-up — all without leaving the inbox view." },
        ],
      },
    ],
  },
  {
    title: "CRM & Pipeline",
    icon: Users,
    articles: [
      {
        title: "Contact Management",
        desc: "Organize leads with custom fields, tags, engagement scores, and activity timelines.",
        content: [
          { heading: "Adding Contacts", text: "Add contacts manually, import from CSV, or let AI agents discover them automatically. Each contact record includes name, email, phone, company, title, and any custom fields you define." },
          { heading: "Custom Fields & Tags", text: "Create custom fields (text, number, date, dropdown) to capture industry-specific data. Use tags to categorize contacts (e.g., \"Healthcare,\" \"Decision Maker,\" \"Hot Lead\") for easy filtering and campaign targeting." },
          { heading: "Engagement Score", text: "Every contact has a dynamic engagement score based on their interactions: email opens, link clicks, website visits, call conversations, and meeting attendance. Higher scores indicate warmer prospects." },
          { heading: "Activity Timeline", text: "View a complete history of every interaction with a contact: emails sent and received, calls made, website visits, meeting notes, and AI agent actions. The timeline provides full context for every conversation." },
        ],
      },
      {
        title: "Sales Funnels",
        desc: "Visual Kanban-style pipelines for tracking deals from lead to closed-won.",
        content: [
          { heading: "Pipeline Setup", text: "Create custom sales pipelines with stages that match your sales process. Common stages include: New Lead, Contacted, Qualified, Proposal Sent, Negotiation, and Closed Won/Lost." },
          { heading: "Kanban View", text: "Drag and drop deals between stages on a visual Kanban board. Each card shows the deal value, contact name, next action, and days in current stage. Color coding indicates deal health." },
          { heading: "Deal Tracking", text: "Assign values, expected close dates, and probability percentages to each deal. ArgiFlow calculates your weighted pipeline value and forecasts expected revenue by period." },
          { heading: "Automation", text: "Set up rules to automatically move deals between stages based on actions (e.g., when a proposal is opened, move to \"Reviewing\"; when a meeting is booked, move to \"Qualified\")." },
        ],
      },
      {
        title: "Calendar & Booking",
        desc: "Integrated scheduling with automated reminders and booking page links.",
        content: [
          { heading: "Booking Pages", text: "Create shareable booking pages where prospects can schedule meetings directly. Customize available times, meeting duration, buffer time, and booking questions. Share the link in emails, on your website, or let AI agents use it." },
          { heading: "Calendar Integration", text: "ArgiFlow checks your calendar availability in real-time to prevent double-bookings. Supports integration with Google Calendar and Outlook Calendar." },
          { heading: "Automated Reminders", text: "Send automatic email and SMS reminders before scheduled meetings (configurable at 24h, 1h, and 15min before). Reduce no-shows by up to 80% with consistent reminders." },
          { heading: "Meeting Notes", text: "After each meeting, add notes, action items, and next steps directly in the CRM. ARIA can also generate meeting summaries from call transcripts automatically." },
        ],
      },
      {
        title: "Invoicing & E-Signatures",
        desc: "Generate professional quotes, invoices, and contracts with built-in signing.",
        content: [
          { heading: "Invoice Creation", text: "Generate professional invoices from deal data in your pipeline. Customize with your branding, payment terms, line items, tax rates, and notes. Invoices are sent via email with a secure payment link." },
          { heading: "Proposals & Quotes", text: "Create detailed proposals with cover pages, scope of work, pricing tables, and terms. AI can help generate proposal content based on your meeting notes and the prospect's requirements." },
          { heading: "E-Signatures", text: "Send contracts and agreements for electronic signature directly through ArgiFlow. Track signing status, send reminders, and receive notifications when documents are signed." },
          { heading: "Payment Tracking", text: "Monitor invoice status (draft, sent, viewed, paid, overdue) from a central dashboard. Set up automatic payment reminders for overdue invoices." },
        ],
      },
    ],
  },
  {
    title: "Integrations & API",
    icon: Settings,
    articles: [
      {
        title: "AI Provider Configuration",
        desc: "Set up and switch between 9 AI providers — OpenAI, Anthropic, Gemini, Mistral, and more.",
        content: [
          { heading: "Supported Providers", text: "ArgiFlow supports 9 AI providers: OpenAI (GPT-4o, GPT-4, GPT-3.5), Anthropic (Claude 3.5 Sonnet, Claude 3 Opus), Google Gemini (Pro, Flash), Mistral (Large, Medium), Groq (Llama, Mixtral), Together AI, Cohere (Command R+), OpenRouter (access to 100+ models), and Ollama (run models locally)." },
          { heading: "Switching Providers", text: "Change your AI provider from Settings > AI Provider. The switch is instant — your next AI request will use the new provider. All providers support the same features, though response quality and speed may vary." },
          { heading: "Bring Your Own Key (BYOK)", text: "For maximum control and cost efficiency, enter your own API key for any supported provider. Your key is encrypted and stored securely. When a personal key is set, all AI requests use your key directly, bypassing ArgiFlow's shared pool." },
          { heading: "Provider Priority", text: "ArgiFlow uses an intelligent fallback chain: (1) System OpenAI key, (2) Your personal BYOK key, (3) System Anthropic key, (4) Replit proxy, (5) Other available system keys. This ensures AI features always work even if one provider is temporarily unavailable." },
        ],
      },
      {
        title: "Twilio Integration",
        desc: "Connect Twilio for SMS outreach and Voice AI calling capabilities.",
        content: [
          { heading: "Account Connection", text: "Enter your Twilio Account SID and Auth Token in Settings > Integrations > Twilio. ArgiFlow securely stores these credentials and uses them for all SMS and voice operations." },
          { heading: "Phone Numbers", text: "Purchase phone numbers directly through Twilio's console and configure them in ArgiFlow. Use local numbers for higher answer rates, or toll-free numbers for a professional presence." },
          { heading: "SMS Outreach", text: "Send personalized SMS messages to leads as part of your outreach sequences. SMS can be used standalone or combined with email campaigns for multi-channel engagement." },
          { heading: "Voice AI", text: "Make AI-powered phone calls using Twilio's voice infrastructure combined with Deepgram's speech processing. The AI handles natural conversations, qualifies leads, and books meetings autonomously." },
        ],
      },
      {
        title: "Stripe Payments",
        desc: "Configure Stripe for subscription billing and payment processing.",
        content: [
          { heading: "Connection", text: "ArgiFlow uses Stripe for secure subscription billing. Your Stripe integration is pre-configured — subscription management, plan upgrades, and payment processing are handled automatically." },
          { heading: "Subscription Plans", text: "Three plans are available: Starter (Free, 30-day trial), Pro ($49/month), and Agency ($99/month). Each plan includes different credit allocations, feature access, and usage limits." },
          { heading: "Payment Methods", text: "Stripe supports credit cards, debit cards, and select digital wallets. All payment data is handled by Stripe directly — ArgiFlow never stores your card information." },
          { heading: "Billing Portal", text: "Access your Stripe billing portal from Settings > Billing to view invoices, update payment methods, change plans, and download receipts for accounting." },
        ],
      },
      {
        title: "Webhook & API Reference",
        desc: "Connect ArgiFlow to your existing tools with webhooks and REST API.",
        content: [
          { heading: "REST API", text: "ArgiFlow exposes a RESTful API for programmatic access to all platform features. Authenticate with your API key and make requests to manage contacts, campaigns, agents, and more. All endpoints accept and return JSON." },
          { heading: "Webhook Events", text: "Configure webhooks to receive real-time notifications when events occur: new lead discovered, email opened, reply received, meeting booked, deal stage changed, and more. Webhooks are sent as HTTP POST requests to your specified URL." },
          { heading: "Workflow Automation", text: "ArgiFlow includes an n8n-style workflow engine for building custom automations. Trigger workflows based on events, schedule them on a cron, or invoke them manually. Connect with external tools via HTTP requests, webhooks, and native integrations." },
          { heading: "Rate Limits", text: "API requests are rate-limited based on your plan: Starter (100 req/min), Pro (500 req/min), Agency (2000 req/min). Webhook deliveries retry automatically on failure with exponential backoff." },
        ],
      },
    ],
  },
];

function DocArticle({ article, sectionIdx, articleIdx }: { article: typeof docSections[0]["articles"][0]; sectionIdx: number; articleIdx: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] overflow-hidden transition-all hover:border-indigo-500/20" data-testid={`card-doc-${sectionIdx}-${articleIdx}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-5 flex items-start justify-between gap-3 cursor-pointer bg-transparent border-none"
        data-testid={`button-doc-${sectionIdx}-${articleIdx}`}
      >
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-white mb-1">{article.title}</h3>
          <p className="text-[13px] text-white/30 leading-relaxed">{article.desc}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-white/25 shrink-0 mt-1 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4" data-testid={`content-doc-${sectionIdx}-${articleIdx}`}>
          {article.content.map((block, k) => (
            <div key={k}>
              <h4 className="text-[13px] font-semibold text-indigo-300 mb-1.5">{block.heading}</h4>
              <p className="text-[13px] text-white/40 leading-relaxed">{block.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicDocsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between px-6 h-16">
          <a href="/" className="flex items-center gap-2.5 no-underline" data-testid="link-home">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">Argi<span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Flow</span></span>
          </a>
          <a href="/" className="flex items-center gap-2 text-[13px] text-white/50 hover:text-white transition-colors no-underline" data-testid="link-back-home">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </a>
        </div>
      </nav>

      <div className="pt-32 pb-24 px-6 max-w-[1100px] mx-auto">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-semibold text-indigo-300 uppercase tracking-widest px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-5">
            <BookOpen className="w-3.5 h-3.5" />
            Documentation
          </span>
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-tight mb-4" data-testid="text-docs-title">
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Documentation</span> & Guides
          </h1>
          <p className="text-lg text-white/40 max-w-[560px] mx-auto leading-relaxed">
            Everything you need to set up, configure, and get the most out of ArgiFlow.
          </p>
        </div>

        <div className="space-y-10">
          {docSections.map((section, i) => (
            <div key={i} data-testid={`section-docs-${i}`}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/10 flex items-center justify-center">
                  <section.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.articles.map((article, j) => (
                  <DocArticle key={j} article={article} sectionIdx={i} articleIdx={j} />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 p-8 rounded-2xl text-center bg-white/[0.03] border border-white/[0.08]">
          <h3 className="text-lg font-bold mb-2">Need More Help?</h3>
          <p className="text-white/35 text-sm mb-4">Can't find what you're looking for? Our support team is ready to assist.</p>
          <a href="/contact" data-testid="link-docs-contact" className="inline-flex px-6 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/25 transition-all no-underline">
            Contact Support
          </a>
        </div>
      </div>

      <footer className="py-8 px-6 max-w-[900px] mx-auto border-t border-white/5 text-center">
        <p className="text-[12px] text-white/15">&copy; {new Date().getFullYear()} ArgiFlow AI by ARGILETTE Labs. All rights reserved.</p>
      </footer>
    </div>
  );
}
