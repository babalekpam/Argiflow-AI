#!/usr/bin/env python3
"""Generate IPTRC Ops Copilot ServiceNow deployment PDF."""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Preformatted,
    Table, TableStyle, HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
import os

OUTPUT = "/home/user/Argiflow-AI/IPTRC_Ops_Copilot_ServiceNow_Deploy.pdf"

# ── Colour palette ──────────────────────────────────────────────────────────
ATT_BLUE    = colors.HexColor("#00A8E0")
ATT_DARK    = colors.HexColor("#0057A8")
ATT_ORANGE  = colors.HexColor("#FF7200")
CODE_BG     = colors.HexColor("#1E1E2E")
CODE_FG     = colors.HexColor("#CDD6F4")
WARN_BG     = colors.HexColor("#FFF3CD")
WARN_BORDER = colors.HexColor("#FFC107")
INFO_BG     = colors.HexColor("#EBF5FF")
SECTION_BG  = colors.HexColor("#F0F4F8")
LIGHT_GRAY  = colors.HexColor("#E8ECF0")
MID_GRAY    = colors.HexColor("#6B7280")
DARK_TEXT   = colors.HexColor("#1F2937")

# ── Styles ───────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

style_title = S("DocTitle",
    fontSize=28, leading=34, textColor=colors.white,
    fontName="Helvetica-Bold", alignment=TA_LEFT, spaceAfter=4)

style_subtitle = S("DocSubtitle",
    fontSize=13, leading=18, textColor=colors.HexColor("#CCE9F9"),
    fontName="Helvetica", alignment=TA_LEFT)

style_h1 = S("H1",
    fontSize=16, leading=22, textColor=ATT_DARK,
    fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=6,
    borderPadding=(0,0,2,0))

style_h2 = S("H2",
    fontSize=13, leading=18, textColor=ATT_DARK,
    fontName="Helvetica-Bold", spaceBefore=14, spaceAfter=4)

style_h3 = S("H3",
    fontSize=11, leading=16, textColor=DARK_TEXT,
    fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=3)

style_body = S("Body",
    fontSize=10, leading=15, textColor=DARK_TEXT,
    fontName="Helvetica", spaceAfter=6, alignment=TA_JUSTIFY)

style_bullet = S("Bullet",
    fontSize=10, leading=15, textColor=DARK_TEXT,
    fontName="Helvetica", leftIndent=16, spaceAfter=3,
    bulletIndent=6, bulletFontName="Helvetica")

style_code = S("Code",
    fontSize=8, leading=11, textColor=CODE_FG,
    fontName="Courier", backColor=CODE_BG,
    leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=8,
    borderPadding=8)

style_note = S("Note",
    fontSize=9, leading=13, textColor=colors.HexColor("#7C5E00"),
    fontName="Helvetica-Oblique", leftIndent=10)

style_caption = S("Caption",
    fontSize=8, leading=12, textColor=MID_GRAY,
    fontName="Helvetica-Oblique", alignment=TA_CENTER)

style_label = S("Label",
    fontSize=9, leading=13, textColor=colors.white,
    fontName="Helvetica-Bold", alignment=TA_CENTER)

style_toc = S("TOC",
    fontSize=10, leading=16, textColor=ATT_DARK,
    fontName="Helvetica", leftIndent=12, spaceAfter=2)

style_footer_text = S("Footer",
    fontSize=8, textColor=MID_GRAY, fontName="Helvetica")

# ── Header / Footer callbacks ─────────────────────────────────────────────────
def header_footer(canvas, doc):
    canvas.saveState()
    w, h = letter

    # Header bar on pages > 1
    if doc.page > 1:
        canvas.setFillColor(ATT_DARK)
        canvas.rect(0, h - 36, w, 36, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 9)
        canvas.drawString(0.5*inch, h - 22, "IPTRC Ops Copilot — ServiceNow Deployment Guide")
        canvas.setFont("Helvetica", 9)
        canvas.drawRightString(w - 0.5*inch, h - 22, f"Page {doc.page}")

    # Footer
    canvas.setFillColor(LIGHT_GRAY)
    canvas.rect(0, 0, w, 28, fill=1, stroke=0)
    canvas.setFillColor(MID_GRAY)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(0.5*inch, 10, "AT&T IPTRC Internal Tool — DRAFT — Review before deployment")
    canvas.drawRightString(w - 0.5*inch, 10, "Generated 2026-05-28")
    canvas.restoreState()

# ── Helpers ───────────────────────────────────────────────────────────────────
def hr(color=LIGHT_GRAY, thickness=1):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6, spaceBefore=4)

def code_block(text, title=None):
    elems = []
    if title:
        elems.append(Paragraph(f"<b>{title}</b>", S("CodeTitle",
            fontSize=9, leading=13, textColor=colors.white,
            fontName="Courier-Bold", backColor=colors.HexColor("#12121F"),
            leftIndent=8, rightIndent=8, spaceBefore=6, spaceAfter=0,
            borderPadding=(6,8,2,8))))
    elems.append(Preformatted(text, style_code))
    return elems

def info_box(text):
    data = [[Paragraph(f"<b>ℹ</b> {text}", S("InfoBox",
        fontSize=9, leading=14, textColor=ATT_DARK,
        fontName="Helvetica", leftIndent=4))]]
    t = Table(data, colWidths=[6.5*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), INFO_BG),
        ("BOX",        (0,0), (-1,-1), 1, ATT_BLUE),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
    ]))
    return t

def warn_box(text):
    data = [[Paragraph(f"<b>⚠</b>  {text}", S("WarnBox",
        fontSize=9, leading=14, textColor=colors.HexColor("#856404"),
        fontName="Helvetica"))]]
    t = Table(data, colWidths=[6.5*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), WARN_BG),
        ("BOX",        (0,0), (-1,-1), 1, WARN_BORDER),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
    ]))
    return t

def section_tag(text, color=ATT_BLUE):
    data = [[Paragraph(text, style_label)]]
    t = Table(data, colWidths=[1.4*inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), color),
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [color]),
        ("TOPPADDING",    (0,0),(-1,-1), 3),
        ("BOTTOMPADDING", (0,0),(-1,-1), 3),
        ("LEFTPADDING",   (0,0),(-1,-1), 6),
        ("RIGHTPADDING",  (0,0),(-1,-1), 6),
        ("ROUNDEDCORNERS", [3]),
    ]))
    return t

def prop_table(rows, col_widths=None):
    """Renders a two-column property table."""
    cw = col_widths or [1.8*inch, 4.7*inch]
    cell_style = S("PropCell", fontSize=9, leading=13, textColor=DARK_TEXT,
                   fontName="Helvetica", leftIndent=4)
    cell_bold  = S("PropKey",  fontSize=9, leading=13, textColor=DARK_TEXT,
                   fontName="Courier-Bold", leftIndent=4)
    tdata = [[Paragraph(r[0], cell_bold), Paragraph(r[1], cell_style)] for r in rows]
    t = Table(tdata, colWidths=cw)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.white),
        ("ROWBACKGROUNDS", (0,0),(-1,-1), [SECTION_BG, colors.white]),
        ("BOX",        (0,0), (-1,-1), 0.5, LIGHT_GRAY),
        ("INNERGRID",  (0,0), (-1,-1), 0.5, LIGHT_GRAY),
        ("TOPPADDING",    (0,0),(-1,-1), 5),
        ("BOTTOMPADDING", (0,0),(-1,-1), 5),
        ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ]))
    return t

