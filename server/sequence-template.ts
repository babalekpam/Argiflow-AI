// Deliberately allowlist public contact fields; never interpolate internal notes.
export function renderSequenceEmail(
  subject: string,
  content: string,
  lead: Record<string, unknown>,
): { subject: string; content: string } {
  const strip = (value: string) => value
    .replace(/\{\{[\s\S]*?\}\}/g, "")
    .replace(/\{\{|\}\}/g, "");
  const field = (...keys: string[]) => {
    for (const key of keys) {
      if (typeof lead[key] === "string") {
        const value = strip(lead[key] as string).trim();
        if (value) return value;
      }
    }
    return "";
  };
  const name = field("name", "fullName", "full_name");
  const firstName = field("firstName", "first_name") || name.split(/\s+/)[0] || "there";
  const lastName = field("lastName", "last_name") || name.split(/\s+/).slice(1).join(" ");
  const values: Record<string, string> = {
    name: name || firstName,
    fullname: name || firstName,
    firstname: firstName,
    lastname: lastName,
    company: field("company", "companyName", "company_name") || "your company",
    email: field("email"),
    phone: field("phone"),
    address: field("address"),
  };
  values.companyname = values.company;
  const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
  const render = (template: string, html: boolean) => strip(template.replace(
    /\{\{([\s\S]*?)\}\}/g,
    (_match, key: string) => {
      const normalized = key.trim().replace(/_/g, "").toLowerCase();
      const value = Object.hasOwn(values, normalized) ? values[normalized] : "";
      return html ? escapeHtml(value) : value;
    },
  ));
  return {
    subject: render(subject, false).replace(/[\r\n]+/g, " ").trim() || "Following up",
    content: render(content, true),
  };
}
