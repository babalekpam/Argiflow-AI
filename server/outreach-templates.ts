export const TRACKMED_SIGNATURE = `Abel Nkawula\nCEO, Track-Med Billing Solutions\n+1 (615) 482-6768\nhttps://www.track-med.com`;

export const TRACKMED_SEQUENCES = {
  private_practice: {
    label: "Private Practice",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Quick question about your claim denial rate",
        body: `Hi {{First Name}},

Most independent practices are losing 8–15% of revenue to preventable claim denials — and don't realize it until month-end.

Track-Med catches those errors before submission using AI claim scrubbing and surfaces denial trends in real time so nothing slips through.

Can I do a free 20-minute A/R audit for {{Practice Name}}? No pitch — just data.

→ https://calendly.com/track-med-info/30min

Abel Nkawula
Track-Med Billing Solutions | track-med.com`,
      },
      {
        touch: 2, day: 4,
        subject: "One thing most practices miss on EOB reconciliation",
        body: `Hi {{First Name}},

Adding to my note from earlier this week —

Most practices reconcile EOBs manually and miss contractual underpayments. Payers routinely pay below the contracted rate, knowing most offices won't catch it.

Track-Med flags those automatically. Practices we audit typically recover $18K–$40K in missed payments within 90 days.

Worth 20 minutes?

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "How a 3-physician practice recovered $47K in 90 days",
        body: `Hi {{First Name}},

A small internal medicine group we work with had a timely filing denial problem — claims slipping past their old system undetected.

After switching to Track-Med, those denials dropped 80%. They recovered $47K in the first quarter.

Their setup: 3 physicians, one biller. Sound familiar?

The 20-min audit shows exactly how:

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Closing the loop — {{First Name}}",
        body: `Hi {{First Name}},

I won't keep reaching out if the timing's off.

Before I close this: if your A/R days are over 35 or denial rate above 8%, there's real money sitting uncollected right now.

Link stays open if things change:

→ https://calendly.com/track-med-info/30min

Strong quarter to you and your team.

Abel`,
      },
    ],
  },
  dental: {
    label: "Dental Offices",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Dental billing question — {{Practice Name}}",
        body: `Hi {{First Name}},

CDT code mismatches, missing narratives, and incomplete X-ray documentation are the top reasons dental claims get denied — and they're all preventable.

Track-Med's dental-specific claim scrubber catches those before submission and flags payer-specific requirements automatically.

Free 20-minute billing audit for {{Practice Name}}?

→ https://calendly.com/track-med-info/30min

Abel Nkawula
Track-Med | track-med.com`,
      },
      {
        touch: 2, day: 4,
        subject: "Are you collecting 100% of what insurance owes you?",
        body: `Hi {{First Name}},

Most dental practices aren't — the gap usually comes from underpayments on covered procedures and write-offs that shouldn't have happened.

Track-Med reconciles every EOB against your fee schedule and flags discrepancies. For hybrid fee-for-service practices, it tracks patient balance collection separately too.

20 minutes to see if there's a gap in your setup:

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "Is your front desk handling too much billing?",
        body: `Hi {{First Name}},

In most dental offices, billing falls on the front desk — rescheduling patients while chasing claim status isn't the best use of their time.

Track-Med automates claim status checks, denial alerts, and resubmission queues so your team stays focused on patients.

Want to see what that looks like in practice?

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Last note — {{Practice Name}}",
        body: `Hi {{First Name}},

Won't keep reaching out after this.

One question before I go: is billing admin a real pain point for your team right now, or is it running smoothly?

Even a one-word reply helps.

→ https://calendly.com/track-med-info/30min

Abel`,
      },
    ],
  },
  mental_health: {
    label: "Mental Health / Therapy",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Prior auth is getting harder for behavioral health",
        body: `Hi {{First Name}},

Payers have quietly tightened prior auth requirements for behavioral health — more session limits, stricter medical necessity docs, inconsistent telehealth policies.

Track-Med tracks prior auth expirations automatically and applies the right POS codes and modifiers per payer so your clinicians don't lose sessions to admin errors.

Free 20-minute audit for {{Practice Name}}?

→ https://calendly.com/track-med-info/30min

Abel Nkawula
Track-Med | track-med.com`,
      },
      {
        touch: 2, day: 4,
        subject: "Telehealth billing errors most therapy practices miss",
        body: `Hi {{First Name}},

Telehealth billing for behavioral health is one of the most error-prone areas right now — payers change policies quarterly, and wrong POS codes or missing GT modifiers trigger instant denials.

Track-Med auto-applies correct codes per payer and alerts you before an authorization expires.

Want to see what that catches in your current claims?

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "Is billing pulling your team away from clients?",
        body: `Hi {{First Name}},

For most mental health practices, billing admin is the top source of staff burnout — chasing prior auths and reconciling EOBs manually takes time that should go toward client care.

Track-Med automates the repetitive tasks so your clinicians stay focused on what matters.

Happy to show you what that looks like for a practice your size:

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Signing off — {{First Name}}",
        body: `Hi {{First Name}},

This is my last note — I don't want to add to your inbox.

If prior auth management or telehealth billing ever becomes a bigger friction point, I'm easy to reach.

Take care of your team and your clients.

→ https://calendly.com/track-med-info/30min

Abel`,
      },
    ],
  },
  hospital: {
    label: "Hospitals / Health Systems",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Revenue cycle question — {{Practice Name}}",
        body: `Hi {{First Name}},

At health systems, the biggest A/R leakage usually comes from three places: underpayments on contracted rates, prior auth bottlenecks, and denials that never get appealed.

Track-Med gives revenue cycle teams real-time visibility across all three — with AI-flagged appeal drafts and payer contract variance detection built in.

Worth a 30-minute discovery call?

→ https://calendly.com/track-med-info/30min

Abel Nkawula
Track-Med | track-med.com`,
      },
      {
        touch: 2, day: 5,
        subject: "One number worth knowing — {{Practice Name}}",
        body: `Hi {{First Name}},

For a health system billing $20M+ annually, a 1% improvement in net collection rate is $200K recovered.

Most RCM teams miss 2–4% of contractual underpayments because payer reconciliation is done manually. Track-Med flags those variances automatically against your contracted rates.

30 minutes to see what that looks like for your system?

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 3, day: 12,
        subject: "Q2 A/R review — relevant for {{Practice Name}}?",
        body: `Hi {{First Name}},

With Q1 wrapping up, most revenue cycle teams are reviewing denial trends and A/R aging reports.

If you're running that analysis and want to benchmark against what similar systems are seeing — or see how Track-Med handles it automated — I'm happy to do a quick 30-minute walkthrough.

No deck, just live data:

→ https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 20,
        subject: "Closing the loop — {{First Name}}",
        body: `Hi {{First Name}},

I've reached out a few times — I'll take the silence as a signal that timing or priority isn't right.

If that changes and you want a second opinion on denial rate or underpayment exposure, I'm one email away.

Strong Q2 to your team.

Abel Nkawula | Track-Med
track-med.com`,
      },
    ],
  },
};

