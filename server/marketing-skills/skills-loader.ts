import SKILLS from "./skills-data";

const INTENT_MAP: Record<string, string[]> = {
  "cold-email": [
    "cold email", "cold outreach", "prospecting email", "sales email",
    "outbound email", "nobody replies", "open rate", "reply rate",
    "sequence not working", "email not getting responses", "sdr email"
  ],
  "email-sequence": [
    "email sequence", "drip campaign", "nurture sequence", "welcome series",
    "onboarding email", "email automation", "email flow", "email cadence",
    "follow up sequence", "what emails should i send", "email workflow"
  ],
  "page-cro": [
    "landing page", "conversion rate", "page not converting", "cro",
    "bounce rate", "nobody signing up", "page feedback", "homepage",
    "why isnt this page", "low conversion", "improve conversions"
  ],
  "pricing-strategy": [
    "pricing", "how much to charge", "pricing tiers", "freemium",
    "free trial", "pricing page", "should i offer free", "price increase",
    "packaging", "willingness to pay", "monetization", "per seat"
  ],
  "launch-strategy": [
    "launch", "product hunt", "go to market", "gtm", "beta launch",
    "early access", "waitlist", "how do i launch", "launch checklist",
    "announcement", "feature release", "product launch"
  ],
  "marketing-psychology": [
    "psychology", "why people buy", "persuasion", "cognitive bias",
    "social proof", "scarcity", "loss aversion", "anchoring", "framing",
    "mental models", "behavioral science", "nudge", "decision making"
  ],
  "copywriting": [
    "copy", "headline", "tagline", "website copy", "sales copy",
    "value proposition", "messaging", "how to write", "rewrite this",
    "make this better", "landing page copy"
  ],
  "seo-audit": [
    "seo", "search engine", "google ranking", "organic traffic",
    "seo audit", "keywords", "backlinks", "on-page seo", "site audit"
  ],
  "social-content": [
    "linkedin post", "twitter post", "instagram", "social media",
    "content calendar", "social content", "what to post", "social strategy"
  ],
  "ad-creative": [
    "facebook ad", "google ad", "paid ad", "ad copy", "ad creative",
    "meta ads", "ad campaign", "ppc", "advertising"
  ],
  "content-strategy": [
    "content strategy", "content plan", "blog strategy", "content marketing",
    "what content", "editorial calendar", "content ideas"
  ],
  "churn-prevention": [
    "churn", "cancel flow", "retention", "cancellation", "save offer",
    "reduce churn", "failed payment", "dunning", "win back"
  ],
  "sales-enablement": [
    "pitch deck", "sales deck", "one-pager", "sales collateral",
    "objection handling", "demo script", "sales playbook", "proposal"
  ],
  "lead-magnets": [
    "lead magnet", "freebie", "free resource", "ebook", "checklist",
    "template", "free tool", "gated content", "opt-in"
  ],
  "referral-program": [
    "referral", "affiliate", "word of mouth", "refer a friend",
    "referral program", "ambassador"
  ],
  "marketing-ideas": [
    "marketing ideas", "growth ideas", "how to get customers",
    "marketing strategy", "grow my business", "more leads"
  ]
};

export function getSkill(skillName: string): string {
  if (!SKILLS[skillName]) {
    throw new Error(`Skill "${skillName}" not found. Available: ${Object.keys(SKILLS).join(", ")}`);
  }
  return SKILLS[skillName];
}

export function detectSkills(userMessage: string, maxSkills = 2): string[] {
  const msg = userMessage.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [skill, keywords] of Object.entries(INTENT_MAP)) {
    let score = 0;
    for (const kw of keywords) {
      if (msg.includes(kw)) score += 1;
    }
    if (score > 0) scores[skill] = score;
  }

  return Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSkills)
    .map(([skill]) => skill);
}

export function buildSkillPrompt(skillNames: string[], argiflowContext = ""): string {
  const skillContents = skillNames.map(name => {
    try {
      return `## SKILL: ${name}\n${getSkill(name)}`;
    } catch {
      return "";
    }
  }).filter(Boolean);

  if (skillContents.length === 0) return argiflowContext;

  return `${argiflowContext}\n\n---\n\n# ACTIVE MARKETING SKILLS\n\nYou have been equipped with the following expert marketing frameworks. Apply them precisely to the user's request.\n\n${skillContents.join("\n\n---\n\n")}`;
}

export function buildAutoPrompt(userMessage: string, argiflowContext = ""): { skills: string[]; prompt: string } {
  const detected = detectSkills(userMessage);
  return {
    skills: detected,
    prompt: buildSkillPrompt(detected, argiflowContext)
  };
}

export function listSkills(): { name: string; intentKeywords: string[] }[] {
  return Object.keys(SKILLS).map(name => ({
    name,
    intentKeywords: INTENT_MAP[name] || []
  }));
}

export const ALL_SKILL_NAMES = Object.keys(SKILLS);