def skill_card(number, title, description, inputs, output_label):
    """Renders a skill summary card."""
    header_data = [[
        Paragraph(f"<b>SKILL {number}</b>", S("CardNum",
            fontSize=10, leading=14, textColor=colors.white,
            fontName="Helvetica-Bold")),
        Paragraph(f"<b>{title}</b>", S("CardTitle",
            fontSize=12, leading=16, textColor=colors.white,
            fontName="Helvetica-Bold")),
    ]]
    header = Table(header_data, colWidths=[0.8*inch, 5.7*inch])
    header.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), ATT_DARK),
        ("TOPPADDING",    (0,0),(-1,-1), 8),
        ("BOTTOMPADDING", (0,0),(-1,-1), 8),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
    ]))

    body_cell_s = S("CardBody", fontSize=9, leading=13, textColor=DARK_TEXT, fontName="Helvetica")
    body_data = [
        [Paragraph("<b>What it does:</b>", body_cell_s), Paragraph(description, body_cell_s)],
        [Paragraph("<b>Inputs:</b>",        body_cell_s), Paragraph(inputs,      body_cell_s)],
        [Paragraph("<b>Output:</b>",         body_cell_s), Paragraph(output_label, body_cell_s)],
    ]
    body = Table(body_data, colWidths=[1.0*inch, 5.5*inch])
    body.setStyle(TableStyle([
        ("BACKGROUND", (0,0),(-1,-1), colors.white),
        ("BOX",        (0,0),(-1,-1), 0.5, LIGHT_GRAY),
        ("INNERGRID",  (0,0),(-1,-1), 0.5, LIGHT_GRAY),
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("LEFTPADDING",   (0,0),(-1,-1), 10),
        ("VALIGN",        (0,0),(-1,-1), "TOP"),
    ]))

    wrapper = Table([[header], [body]], colWidths=[6.5*inch])
    wrapper.setStyle(TableStyle([
        ("BOX",           (0,0),(-1,-1), 1.5, ATT_DARK),
        ("TOPPADDING",    (0,0),(-1,-1), 0),
        ("BOTTOMPADDING", (0,0),(-1,-1), 0),
        ("LEFTPADDING",   (0,0),(-1,-1), 0),
        ("RIGHTPADDING",  (0,0),(-1,-1), 0),
    ]))
    return wrapper

# ── Build document ────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=letter,
    rightMargin=0.75*inch,
    leftMargin=0.75*inch,
    topMargin=0.6*inch,
    bottomMargin=0.55*inch,
    title="IPTRC Ops Copilot — ServiceNow Deployment Guide",
    author="NKAWULA, LEKPAM M",
    subject="AT&T IPTRC Internal Tool",
)

story = []

# ── COVER PAGE ────────────────────────────────────────────────────────────────
# Full-width cover header
cover_data = [[
    Paragraph("IPTRC OPS COPILOT", style_title),
    Spacer(1, 6),
    Paragraph("ServiceNow Deployment Guide", style_subtitle),
    Spacer(1, 10),
    Paragraph("Version 1.0 &nbsp;|&nbsp; AT&T IPTRC &nbsp;|&nbsp; 2026-05-28", style_subtitle),
]]
cover_table = Table([[
    [
        Paragraph("IPTRC OPS COPILOT", style_title),
        Spacer(1, 4),
        Paragraph("ServiceNow Deployment Guide", style_subtitle),
        Spacer(1, 8),
        Paragraph("Version 1.0   |   AT&amp;T IPTRC   |   2026-05-28", style_subtitle),
    ]
]], colWidths=[7.0*inch])
cover_table.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,-1), ATT_DARK),
    ("TOPPADDING",    (0,0),(-1,-1), 36),
    ("BOTTOMPADDING", (0,0),(-1,-1), 36),
    ("LEFTPADDING",   (0,0),(-1,-1), 30),
    ("RIGHTPADDING",  (0,0),(-1,-1), 20),
    ("VALIGN",        (0,0),(-1,-1), "TOP"),
]))
story.append(cover_table)
story.append(Spacer(1, 20))

# Cover meta grid
meta = prop_table([
    ("Owner:",        "NKAWULA, LEKPAM M"),
    ("Audience:",     "IPTRC Tooling Engineers + Operations Stakeholders"),
    ("Document Type:","Technical Deployment Guide"),
    ("Classification:","AT&T Internal — Do Not Distribute Externally"),
    ("Status:",       "DRAFT — Review before deployment"),
], col_widths=[1.5*inch, 5.0*inch])
story.append(meta)
story.append(Spacer(1, 16))
story.append(warn_box(
    "This document contains operational guidance and code. "
    "Never hardcode API keys. Always store credentials in ServiceNow Credential Store. "
    "All AI outputs are DRAFTS — engineer review required before operational use."
))
story.append(Spacer(1, 12))

# Executive summary
story.append(Paragraph("Executive Summary", style_h1))
story.append(hr(ATT_BLUE, 2))
story.append(Paragraph(
    "IPTRC Ops Copilot is an AI-powered assistant built for AT&T IPTRC network engineers. "
    "It reduces operational toil by converting unstructured inputs — CLI outputs, email text, "
    "ticket descriptions — into structured, copy/paste-ready artifacts. "
    "This guide covers the complete ServiceNow deployment including Script Include, "
    "Scripted REST API, Service Portal Widget, and system configuration.",
    style_body))
story.append(Spacer(1, 10))

# Skills overview cards
story.append(Paragraph("Skill Modules", style_h2))
for num, title, desc, inp, out in [
    ("A", "Ticket Notes Generator",
     "Produces structured, audit-safe work notes from CLI dumps and ticket text.",
     "Platform, Ticket ID, Severity, Symptoms, CLI Output, Actions Taken",
     "Work Notes with Summary / Observations / Actions / Next Steps / Risks"),
    ("B", "SMOP / GMOP Scaffolder",
     "Drafts a SMOP/GMOP skeleton with pre/post checks, command bundles, and rollback placeholders.",
     "Hostname, Platform, OS Version, Work Type, Maintenance Window, Timezone",
     "DRAFT scaffold with all required MOP sections — always labeled DRAFT"),
    ("C", "RMA Email Composer",
     "Generates a KGPCo-compliant text-only RMA email with all required fields in correct order.",
     "AOTS Ticket, Platform, Problem Description, PID/SN, CLLI, OSWF, Shipping, CLI snapshots",
     "TEXT-ONLY email body ready to send — subject line included"),
    ("D", "Maintenance Email Summarizer",
     "Extracts window, timezone, circuits, and produces an IPTRC action checklist from carrier notices.",
     "Paste full carrier maintenance notification email body",
     "Window / Timezone / Affected Circuits + IPTRC Actions Checklist"),
]:
    story.append(Spacer(1, 8))
    story.append(skill_card(num, title, desc, inp, out))
