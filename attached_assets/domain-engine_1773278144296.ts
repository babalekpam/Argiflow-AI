// ============================================================
// DOMAIN ENGINE — ArgiFlow White-Label Sending
// Manages client sending domains via Postal + DNS verification
// ============================================================

import { db } from "./db";
import { eq } from "drizzle-orm";
import { clientDomains, type ClientDomain } from "../shared/domain-schema";
import { execSync } from "child_process";
import * as dns from "dns/promises";
import * as crypto from "crypto";

const POSTAL_SERVER_ID = 1; // Your Postal server ID (argilette.co server)
const POSTAL_DB_HOST = process.env.POSTAL_DB_HOST || "89.167.73.73";
const POSTAL_DB_PASS = process.env.POSTAL_DB_PASS || "postalpassword";
const POSTAL_SSH_KEY = process.env.POSTAL_SSH_KEY_PATH || "/etc/argiflow/postal_key";

// ── ADD DOMAIN TO POSTAL (via SSH + mysql) ────────────────────

async function addDomainToPostal(domain: string, dkimSelector: string): Promise<{
  success: boolean;
  domainId?: number;
  dkimPublicKey?: string;
  error?: string;
}> {
  try {
    // Generate DKIM key pair
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    // Extract raw public key for DNS record
    const pubKeyRaw = publicKey
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\n/g, "");

    const dkimRecord = `v=DKIM1; t=s; h=sha256; p=${pubKeyRaw};`;

    // Insert domain into Postal's MariaDB via SSH
    const insertSQL = `
      INSERT INTO postal.domains 
        (server_id, name, dkim_private_key, dkim_identifier_string, created_at, updated_at)
      VALUES 
        (${POSTAL_SERVER_ID}, '${domain}', '${privateKey.replace(/'/g, "\\'")}', '${dkimSelector}', NOW(), NOW());
      SELECT LAST_INSERT_ID() as id;
    `.trim();

    const result = execSync(
      `ssh -i ${POSTAL_SSH_KEY} -o StrictHostKeyChecking=no root@${POSTAL_DB_HOST} ` +
      `"docker exec postal-mariadb mysql -u postal -p${POSTAL_DB_PASS} -e \\"${insertSQL.replace(/"/g, '\\"')}\\""`
    ).toString();

    // Parse inserted ID
    const idMatch = result.match(/(\d+)/g);
    const domainId = idMatch ? parseInt(idMatch[idMatch.length - 1]) : undefined;

    return { success: true, domainId, dkimPublicKey: dkimRecord };
  } catch (err: any) {
    console.error("[DomainEngine] Postal insert failed:", err.message);
    return { success: false, error: err.message };
  }
}

// ── DNS VERIFICATION ──────────────────────────────────────────

async function verifySpf(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.flat().join(" ");
    return flat.includes("include:spf.argilette.co") || flat.includes(`ip4:89.167.73.73`);
  } catch {
    return false;
  }
}

async function verifyDkim(domain: string, selector: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
    const flat = records.flat().join("");
    return flat.includes("v=DKIM1");
  } catch {
    return false;
  }
}

async function verifyReturnPath(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveCname(`psrp.${domain}`);
    return records.includes("rp.argilette.co") || records.includes("rp.argilette.co.");
  } catch {
    return false;
  }
}

// ── PUBLIC API ────────────────────────────────────────────────

export async function addClientDomain(userId: string, domain: string, fromName?: string, fromEmail?: string): Promise<{
  success: boolean;
  domain?: ClientDomain;
  dnsRecords?: object;
  error?: string;
}> {
  // Clean domain
  domain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

  // Check if already exists
  const [existing] = await db.select().from(clientDomains).where(eq(clientDomains.domain, domain));
  if (existing) {
    return { success: false, error: "Domain already registered" };
  }

  // Generate unique DKIM selector
  const dkimSelector = `argi-${crypto.randomBytes(4).toString("hex")}`;

  // Add to Postal
  const postalResult = await addDomainToPostal(domain, dkimSelector);

  // Build DNS records for client
  const spfRecord = `v=spf1 include:spf.argilette.co ~all`;
  const returnPathHost = `rp.argilette.co`;

  // Save to ArgiFlow DB
  const [created] = await db.insert(clientDomains).values({
    userId,
    domain,
    status: "pending",
    dkimSelector,
    dkimPublicKey: postalResult.dkimPublicKey || "",
    spfRecord,
    returnPathHost,
    postalDomainId: postalResult.domainId,
    postalServerId: POSTAL_SERVER_ID,
    defaultFromName: fromName || "",
    defaultFromEmail: fromEmail || `hello@${domain}`,
  }).returning();

  return {
    success: true,
    domain: created,
    dnsRecords: {
      spf: {
        type: "TXT",
        name: "@",
        value: spfRecord,
        description: "Authorizes ArgiFlow to send email from your domain",
      },
      dkim: {
        type: "TXT",
        name: `${dkimSelector}._domainkey`,
        value: postalResult.dkimPublicKey || "",
        description: "Authenticates your emails with a digital signature",
      },
      returnPath: {
        type: "CNAME",
        name: "psrp",
        value: returnPathHost,
        description: "Improves deliverability and handles bounces",
      },
    },
  };
}

export async function verifyClientDomain(domainId: string): Promise<{
  spf: boolean;
  dkim: boolean;
  returnPath: boolean;
  allVerified: boolean;
  status: string;
}> {
  const [domainRecord] = await db.select().from(clientDomains).where(eq(clientDomains.id, domainId));
  if (!domainRecord) throw new Error("Domain not found");

  const [spf, dkim, returnPath] = await Promise.all([
    verifySpf(domainRecord.domain),
    verifyDkim(domainRecord.domain, domainRecord.dkimSelector),
    verifyReturnPath(domainRecord.domain),
  ]);

  const allVerified = spf && dkim;
  const status = allVerified ? "active" : "verifying";

  await db.update(clientDomains).set({
    spfVerified: spf,
    dkimVerified: dkim,
    returnPathVerified: returnPath,
    status: status as any,
    lastCheckedAt: new Date(),
    verifiedAt: allVerified ? new Date() : undefined,
    updatedAt: new Date(),
  }).where(eq(clientDomains.id, domainId));

  return { spf, dkim, returnPath, allVerified, status };
}

export async function getUserDomains(userId: string): Promise<ClientDomain[]> {
  return db.select().from(clientDomains).where(eq(clientDomains.userId, userId));
}

export async function getActiveDomainForUser(userId: string): Promise<ClientDomain | null> {
  const domains = await db.select().from(clientDomains)
    .where(eq(clientDomains.userId, userId));
  return domains.find(d => d.status === "active") || null;
}

export async function deleteDomain(domainId: string, userId: string): Promise<boolean> {
  const [domain] = await db.select().from(clientDomains)
    .where(eq(clientDomains.id, domainId));

  if (!domain || domain.userId !== userId) return false;

  await db.delete(clientDomains).where(eq(clientDomains.id, domainId));
  return true;
}

export default {
  addClientDomain,
  verifyClientDomain,
  getUserDomains,
  getActiveDomainForUser,
  deleteDomain,
};