export function detectSpecialty(lead: any): keyof typeof TRACKMED_SEQUENCES {
  const text = `${lead.company || ""} ${lead.notes || ""} ${lead.intentSignal || ""} ${lead.source || ""}`.toLowerCase();
  if (/dental|dentist|dds|dmd|orthodont|endodont|periodon|oral\s*surg/i.test(text)) return "dental";
  if (/mental\s*health|therap|psychol|psychiatr|counseli|behavioral|lcsw|lmft|social\s*work/i.test(text)) return "mental_health";
  if (/hospital|health\s*system|medical\s*center|regional\s*medical|health\s*network/i.test(text)) return "hospital";
  return "private_practice";
}

export function getTouch1ForSpecialty(specialty: keyof typeof TRACKMED_SEQUENCES, leadName: string, practiceName: string): string {
  const seq = TRACKMED_SEQUENCES[specialty];
  const touch = seq.touches[0];
  const firstName = leadName.split(" ")[0];
  const subject = touch.subject.replace(/\{\{First Name\}\}/g, firstName).replace(/\{\{Practice Name\}\}/g, practiceName).replace(/\{\{Health System Name\}\}/g, practiceName);
  const body = touch.body.replace(/\{\{First Name\}\}/g, firstName).replace(/\{\{Practice Name\}\}/g, practiceName).replace(/\{\{Health System Name\}\}/g, practiceName);
  return `Subject: ${subject}\n\n${body}`;
}

export function getFollowUpForSpecialty(specialty: keyof typeof TRACKMED_SEQUENCES, step: number, leadName: string, practiceName: string): { subject: string; body: string } | null {
  const seq = TRACKMED_SEQUENCES[specialty];
  const touch = seq.touches[step];
  if (!touch) return null;
  const firstName = leadName.split(" ")[0];
  return {
    subject: touch.subject.replace(/\{\{First Name\}\}/g, firstName).replace(/\{\{Practice Name\}\}/g, practiceName).replace(/\{\{Health System Name\}\}/g, practiceName),
    body: touch.body.replace(/\{\{First Name\}\}/g, firstName).replace(/\{\{Practice Name\}\}/g, practiceName).replace(/\{\{Health System Name\}\}/g, practiceName),
  };
}

export function getTemplateInstructions(): string {
  let instructions = `## OUTREACH TEMPLATES — Specialty-Specific 4-Touch Sequences

Select the template based on the lead's specialty/practice type. Use Touch 1 for initial outreach. Follow-ups are handled automatically.

IMPORTANT: The AI must detect the lead's specialty from their company name, notes, or intent signals:
- Dental/DDS/DMD/Orthodontist → Dental sequence
- Mental health/Therapy/Psychology/Counseling/LCSW → Mental Health sequence
- Hospital/Health system/Medical center → Hospital sequence
- All other medical practices → Private Practice sequence

`;

  for (const [key, seq] of Object.entries(TRACKMED_SEQUENCES)) {
    instructions += `### ${seq.label} — Touch 1 (Initial Outreach)\n`;
    const t = seq.touches[0];
    instructions += `Subject: ${t.subject}\n\n${t.body}\n\n`;
  }

  instructions += `## RULES:
- Replace {{First Name}} with the lead's first name
- Replace {{Practice Name}} or {{Health System Name}} with the lead's company/practice name
- Use the FULL template — do NOT shorten or summarize
- Do NOT add any additional signature beyond what's in the template
- Select the correct specialty template based on the lead's practice type
`;

  return instructions;
}