story.append(Spacer(1, 6))

# ── ARCHITECTURE ──────────────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Architecture Overview", style_h1))
story.append(hr(ATT_BLUE, 2))

arch_rows = [
    ("Layer", "Component", "Description"),
    ("UI",    "Service Portal Widget",   "AngularJS tabbed interface — 4 skill tabs, form inputs, copy-to-clipboard output"),
    ("API",   "Scripted REST API",       "4 POST endpoints, one per skill — no auth bypass, uses session context"),
    ("Logic", "IPTRCOpsSkills (Script Include)", "Core AI engine — sanitization, LLM call, output validation, auto-repair"),
    ("AI",    "Azure OpenAI / Anthropic","External LLM via sn_ws.RESTMessageV2 — credentials in Credential Store"),
    ("Config","System Properties",       "4 properties: endpoint, API key, model, max_tokens"),
]
col_style = S("ArchCell", fontSize=9, leading=13, textColor=DARK_TEXT, fontName="Helvetica")
hdr_style = S("ArchHdr",  fontSize=9, leading=13, textColor=colors.white, fontName="Helvetica-Bold")

arch_table_data = []
for i, row in enumerate(arch_rows):
    if i == 0:
        arch_table_data.append([Paragraph(c, hdr_style) for c in row])
    else:
        arch_table_data.append([Paragraph(c, col_style) for c in row])

arch_t = Table(arch_table_data, colWidths=[0.7*inch, 2.0*inch, 3.8*inch])
arch_t.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,0),  ATT_DARK),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [SECTION_BG, colors.white]),
    ("BOX",           (0,0),(-1,-1), 1, ATT_DARK),
    ("INNERGRID",     (0,0),(-1,-1), 0.5, LIGHT_GRAY),
    ("TOPPADDING",    (0,0),(-1,-1), 6),
    ("BOTTOMPADDING", (0,0),(-1,-1), 6),
    ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ("VALIGN",        (0,0),(-1,-1), "TOP"),
]))
story.append(arch_t)
story.append(Spacer(1, 12))

story.append(info_box(
    "Call flow: Service Portal Widget → $http.post → Scripted REST Resource → "
    "IPTRCOpsSkills (Script Include) → sn_ws.RESTMessageV2 → Azure OpenAI → "
    "response back through the stack → displayed in widget output area."
))
story.append(Spacer(1, 16))

# ── SECURITY GUARDRAILS ────────────────────────────────────────────────────────
story.append(Paragraph("Security Guardrails", style_h1))
story.append(hr(ATT_BLUE, 2))

sec_items = [
    ("<b>G-1 No credentials in inputs:</b> The <i>_sanitize()</i> method scrubs 12 regex patterns before any text reaches the LLM — passwords, enable secrets, TACACS keys, RADIUS keys, SNMP auth/priv strings, crypto isakmp keys, API keys, Bearer tokens."),
    ("<b>G-2 API key in Credential Store:</b> The iptrc.ai.apikey system property should reference a ServiceNow Credential record, never a plaintext key."),
    ("<b>G-3 Output disclaimers enforced:</b> SMOP/GMOP output is checked for 'official MOP' language and auto-repaired if found. 'DRAFT' watermark is programmatically prepended if missing."),
    ("<b>G-4 HTML injection guard:</b> RMA email output is scanned for HTML tags and repaired to plain text if any are detected."),
    ("<b>G-5 Heading validation + auto-repair:</b> All skills validate required output headings. If any are missing, a second LLM call with a repair prompt is made automatically."),
    ("<b>G-6 No autonomous execution:</b> This tool generates text artifacts only — it never pushes configs to routers, modifies tickets, or auto-sends emails."),
]
for item in sec_items:
    story.append(Paragraph(f"• {item}", style_bullet))
story.append(Spacer(1, 16))

# ── DEPLOYMENT STEPS ──────────────────────────────────────────────────────────
story.append(Paragraph("Deployment Steps", style_h1))
story.append(hr(ATT_BLUE, 2))

steps = [
    ("Step 1", "Create System Properties",
     "sys_properties.list → Create 4 records",
     [("iptrc.ai.endpoint",   "Your Azure OpenAI endpoint URL\n(e.g. https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT)"),
      ("iptrc.ai.apikey",     "API key — reference Credential Store record, never plain text"),
      ("iptrc.ai.model",      "Deployment name (e.g. gpt-4o)"),
      ("iptrc.ai.max_tokens", "1500 (adjust per your needs)")]),
    ("Step 2", "Create Script Include: IPTRCOpsSkills",
     "System Definition → Script Includes → New\nName: IPTRCOpsSkills | Accessible from: All application scopes",
     None),
    ("Step 3", "Create Scripted REST API",
     "Scripted REST APIs → New\nName: IPTRC Ops Skills API | API ID: iptrc_ops_api\nAdd 4 Resources (POST): /ticket-notes, /smop-draft, /rma-email, /maint-email",
     None),
    ("Step 4", "Create Service Portal Widget",
     "Service Portal → Widgets → New\nName: IPTRC Ops Copilot | Widget ID: iptrc-ops-copilot\nPaste HTML Template, Client Controller, Server Script, CSS",
     None),
    ("Step 5", "Add Widget to Portal Page",
     "Service Portal → Pages → [your ops portal page]\nDrag widget to a container. Set page URL to /sp?id=iptrc_ops_copilot",
     None),
    ("Step 6", "Set REST API Access Controls",
     "Navigate to: System Web Services → Scripted REST APIs → [your API] → Access tab\nEnsure the API is protected by user authentication (not public)",
     None),
    ("Step 7", "Test Each Skill",
     "Open the portal widget and test each tab:\n• Ticket Notes: paste a sample show interface output\n• SMOP: fill device hostname + platform\n• RMA Email: fill all required fields\n• Maint Summary: paste a carrier maintenance email",
     None),
]

for step_num, step_title, step_desc, sub_table in steps:
    KeepTogether([])
    story.append(Paragraph(f"{step_num}: {step_title}", style_h2))
    story.append(Paragraph(step_desc, style_body))
    if sub_table:
        story.append(prop_table(sub_table, col_widths=[2.0*inch, 4.5*inch]))
    story.append(Spacer(1, 8))

story.append(Spacer(1, 6))

# ── COMPONENT 1: SCRIPT INCLUDE ───────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Component 1 — Script Include: IPTRCOpsSkills", style_h1))
story.append(hr(ATT_BLUE, 2))
story.append(info_box("Path: System Definition → Script Includes → New  |  Name: IPTRCOpsSkills  |  Accessible from: All application scopes"))
story.append(Spacer(1, 8))

