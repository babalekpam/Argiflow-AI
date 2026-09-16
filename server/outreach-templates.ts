export const TRACKMED_SIGNATURE = `Abel Nkawula\nCEO, Track-Med Billing Solutions\n+1 (615) 482-6768\nhttps://www.track-med.com`;

export function generateTrackMedHtmlEmail(options: {
  firstName: string;
  practiceName: string;
  specialty?: string;
  bodyText: string;
  subjectLine: string;
}): { subject: string; htmlBody: string; plainText: string } {
  const { firstName, practiceName, bodyText, subjectLine } = options;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${subjectLine}</title>
</head>
<body style="margin:0;padding:0;background-color:#d4edda;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#d4edda;padding:20px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

<!-- HEADER -->
<tr><td style="background-color:#1e3a5f;padding:20px 30px;border-radius:8px 8px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">
&#x1F6E1; TRACK-MED<br>
<span style="font-size:11px;font-weight:400;letter-spacing:2px;color:#a0c4e8;">BILLING SOLUTIONS</span>
</td>
<td align="right" style="vertical-align:middle;">
<span style="color:#a0c4e8;font-size:11px;border:1px solid #a0c4e8;padding:4px 10px;border-radius:4px;letter-spacing:1px;">HIPAA COMPLIANT</span>
</td>
</tr>
</table>
</td></tr>

<!-- HERO SECTION -->
<tr><td style="background-color:#2a4a6f;padding:40px 30px;text-align:left;">
<p style="color:#a0c4e8;font-size:11px;letter-spacing:2px;margin:0 0 8px;text-transform:uppercase;">Individual & Small Group Practices</p>
<h1 style="color:#ffffff;font-size:32px;font-weight:800;margin:0 0 6px;line-height:1.1;">YOUR BILLING.</h1>
<h1 style="color:#ffffff;font-size:32px;font-weight:800;margin:0 0 16px;line-height:1.1;">FULLY SOLVED.</h1>
<p style="color:#c8dce8;font-size:14px;line-height:1.6;margin:0 0 20px;">We handle the complexity of insurance and patient billing — improving your cash flow, lowering operating costs, and giving your practice our complete, undivided attention.</p>
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td style="background-color:rgba(255,255,255,0.15);color:#ffffff;font-size:12px;padding:6px 14px;border-radius:20px;margin-right:8px;">Faster Payments</td>
<td width="8"></td>
<td style="background-color:rgba(255,255,255,0.15);color:#ffffff;font-size:12px;padding:6px 14px;border-radius:20px;">Fewer Denials</td>
<td width="8"></td>
<td style="background-color:rgba(255,255,255,0.15);color:#ffffff;font-size:12px;padding:6px 14px;border-radius:20px;">Live Claim Tracking</td>
</tr>
<tr><td colspan="5" height="8"></td></tr>
<tr>
<td style="background-color:rgba(255,255,255,0.15);color:#ffffff;font-size:12px;padding:6px 14px;border-radius:20px;">Free Software Included</td>
<td colspan="4"></td>
</tr>
</table>
</td></tr>

<!-- PERSONALIZED MESSAGE -->
<tr><td style="background-color:#ffffff;padding:30px;">
<p style="color:#333333;font-size:15px;line-height:1.7;margin:0;">
${bodyText.replace(/\n/g, '<br>')}
</p>
</td></tr>

<!-- SERVICES SECTION -->
<tr><td style="background-color:#ffffff;padding:0 30px 20px;">
<h3 style="color:#1e3a5f;font-size:14px;letter-spacing:1px;margin:0 0 15px;text-transform:uppercase;">What We Handle for You</h3>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;margin-bottom:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">Medical & Dental Billing</span></td></tr>
<tr><td height="6"></td></tr>
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">Physician Credentialing</span></td></tr>
<tr><td height="6"></td></tr>
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">EMR / EHR Software</span></td></tr>
<tr><td height="6"></td></tr>
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">MD Audit Shield — RAC</span></td></tr>
<tr><td height="6"></td></tr>
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">CodeMAXX Coding Svcs</span></td></tr>
<tr><td height="6"></td></tr>
<tr><td style="padding:12px 15px;border:1px solid #e8e8e8;border-radius:6px;"><span style="color:#4a90d9;font-size:14px;">&#9679;</span> <span style="color:#333;font-size:14px;">Creative Collections</span></td></tr>
</table>
</td></tr>

<!-- FREE OFFER -->
<tr><td style="background-color:#e8f5e9;padding:20px 30px;border-left:4px solid #4caf50;">
<p style="margin:0;font-size:14px;color:#2e7d32;line-height:1.6;">
<span style="background-color:#4caf50;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:3px;letter-spacing:1px;">FREE</span>
<strong style="color:#1e3a5f;"> Practice Management Software — on the house</strong> when you use our billing services. Plus a free CPT & billing cost analysis, no strings attached.
</p>
</td></tr>

<!-- STATS -->
<tr><td style="padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="33%" align="center" style="background-color:#1e3a5f;padding:20px 10px;">
<span style="color:#ffffff;font-size:24px;font-weight:bold;">15+</span><br>
<span style="color:#a0c4e8;font-size:11px;">Specialized services</span>
</td>
<td width="34%" align="center" style="background-color:#2a4a6f;padding:20px 10px;">
<span style="color:#ffffff;font-size:24px;font-weight:bold;">100%</span><br>
<span style="color:#a0c4e8;font-size:11px;">Dedicated per client</span>
</td>
<td width="33%" align="center" style="background-color:#1e3a5f;padding:20px 10px;">
<span style="color:#ffffff;font-size:24px;font-weight:bold;">Free</span><br>
<span style="color:#a0c4e8;font-size:11px;">Cost analysis always</span>
</td>
</tr>
</table>
</td></tr>

<!-- CTA -->
<tr><td style="background-color:#4a6fa5;padding:20px 30px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td>
<p style="color:#ffffff;font-size:16px;font-weight:bold;margin:0 0 4px;">Ready to solve your billing challenges?</p>
<p style="color:#c8dce8;font-size:13px;margin:0;">track-med.com &middot; (615) 482-6768</p>
</td>
<td align="right" style="vertical-align:middle;">
<a href="https://calendly.com/track-med-info/30min" style="background-color:#ffffff;color:#1e3a5f;font-size:13px;font-weight:bold;padding:12px 24px;border-radius:6px;text-decoration:none;letter-spacing:1px;display:inline-block;">GET STARTED &rarr;</a>
</td>
</tr>
</table>
</td></tr>

<!-- FOOTER -->
<tr><td style="padding:15px 30px;text-align:center;border-radius:0 0 8px 8px;background-color:#f5f5f5;">
<p style="color:#888;font-size:11px;margin:0;">#MedicalBilling #RCM #TrackMed #HealthcareHeroes #PatientCareFirst #PhysicianCredentialing #MedicalPractice</p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const plainText = `Hi ${firstName},

${bodyText}

---
WHAT WE HANDLE FOR YOU:
• Medical & Dental Billing
• Physician Credentialing
• EMR / EHR Software
• MD Audit Shield — RAC
• CodeMAXX Coding Svcs
• Creative Collections

FREE: Practice Management Software when you use our billing services. Plus a free CPT & billing cost analysis, no strings attached.

15+ Specialized services | 100% Dedicated per client | Free Cost analysis always

Ready to solve your billing challenges?
Book a call: https://calendly.com/track-med-info/30min

Abel Nkawula
CEO, Track-Med Billing Solutions
(615) 482-6768 | track-med.com`;

  return { subject: subjectLine, htmlBody, plainText };
}

export const TRACKMED_SEQUENCES = {
  private_practice: {
    label: "Private Practice",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Could {{Practice Name}} be collecting more?",
        body: `Hi {{First Name}},

I work with independent medical practices that want to improve collections without adding staff.

After reviewing thousands of claims, we've found many practices have hidden revenue opportunities caused by avoidable denials, underpayments, and aging A/R.

Our team of billing and practice management professionals brings over 30 years of experience across many specialties, and our clients commonly improve collections by 15–30% over 6–12 months by tightening revenue cycle processes.

Would you be open to a 20-minute Revenue Opportunity Review for {{Practice Name}}? We'll identify opportunities specific to your practice—no obligation.

Schedule here:
https://calendly.com/track-med-info/30min

Best,
Abel Nkawula
Track-Med Billing Solutions`,
      },
      {
        touch: 2, day: 4,
        subject: "One question about your collections",
        body: `Hi {{First Name}},

Quick question...

Do you know your practice's current:
• First-pass acceptance rate?
• Net collection rate?
• Average A/R days?
• Underpayment recovery rate?

Many practices know one or two—but not all four.

We provide a complimentary review that often uncovers opportunities worth tens of thousands of dollars annually.

Interested in comparing your numbers?

https://calendly.com/track-med-info/30min

Thanks,
Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "Where revenue quietly slips away",
        body: `Hi {{First Name}},

Most practices don't lose revenue because people aren't working hard.

They lose it because small issues compound:
• preventable denials
• underpaid claims
• aging A/R
• missed follow-up
• payer contract discrepancies

Individually they don't seem significant.

Together they can reduce collections by hundreds of thousands annually.

If you'd like a second opinion on your billing operation, I'd be happy to help.

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Should I close your file?",
        body: `Hi {{First Name}},

I'll make this my last email.

If improving collections isn't a priority right now, no worries.

If increasing revenue by 15–30% over the next year is something you'd like to explore, I'd be happy to schedule a brief conversation whenever the timing makes sense.

Here's my calendar:
https://calendly.com/track-med-info/30min

Best wishes,
Abel`,
      },
    ],
  },
  dental: {
    label: "Dental Offices",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Quick question for {{Practice Name}}",
        body: `Hi {{First Name}},

Dental practices today face increasing reimbursement pressure while administrative demands continue to grow.

We help practices increase collections by reducing preventable denials, recovering underpayments, and improving insurance reimbursement—without increasing workload for the front office.

Our team of billing and practice management professionals brings over 30 years of experience, and many practices improve collections by 15–30% within 6–12 months.

Would a complimentary 20-minute revenue review be worthwhile?

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 2, day: 4,
        subject: "Is your front desk doing billing too?",
        body: `Hi {{First Name}},

One thing we see repeatedly...

Your front office should be focused on patients—not spending hours following up on insurance claims.

We help practices streamline billing while improving reimbursement.

Would you like to see where your practice could improve?

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "Insurance companies make mistakes too.",
        body: `Hi {{First Name}},

Insurance carriers occasionally underpay legitimate claims.

Unfortunately, many practices never know because there's no time to reconcile every payment.

Recovering even a small percentage can make a meaningful impact over the course of a year.

Worth a quick conversation?

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Should I close your file?",
        body: `Hi {{First Name}},

I'll make this my last email.

If improving collections isn't a priority right now, no worries.

If increasing revenue by 15–30% over the next year is something you'd like to explore, I'd be happy to schedule a brief conversation whenever the timing makes sense.

Here's my calendar:
https://calendly.com/track-med-info/30min

Best wishes,
Abel`,
      },
    ],
  },
  mental_health: {
    label: "Behavioral Health",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Helping behavioral health practices improve cash flow",
        body: `Hi {{First Name}},

Behavioral health practices face increasing reimbursement complexity while trying to keep clinicians focused on patient care.

We help practices reduce billing delays, improve reimbursement, manage authorizations more efficiently, and increase collections by 15–30% over time.

Would you be open to a brief conversation?

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 2, day: 4,
        subject: "One question about your authorizations",
        body: `Hi {{First Name}},

Quick question...

How much time does your team spend managing authorizations and chasing claim status each week?

For most behavioral health practices it adds up to hours that clinicians and staff would rather spend on patient care—and delayed authorizations often mean delayed or lost revenue.

Our team of billing and practice management professionals brings over 30 years of experience helping practices reduce that administrative burden while improving cash flow.

Would it make sense to talk?

https://calendly.com/track-med-info/30min

Thanks,
Abel`,
      },
      {
        touch: 3, day: 10,
        subject: "Where behavioral health revenue quietly slips away",
        body: `Hi {{First Name}},

Most behavioral health practices don't lose revenue because people aren't working hard.

They lose it because small issues compound:
• delayed or lapsed authorizations
• billing delays that slow cash flow
• underpaid claims
• aging A/R
• administrative work pulling clinicians away from care

Individually they don't seem significant. Together they can meaningfully reduce collections over the course of a year.

If you'd like a second opinion on your revenue cycle, I'd be happy to help.

https://calendly.com/track-med-info/30min

Abel`,
      },
      {
        touch: 4, day: 18,
        subject: "Should I close your file?",
        body: `Hi {{First Name}},

I'll make this my last email.

If improving cash flow isn't a priority right now, no worries.

If increasing collections by 15–30% over the next year while reducing administrative burden is something you'd like to explore, I'd be happy to schedule a brief conversation whenever the timing makes sense.

Here's my calendar:
https://calendly.com/track-med-info/30min

Best wishes,
Abel`,
      },
    ],
  },
  hospital: {
    label: "Hospitals / Health Systems",
    touches: [
      {
        touch: 1, day: 0,
        subject: "Reducing revenue leakage at {{Practice Name}}",
        body: `Hi {{First Name}},

Even high-performing revenue cycle departments experience preventable revenue leakage through denials, underpayments, aging A/R, and inconsistent payer follow-up.

We work alongside existing RCM teams to identify opportunities that improve net collections without increasing staffing.

If you'd like an outside perspective on where additional revenue may be hiding, I'd welcome a 30-minute discussion.

https://calendly.com/track-med-info/30min

Best,
Abel`,
      },
      {
        touch: 2, day: 5,
        subject: "Worth a second opinion on your revenue cycle?",
        body: `Hi {{First Name}},

Following up on my earlier note.

Our team of billing and practice management professionals brings over three decades of experience across many specialties, and we have worked with virtually every payer.

We offer a complimentary Revenue Leakage Analysis: a structured review of denials, underpayments, and aging A/R that puts a dollar figure on recoverable revenue—without disrupting your existing RCM team.

Would it make sense to talk?

https://calendly.com/track-med-info/30min

Best,
Abel`,
      },
      {
        touch: 3, day: 12,
        subject: "Are you collecting everything you've earned?",
        body: `Hi {{First Name}},

Most revenue cycle leaders track denial rates closely. Fewer have visibility into contractual underpayments—payments that arrive below contracted rates and never appear on a denial report.

Reconciling payments against payer contracts at the line level is rarely feasible by hand, which is why this category of leakage tends to persist year after year.

If an outside review of that exposure would be useful, I'd welcome a brief discussion.

https://calendly.com/track-med-info/30min

Best,
Abel`,
      },
      {
        touch: 4, day: 20,
        subject: "Closing the loop, {{First Name}}",
        body: `Hi {{First Name}},

I've reached out a few times without connecting, so I'll take that as a timing signal and step back.

If reducing revenue leakage lands on your priority list—at budget season, after a payer contract renewal, or when the next aging report raises questions—I'm one email away, and a second opinion costs you nothing.

Wishing your team a strong close to the quarter.

Best,
Abel`,
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
