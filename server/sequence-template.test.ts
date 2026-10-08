import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderSequenceEmail } from "./sequence-template";

test("renders subject and HTML body, preserving template markup", () => {
  const result = renderSequenceEmail(
    "Intro for {{company}} — {{firstName}}",
    "<p>Hi {{first_name}} {{lastName}}, {{name}} at {{company_name}}: {{email}} / {{phone}} / {{address}}</p>",
    { name: "Amanda Dyer", company: "A&B <Care>", email: "test@example.com", phone: "123", address: "Main St" },
  );
  assert.equal(result.subject, "Intro for A&B <Care> — Amanda");
  assert.equal(result.content, "<p>Hi Amanda Dyer, Amanda Dyer at A&amp;B &lt;Care&gt;: test@example.com / 123 / Main St</p>");
});

test("supports explicit snake/camel fields, whitespace and case-insensitive aliases", () => {
  const result = renderSequenceEmail(
    "{{ First_Name }} {{LAST_NAME}} {{companyName}} {{full_name}}",
    "{{firstName}} {{last_name}}",
    { first_name: "Ada", lastName: "Lovelace", company_name: "Example", fullName: "Ada L." },
  );
  assert.equal(result.subject, "Ada Lovelace Example Ada L.");
  assert.equal(result.content, "Ada Lovelace");
});

test("empty fields get generic fallbacks and unknown or internal fields are stripped", () => {
  const result = renderSequenceEmail("{{company}}: {{first_name}}", "{{name}}/{{email}}/{{unknown}}/{{notes}}/{{constructor}}", { company: " ", name: "", notes: "private" });
  assert.equal(result.subject, "your company: there");
  assert.equal(result.content, "there////");
  assert.equal(renderSequenceEmail("{{unknown}}", "", {}).subject, "Following up");
});

test("tokens in lead values and nested/malformed tokens cannot survive rendering", () => {
  const result = renderSequenceEmail("{{company}}\r\n{{firstName}}", "{{unknown {{company}} }} {{broken", {
    company: "{{company}}", name: "{{firstName}}",
  });
  assert.equal(result.subject, "your company there");
  assert.doesNotMatch(result.subject + result.content, /\{\{|\}\}/);
});

test("shared sequence SMTP path renders both fields before send and logging", () => {
  const source = readFileSync(new URL("./sequence-automation.ts", import.meta.url), "utf8");
  assert.match(source, /\(\{ subject, content \} = renderSequenceEmail\(subject, content, leadRecord\)\)/);
  assert.ok(source.indexOf("renderSequenceEmail(subject, content, leadRecord)") < source.indexOf("await transporter.sendMail"));
  assert.match(source, /sendSequenceEmail\(seq.userId, leadRecord, subject, step.content\)/);
});