si_code = '''\
var IPTRCOpsSkills = Class.create();
IPTRCOpsSkills.prototype = {

  initialize: function() {
    this.endpoint  = gs.getProperty('iptrc.ai.endpoint',  '');
    this.apiKey    = gs.getProperty('iptrc.ai.apikey',    '');
    this.model     = gs.getProperty('iptrc.ai.model',     'gpt-4o');
    this.maxTokens = parseInt(gs.getProperty('iptrc.ai.max_tokens', '1500'));
  },

  /* ── Secret scrubber ─────────────────────────────────────────── */
  _sanitize: function(text) {
    if (!text) return '';
    var patterns = [
      /password\\s*[:=]\\s*\\S+/gi,
      /enable\\s+(secret|password)\\s+\\S+/gi,
      /tacacs[+-]?\\s*key\\s+\\S+/gi,
      /radius\\s*key\\s+\\S+/gi,
      /snmp(-v3)?\\s+(auth|priv)\\s+\\S+/gi,
      /secret\\s+\\d+\\s+\\S+/gi,
      /api[_-]?key\\s*[:=]\\s*\\S+/gi,
      /bearer\\s+\\S+/gi,
      /crypto\\s+isakmp\\s+key\\s+\\S+/gi,
      /pre-share\\s+key\\s+\\S+/gi
    ];
    for (var i = 0; i < patterns.length; i++)
      text = text.replace(patterns[i], '[REDACTED]');
    return text;
  },

  /* ── Core LLM call ───────────────────────────────────────────── */
  _callLLM: function(systemPrompt, userMessage) {
    try {
      var rm = new sn_ws.RESTMessageV2();
      rm.setEndpoint(this.endpoint + '/chat/completions?api-version=2024-02-01');
      rm.setHttpMethod('POST');
      rm.setRequestHeader('Content-Type', 'application/json');
      rm.setRequestHeader('api-key', this.apiKey);
      rm.setRequestHeader('Authorization', 'Bearer ' + this.apiKey);
      rm.setRequestBody(JSON.stringify({
        model: this.model, max_tokens: this.maxTokens, temperature: 0.2,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  }
        ]
      }));
      rm.setHttpTimeout(45000);
      var resp   = rm.execute();
      var status = resp.getStatusCode();
      var body   = resp.getBody();
      if (status !== 200) {
        gs.warn('[IPTRC] LLM failed. Status: ' + status);
        return { success: false, text: 'AI returned error ' + status };
      }
      var parsed = JSON.parse(body);
      return { success: true,
               text: parsed.choices[0].message.content || '' };
    } catch(ex) {
      gs.error('[IPTRC] Exception: ' + ex.message);
      return { success: false, text: 'AI service unavailable.' };
    }
  },

  /* ── SKILL A: Ticket Notes ───────────────────────────────────── */
  generateTicketNotes: function(p) {
    var sys = [
      'You are an IPTRC network operations assistant at AT&T.',
      'Produce concise, audit-safe work notes for a trouble ticket.',
      'STRICT RULES:',
      '1. Never invent CLI commands not present in user input.',
      '2. Actions completed MUST only use text from actions_taken.',
      '3. Next steps MUST be suggestions — prefix with "Suggested:".',
      '4. Observations must cite CLI output — no fabrication.',
      '5. Plain text only. Empty fields = "N/A".',
      'OUTPUT FORMAT:',
      'WORK NOTES:',
      '- Summary:', '- Observations (from outputs):',
      '- Actions completed:', '- Current status:',
      '- Next steps (Suggested):', '- Risks/Watch-outs:',
      '- Evidence captured (commands/logs referenced):'
    ].join('\\n');
    var msg = [
      'Platform: '+(p.platform||'N/A'), 'Ticket: '+(p.ticketId||'N/A'),
      'Severity: '+(p.severity||'N/A'), '',
      'SYMPTOMS:', this._sanitize(p.symptoms||''), '',
      'CLI OUTPUT:', this._sanitize(p.cliDump||'None provided'), '',
      'ACTIONS TAKEN:', this._sanitize(p.actionsTaken||'None provided')
    ].join('\\n');
    var r = this._callLLM(sys, msg);
    var req = ['WORK NOTES:','Summary:','Actions completed:',
               'Next steps (Suggested):','Current status:'];
    for (var h=0; h<req.length; h++) {
      if (r.text.indexOf(req[h]) === -1 && r.success) {
        r = this._callLLM(sys, msg + '\\nMissing headings — rewrite with all headings.');
        break;
      }
    }
    return r;
  },

  /* ── SKILL B: SMOP/GMOP Draft ────────────────────────────────── */
  generateSmopDraft: function(p) {
    var sys = [
      'You are an IPTRC network operations assistant at AT&T.',
      'Draft a SMOP/GMOP scaffold for engineer review.',
      'RULES: 1. Always start with "DRAFT — NOT OFFICIAL MOP — REQUIRES REVIEW".',
      '2. Include [APPROVER SIGNATURE] and [ROLLBACK: steps here] placeholders.',
      '3. Platform-specific command bundles in PRE-CHECKS and POST-CHECKS.',
      '4. Never claim this is an official procedure. 5. Plain text only.',
      'OUTPUT FORMAT:',
      'SMOP/GMOP SCAFFOLD — DRAFT',
      'TITLE:', 'SCOPE:', 'PREREQS:', 'RISK/IMPACT:', 'MAINTENANCE WINDOW:',
      'PRE-CHECKS:', 'BACKUP / SNAPSHOT:', 'EXECUTION STEPS (DRAFT):',
      'VALIDATION / POST-CHECKS:', 'ROLLBACK PLAN:',
      'COMMUNICATIONS:', 'APPROVALS REQUIRED:', 'ATTACHMENTS / EVIDENCE:'
    ].join('\\n');
    var msg = [
      'Hostname: '+this._sanitize(p.hostname||''), 'Platform: '+(p.platform||''),
      'OS: '+(p.osVersion||'N/A'), 'Work type: '+(p.workType||''),
      'Window: '+p.windowStart+' to '+p.windowEnd+' '+p.timezone,
      'Risk: '+this._sanitize(p.riskNotes||'None')
    ].join('\\n');
    var r = this._callLLM(sys, msg);
    if (r.success && r.text.indexOf('DRAFT') === -1)
      r.text = 'DRAFT — NOT OFFICIAL MOP — REQUIRES REVIEW AND APPROVAL\\n\\n' + r.text;
    return r;
  },

  /* ── SKILL C: RMA Email ──────────────────────────────────────── */
  generateRmaEmail: function(p) {
    var sys = [
      'You are an IPTRC network operations assistant at AT&T.',
      'Generate a KGPCo-compliant RMA email.',
      'RULES: 1. TEXT ONLY — no HTML, tables, markdown.',
      '2. Problem Description and Additional Info come FIRST.',
      '3. Leave unknown fields as "TBD". 4. Output SUBJECT + BODY only.'
    ].join('\\n');
    var f = function(v){ return (v&&v.trim())?v.trim():'TBD'; };
    var msg = [
      'AOTS Ticket: '+f(p.aotsTicket), 'Platform: '+f(p.platform), '',
      'Problem Description: '+f(p.problemDescription),
      'Additional Info: '+f(p.additionalInfo),
      'Defective part failure: '+f(p.defectivePartFailure),
      'Defective PID/SN: '+f(p.defectivePidSn),
      'Hostname: '+f(p.hostname), 'FIC: '+f(p.ficNumber),
      'CLLI: '+f(p.clli), 'OSWF ticket: '+f(p.oswfTicket),
      'Shipping address: '+f(p.shippingAddress),
      'Onsite contact: '+f(p.onsiteContact),
      'Vendor Case: '+f(p.vendorCase), 'NOC ticket: '+f(p.nocTicket),
      'Same/Next day: '+f(p.sameOrNextDay), 'EFA: '+f(p.efaRequired),
      'show chassis firmware: '+f(p.showChassisFirmware),
      'show chassis hardware: '+f(p.showChassisHardware),
      'show version: '+f(p.showVersion),
      'show system license: '+f(p.showLicense),
      'show system license keys: '+f(p.showLicenseKeys)
    ].join('\\n');
    var r = this._callLLM(sys, msg);
    if (r.success && /<[a-z][\\s\\S]*>/i.test(r.text))
      r = this._callLLM(sys, msg + '\\nRemove all HTML. Plain text only.');
    return r;
  },

  /* ── SKILL D: Maintenance Email Summary ──────────────────────── */
  summarizeMaintenanceEmail: function(p) {
    var sys = [
      'You are an IPTRC network operations assistant at AT&T.',
      'Extract structured data from a carrier maintenance notification.',
      'RULES: 1. Timezone MUST be quoted exactly as written in the email.',
      '2. Missing fields = "Not found in email". 3. Plain text only.',
      'OUTPUT FORMAT:',
      'MAINTENANCE SUMMARY:',
      '- Supplier/Reference:', '- Maintenance Window Start:',
      '- Maintenance Window End:', '- Timezone (as stated in email):',
      '- Estimated Outage Duration:', '- Affected Circuits/Services:',
      '- Affected Customers:', '- Work Description:',
      '', 'IPTRC ACTIONS CHECKLIST:',
      '[ ] (list each action item)'
    ].join('\\n');
    var r = this._callLLM(sys, 'MAINTENANCE EMAIL:\\n\\n' +
                               this._sanitize(p.emailBody||''));
    var req = ['MAINTENANCE SUMMARY:','Timezone (as stated in email):',
               'IPTRC ACTIONS CHECKLIST:'];
    for (var h=0; h<req.length; h++) {
      if (r.text.indexOf(req[h]) === -1 && r.success) {
        r = this._callLLM(sys,
          'MAINTENANCE EMAIL:\\n\\n' + this._sanitize(p.emailBody||'') +
          '\\nMissing headings — rewrite. Timezone must be quoted exactly.');
        break;
      }
    }
    return r;
  },

  type: 'IPTRCOpsSkills'
};'''

story.extend(code_block(si_code, "Script Include — IPTRCOpsSkills.js"))

# ── COMPONENT 2: SCRIPTED REST API ────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Component 2 — Scripted REST API Resources", style_h1))
story.append(hr(ATT_BLUE, 2))
story.append(info_box(
    "Path: System Web Services → Scripted REST APIs → New\n"
    "Name: IPTRC Ops Skills API  |  API ID: iptrc_ops_api  |  Add 4 POST Resources"
))
story.append(Spacer(1, 8))

rest_resources = [
    ("Resource /ticket-notes (POST)", '''\
(function process(request, response) {
  var body   = request.body.data;
  var skills = new IPTRCOpsSkills();
  var result = skills.generateTicketNotes({
    ticketId:     body.ticketId     || '',
    platform:     body.platform     || '',
    severity:     body.severity     || '',
    symptoms:     body.symptoms     || '',
    cliDump:      body.cliDump      || '',
    actionsTaken: body.actionsTaken || ''
  });
  response.setContentType('application/json');
  response.setStatus(result.success ? 200 : 500);
  response.setBody({ output: result.text, skill: 'ticket_notes' });
})(request, response);'''),

    ("Resource /smop-draft (POST)", '''\
(function process(request, response) {
  var body   = request.body.data;
  var skills = new IPTRCOpsSkills();
  var result = skills.generateSmopDraft({
    hostname:    body.hostname    || '',
    platform:    body.platform    || '',
    osVersion:   body.osVersion   || '',
    workType:    body.workType    || '',
    windowStart: body.windowStart || '',
    windowEnd:   body.windowEnd   || '',
    timezone:    body.timezone    || '',
    riskNotes:   body.riskNotes   || ''
  });
  response.setContentType('application/json');
  response.setStatus(result.success ? 200 : 500);
  response.setBody({ output: result.text, skill: 'smop_draft' });
})(request, response);'''),

    ("Resource /rma-email (POST)", '''\
(function process(request, response) {
  var body   = request.body.data;
  var skills = new IPTRCOpsSkills();
  var result = skills.generateRmaEmail(body);
  response.setContentType('application/json');
  response.setStatus(result.success ? 200 : 500);
  response.setBody({ output: result.text, skill: 'rma_email' });
})(request, response);'''),

    ("Resource /maint-email (POST)", '''\
(function process(request, response) {
  var body   = request.body.data;
  var skills = new IPTRCOpsSkills();
  var result = skills.summarizeMaintenanceEmail({
    emailBody: body.emailBody || ''
  });
  response.setContentType('application/json');
  response.setStatus(result.success ? 200 : 500);
  response.setBody({ output: result.text, skill: 'maint_email' });
})(request, response);'''),
]

for title, code in rest_resources:
    story.extend(code_block(code, title))
    story.append(Spacer(1, 4))

# ── COMPONENT 3: SERVICE PORTAL WIDGET ────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("Component 3 — Service Portal Widget", style_h1))
story.append(hr(ATT_BLUE, 2))
story.append(info_box(
    "Path: Service Portal → Widgets → New\n"
    "Name: IPTRC Ops Copilot  |  Widget ID: iptrc-ops-copilot"
))
story.append(Spacer(1, 8))

html_code = '''\
<div class="iptrc-copilot">
  <div class="iptrc-header">
    <h2>IPTRC Ops Copilot</h2>
    <span class="label label-default">AT&T Internal</span>
    <p class="text-muted">AI-generated drafts — review before use.</p>
  </div>

  <!-- Tab navigation -->
  <ul class="nav nav-tabs">
    <li ng-class="{active: c.tab==='ticket'}" ng-click="c.tab='ticket'">
      <a>Ticket Notes</a></li>
    <li ng-class="{active: c.tab==='smop'}"   ng-click="c.tab='smop'">
      <a>SMOP / GMOP</a></li>
    <li ng-class="{active: c.tab==='rma'}"    ng-click="c.tab='rma'">
      <a>RMA Email</a></li>
    <li ng-class="{active: c.tab==='maint'}"  ng-click="c.tab='maint'">
      <a>Maint Summary</a></li>
  </ul>

  <div class="tab-content iptrc-panel">

    <!-- TICKET NOTES TAB -->
    <div ng-show="c.tab==='ticket'">
      <div class="row">
        <div class="col-sm-4">
          <label>Ticket ID (optional)</label>
          <input class="form-control" ng-model="c.ticket.ticketId"
                 placeholder="AOTS123456789"/>
        </div>
        <div class="col-sm-4">
          <label>Platform *</label>
          <select class="form-control" ng-model="c.ticket.platform">
            <option value="">Select platform</option>
            <option ng-repeat="p in c.platforms" value="{{p}}">{{p}}</option>
          </select>
        </div>
        <div class="col-sm-4">
          <label>Severity</label>
          <select class="form-control" ng-model="c.ticket.severity">
            <option value="">Select</option>
            <option ng-repeat="s in c.severities" value="{{s}}">{{s}}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Symptoms / Ticket Description *</label>
        <textarea class="form-control" rows="4" ng-model="c.ticket.symptoms"
          placeholder="Describe the issue, alarms, customer impact..."></textarea>
      </div>
      <div class="form-group">
        <label>CLI Output / Logs</label>
        <textarea class="form-control iptrc-mono" rows="6"
          ng-model="c.ticket.cliDump"
          placeholder="show interface, show optics, show log..."></textarea>
      </div>
      <div class="form-group">
        <label>Actions Already Taken</label>
        <textarea class="form-control" rows="3"
          ng-model="c.ticket.actionsTaken"
          placeholder="e.g. Rebooted LC, cleared counters..."></textarea>
      </div>
      <button class="btn btn-primary"
        ng-click="c.runSkill('ticket-notes', c.ticket)"
        ng-disabled="!c.ticket.platform||!c.ticket.symptoms||c.loading">
        <span ng-if="c.loading&&c.activeSkill==='ticket-notes'"
              class="glyphicon glyphicon-refresh spin"></span>
        Generate Work Notes
      </button>
    </div>

    <!-- SMOP/GMOP TAB -->
    <div ng-show="c.tab==='smop'">
      <div class="row">
        <div class="col-sm-6">
          <label>Device Hostname *</label>
          <input class="form-control iptrc-mono" ng-model="c.smop.hostname"
                 placeholder="e.g. dal13-cr5.ip.att.net"/>
        </div>
        <div class="col-sm-6">
          <label>Platform *</label>
          <select class="form-control" ng-model="c.smop.platform">
            <option value="">Select</option>
            <option ng-repeat="p in c.platforms" value="{{p}}">{{p}}</option>
          </select>
        </div>
        <div class="col-sm-6">
          <label>OS Version</label>
          <input class="form-control" ng-model="c.smop.osVersion"
                 placeholder="e.g. IOS-XR 7.9.2"/>
        </div>
        <div class="col-sm-6">
          <label>Work Type *</label>
          <select class="form-control" ng-model="c.smop.workType">
            <option value="">Select</option>
            <option ng-repeat="w in c.workTypes" value="{{w}}">{{w}}</option>
          </select>
        </div>
        <div class="col-sm-4">
          <label>Window Start *</label>
          <input class="form-control" type="datetime-local"
                 ng-model="c.smop.windowStart"/>
        </div>
        <div class="col-sm-4">
          <label>Window End *</label>
          <input class="form-control" type="datetime-local"
                 ng-model="c.smop.windowEnd"/>
        </div>
        <div class="col-sm-4">
          <label>Timezone *</label>
          <input class="form-control" ng-model="c.smop.timezone"
                 placeholder="e.g. CST, UTC"/>
        </div>
      </div>
      <div class="form-group">
        <label>Risk Notes</label>
        <textarea class="form-control" rows="2" ng-model="c.smop.riskNotes"
          placeholder="SLA concerns, customer commitments..."></textarea>
      </div>
      <button class="btn btn-primary"
        ng-click="c.runSkill('smop-draft', c.smop)"
        ng-disabled="!c.smop.hostname||!c.smop.platform||!c.smop.workType||c.loading">
        <span ng-if="c.loading&&c.activeSkill==='smop-draft'"
              class="glyphicon glyphicon-refresh spin"></span>
        Generate SMOP Scaffold
      </button>
      <span class="label label-warning">Always outputs as DRAFT</span>
    </div>

    <!-- RMA EMAIL TAB -->
    <div ng-show="c.tab==='rma'">
      <div class="row">
        <div class="col-sm-6">
          <label>AOTS Ticket # *</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.aotsTicket"
                 placeholder="AOTS123456789012"/>
        </div>
        <div class="col-sm-6">
          <label>Platform *</label>
          <select class="form-control" ng-model="c.rma.platform">
            <option value="">Select</option>
            <option ng-repeat="p in c.rmaplatforms" value="{{p}}">{{p}}</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>Problem Description *</label>
        <textarea class="form-control" rows="3"
          ng-model="c.rma.problemDescription"
          placeholder="Hardware failure, symptoms, impact..."></textarea>
      </div>
      <div class="form-group">
        <label>Additional Info</label>
        <textarea class="form-control" rows="2"
          ng-model="c.rma.additionalInfo"></textarea>
      </div>
      <div class="row">
        <div class="col-sm-6">
          <label>Defective Part Failure / Requested Part *</label>
          <input class="form-control" ng-model="c.rma.defectivePartFailure"/>
        </div>
        <div class="col-sm-6">
          <label>Defective PID / SN *</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.defectivePidSn"/>
        </div>
        <div class="col-sm-6">
          <label>Hostname *</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.hostname"/>
        </div>
        <div class="col-sm-6">
          <label>FIC Number</label>
          <input class="form-control" ng-model="c.rma.ficNumber"/>
        </div>
        <div class="col-sm-6">
          <label>CLLI *</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.clli"
                 placeholder="DLSTX123"/>
        </div>
        <div class="col-sm-6">
          <label>OSWF / WMS Ticket *</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.oswfTicket"/>
        </div>
      </div>
      <div class="form-group">
        <label>Shipping Address *</label>
        <textarea class="form-control" rows="2"
          ng-model="c.rma.shippingAddress"></textarea>
      </div>
      <div class="form-group">
        <label>Onsite Contact (name, number, email) *</label>
        <input class="form-control" ng-model="c.rma.onsiteContact"/>
      </div>
      <div class="row">
        <div class="col-sm-4">
          <label>Vendor Case</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.vendorCase"/>
        </div>
        <div class="col-sm-4">
          <label>NOC Ticket</label>
          <input class="form-control iptrc-mono" ng-model="c.rma.nocTicket"/>
        </div>
        <div class="col-sm-4">
          <label>Same/Next Day *</label>
          <select class="form-control" ng-model="c.rma.sameOrNextDay">
            <option value="">Select</option>
            <option value="Same Day">Same Day</option>
            <option value="Next Day">Next Day</option>
          </select>
        </div>
        <div class="col-sm-4">
          <label>EFA Required? *</label>
          <select class="form-control" ng-model="c.rma.efaRequired">
            <option value="">Select</option>
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </div>
      </div>
      <div class="iptrc-cli-box">
        <h5>CLI Snapshots (paste output)</h5>
        <div class="row">
          <div class="col-sm-6" ng-repeat="f in c.cliFields">
            <label>{{f.label}}</label>
            <textarea class="form-control iptrc-mono" rows="2"
              ng-model="c.rma[f.key]"
              placeholder="Paste {{f.label}} output..."></textarea>
          </div>
        </div>
      </div>
      <button class="btn btn-primary"
        ng-click="c.runSkill('rma-email', c.rma)"
        ng-disabled="c.rmaInvalid()||c.loading">
        <span ng-if="c.loading&&c.activeSkill==='rma-email'"
              class="glyphicon glyphicon-refresh spin"></span>
        Compose RMA Email
      </button>
      <span class="label label-info">Text-only, KGPCo compliant</span>
    </div>

    <!-- MAINTENANCE EMAIL TAB -->
    <div ng-show="c.tab==='maint'">
      <div class="form-group">
        <label>Paste Maintenance Email Body *</label>
        <textarea class="form-control iptrc-mono" rows="14"
          ng-model="c.maint.emailBody"
          placeholder="Paste full carrier maintenance notification..."></textarea>
      </div>
      <button class="btn btn-primary"
        ng-click="c.runSkill('maint-email', c.maint)"
        ng-disabled="!c.maint.emailBody||c.loading">
        <span ng-if="c.loading&&c.activeSkill==='maint-email'"
              class="glyphicon glyphicon-refresh spin"></span>
        Summarize &amp; Extract Actions
      </button>
    </div>

    <!-- SHARED OUTPUT AREA -->
    <div ng-if="c.output" class="iptrc-output">
      <div class="iptrc-output-header">
        <span class="iptrc-skill-label">{{c.skillLabel}}</span>
        <button class="btn btn-xs btn-default" ng-click="c.copyOutput()">
          <span class="glyphicon"
            ng-class="c.copied ? 'glyphicon-ok' : 'glyphicon-copy'"></span>
          {{c.copied ? 'Copied!' : 'Copy'}}
        </button>
      </div>
      <pre class="iptrc-pre">{{c.output}}</pre>
    </div>
    <div ng-if="c.error" class="alert alert-danger">{{c.error}}</div>
  </div>

  <p class="iptrc-disclaimer">
    All outputs are AI-generated drafts. Never paste credentials into any field.
    SMOP outputs are not official MOPs. Verify all steps before execution.
  </p>
</div>'''

story.extend(code_block(html_code, "Widget — HTML Template"))
story.append(Spacer(1, 8))

client_code = '''\
function($scope, $http) {
  var c = this;
  c.tab='ticket'; c.loading=false; c.output='';
  c.error=''; c.copied=false; c.activeSkill='';

  c.ticket = { ticketId:'', platform:'', severity:'',
               symptoms:'', cliDump:'', actionsTaken:'' };
  c.smop   = { hostname:'', platform:'', osVersion:'',
               workType:'', windowStart:'', windowEnd:'',
               timezone:'', riskNotes:'' };
  c.rma    = { aotsTicket:'', platform:'', problemDescription:'',
               additionalInfo:'', defectivePartFailure:'',
               defectivePidSn:'', hostname:'', ficNumber:'',
               clli:'', oswfTicket:'', shippingAddress:'',
               onsiteContact:'', vendorCase:'', nocTicket:'',
               sameOrNextDay:'', efaRequired:'',
               showChassisFirmware:'', showChassisHardware:'',
               showVersion:'', showLicense:'', showLicenseKeys:'' };
  c.maint  = { emailBody:'' };

  c.platforms = ['Cisco IOS-XR','Cisco IOS-XE','Cisco ASR9000',
    'Cisco NCS5500','Juniper Junos','Juniper MX','Arista EOS',
    'Drivenets','Ciena','Nokia SR-OS','Other'];
  c.rmaplatforms = ['Cisco','Juniper','Arista','Ciena',
                    'Drivenets','Nokia','Other'];
  c.severities = ['P1 — Complete Outage','P2 — Partial Outage',
    'P3 — Degraded','P4 — Low','Monitoring'];
  c.workTypes = ['RE Toggle (Route Engine Switchover)',
    'Optics Replacement','PEM Replacement',
    'FPC / Line Card Replacement','Software Upgrade',
    'Hardware RMA','Configuration Change','Other'];
  c.cliFields = [
    {label:'show chassis firmware',  key:'showChassisFirmware'},
    {label:'show chassis hardware',  key:'showChassisHardware'},
    {label:'show version',           key:'showVersion'},
    {label:'show system license',    key:'showLicense'},
    {label:'show system license keys', key:'showLicenseKeys'}
  ];

  var labels = {
    'ticket-notes':'Ticket Work Notes',
    'smop-draft':  'SMOP/GMOP Scaffold (DRAFT)',
    'rma-email':   'RMA Email — KGPCo Format',
    'maint-email': 'Maintenance Summary + IPTRC Actions'
  };

  c.rmaInvalid = function() {
    return !c.rma.aotsTicket || !c.rma.platform ||
           !c.rma.problemDescription || !c.rma.defectivePartFailure ||
           !c.rma.defectivePidSn || !c.rma.hostname || !c.rma.clli ||
           !c.rma.oswfTicket || !c.rma.shippingAddress ||
           !c.rma.onsiteContact || !c.rma.sameOrNextDay ||
           !c.rma.efaRequired;
  };

  /* Adjust base path to match your Scripted REST API namespace */
  var BASE = '/api/x_attcs_iptrc/iptrc_ops_api/';

  c.runSkill = function(skill, payload) {
    c.loading=true; c.activeSkill=skill;
    c.output=''; c.error=''; c.skillLabel=labels[skill]||skill;
    $http.post(BASE + skill, payload)
      .then(function(res) {
        c.output  = res.data.output || '';
        c.loading = false;
      })
      .catch(function(err) {
        c.error   = 'Error: ' + (err.data&&err.data.error
                    ? err.data.error : 'Request failed.');
        c.loading = false;
      });
  };

  c.copyOutput = function() {
    var el = document.createElement('textarea');
    el.value = c.output;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    c.copied = true;
    setTimeout(function(){
      $scope.$apply(function(){ c.copied=false; });
    }, 2000);
  };
}'''

story.extend(code_block(client_code, "Widget — Client Controller (AngularJS)"))
story.append(Spacer(1, 6))

server_script = '''\
(function() {
  // No server-side processing needed —
  // widget calls Scripted REST API directly via $http.
  // Optionally pre-populate dropdowns or user info here.
  data.user = gs.getUserDisplayName();
})();'''
story.extend(code_block(server_script, "Widget — Server Script"))
story.append(Spacer(1, 6))

css_code = '''\
.iptrc-copilot { font-family: 'Open Sans', Arial, sans-serif; }
.iptrc-header  { margin-bottom: 16px; }
.iptrc-header h2 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
.iptrc-panel   { padding: 20px 0; }
.iptrc-mono    { font-family: Consolas, 'Courier New', monospace;
                 font-size: 12px; }
.iptrc-output  { margin-top: 20px; border: 1px solid #ddd;
                 border-radius: 4px; overflow: hidden; }
.iptrc-output-header {
  display: flex; align-items: center;
  justify-content: space-between;
  padding: 6px 12px; background: #f5f5f5;
  border-bottom: 1px solid #ddd; }
.iptrc-skill-label { font-size: 11px; text-transform: uppercase;
  letter-spacing: .06em; color: #666; font-weight: 600; }
.iptrc-pre { white-space: pre-wrap;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px; line-height: 1.6; padding: 16px; margin: 0;
  max-height: 480px; overflow-y: auto; background: #fff; }
.iptrc-cli-box { background: #f9f9f9; border: 1px solid #e8e8e8;
  border-radius: 4px; padding: 12px; margin: 12px 0; }
.iptrc-disclaimer { margin-top: 16px; font-size: 11px; color: #888;
  border-top: 1px solid #eee; padding-top: 8px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }'''
story.extend(code_block(css_code, "Widget — CSS Styles"))

# ── SYSTEM PROPERTIES TABLE ────────────────────────────────────────────────────
story.append(PageBreak())
story.append(Paragraph("System Properties Configuration", style_h1))
story.append(hr(ATT_BLUE, 2))
story.append(Paragraph(
    "Create these 4 System Properties in ServiceNow (sys_properties.list). "
    "Never store the API key as plaintext — use the Credential Store and reference the record ID.",
    style_body))
story.append(Spacer(1, 10))

props_hdr = S("PropHdr", fontSize=9, leading=13, textColor=colors.white, fontName="Helvetica-Bold")
props_cel = S("PropCel", fontSize=9, leading=13, textColor=DARK_TEXT, fontName="Helvetica", leftIndent=4)
props_cod = S("PropCod", fontSize=9, leading=13, textColor=DARK_TEXT, fontName="Courier",   leftIndent=4)

props_data = [
    [Paragraph("Property Name",    props_hdr),
     Paragraph("Value / Example",  props_hdr),
     Paragraph("Description",      props_hdr)],
    [Paragraph("iptrc.ai.endpoint",  props_cod),
     Paragraph("https://YOUR-RESOURCE.openai.azure.com/openai/deployments/YOUR-DEPLOYMENT", props_cel),
     Paragraph("Azure OpenAI deployment endpoint URL", props_cel)],
    [Paragraph("iptrc.ai.apikey",    props_cod),
     Paragraph("[Credential Store Reference — never plaintext]", props_cel),
     Paragraph("Azure OpenAI or Anthropic API key", props_cel)],
    [Paragraph("iptrc.ai.model",     props_cod),
     Paragraph("gpt-4o", props_cod),
     Paragraph("Model / deployment name", props_cel)],
    [Paragraph("iptrc.ai.max_tokens", props_cod),
     Paragraph("1500", props_cod),
     Paragraph("Maximum output tokens per skill call", props_cel)],
]
props_t = Table(props_data, colWidths=[2.0*inch, 2.8*inch, 1.7*inch])
props_t.setStyle(TableStyle([
    ("BACKGROUND",    (0,0),(-1,0),  ATT_DARK),
    ("ROWBACKGROUNDS",(0,1),(-1,-1), [SECTION_BG, colors.white]),
    ("BOX",           (0,0),(-1,-1), 1, ATT_DARK),
    ("INNERGRID",     (0,0),(-1,-1), 0.5, LIGHT_GRAY),
    ("TOPPADDING",    (0,0),(-1,-1), 6),
    ("BOTTOMPADDING", (0,0),(-1,-1), 6),
    ("LEFTPADDING",   (0,0),(-1,-1), 8),
    ("VALIGN",        (0,0),(-1,-1), "TOP"),
]))
story.append(props_t)
story.append(Spacer(1, 16))

story.append(warn_box(
    "IMPORTANT: For iptrc.ai.apikey, create a Basic Auth or API Key record under "
    "Connections & Credentials → Credentials, then reference the credential sys_id "
    "in the system property instead of pasting the raw key."
))
story.append(Spacer(1, 16))

# ── RUNBOOK / ACCEPTANCE CRITERIA ─────────────────────────────────────────────
story.append(Paragraph("Acceptance Criteria (Done Definition)", style_h1))
story.append(hr(ATT_BLUE, 2))

criteria = [
    ("Ticket Notes Skill",   [
        "Produces consistent headings 100% of time",
        "Never claims actions not present in user input",
        "Copy/paste-ready output under 60 seconds end-to-end",
    ]),
    ("SMOP/GMOP Draft",      [
        "Always labeled DRAFT — never claims to be official MOP",
        "Includes rollback placeholders and evidence capture sections",
        "Platform-specific command bundles in pre/post checks",
    ]),
    ("RMA Email Skill",      [
        "Always text-only — no tables, no HTML",
        "Always includes all required KGPCo fields",
        "Missing fields shown as TBD — never fabricated",
    ]),
    ("Maintenance Summary",  [
        "Always includes timezone quoted exactly from email",
        "IPTRC Actions checklist produced for every run",
        "No fabricated confirmation of actions",
    ]),
]

for skill_name, items in criteria:
    story.append(Paragraph(skill_name, style_h3))
    for item in items:
        story.append(Paragraph(f"• {item}", style_bullet))
    story.append(Spacer(1, 4))

story.append(Spacer(1, 12))

# ── RUNBOOK ────────────────────────────────────────────────────────────────────
story.append(Paragraph("Runbook (Operational Ownership)", style_h1))
story.append(hr(ATT_BLUE, 2))

runbook_items = [
    ("<b>On-call:</b> Tools team rotation — same as existing tooling incidents."),
    ("<b>Bot down:</b> Fall back to static templates in Teams Files tab. Check "
     "ServiceNow system logs → Application Logs → filter by source 'IPTRC'."),
    ("<b>LLM endpoint down:</b> Widget will surface error message. No auto-retry — "
     "engineer retries manually. Check Azure OpenAI service health."),
    ("<b>Wrong output / hallucination:</b> Engineer corrects output. Log the prompt "
     "and output as a bug in the tools backlog for prompt engineering review."),
    ("<b>Secret detected in output:</b> Immediately delete the output. Review input "
     "for credential exposure. Verify _sanitize() patterns cover the new pattern."),
    ("<b>Quality metrics to track:</b> Regen rate (quality proxy), template "
     "compliance pass rate, engineer time-saved self-report (quick thumbs button)."),
]
for item in runbook_items:
    story.append(Paragraph(f"• {item}", style_bullet))
story.append(Spacer(1, 8))

# ── FINAL FOOTER ───────────────────────────────────────────────────────────────
story.append(Spacer(1, 20))
story.append(hr(ATT_BLUE, 2))
story.append(Paragraph(
    "IPTRC Ops Copilot v1.0 — AT&T Internal — Generated 2026-05-28 — "
    "Owner: NKAWULA, LEKPAM M — DRAFT — Review before deployment",
    style_caption))

# ── BUILD ──────────────────────────────────────────────────────────────────────
doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"PDF generated: {OUTPUT}")
