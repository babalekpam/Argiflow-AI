import { db } from "./db";
import { eq } from "drizzle-orm";
import { clientDomains, type ClientDomain } from "../shared/domain-schema";
import * as dns from "dns/promises";
import * as crypto from "crypto";
import {
  SESClient,
  VerifyDomainIdentityCommand,
  VerifyDomainDkimCommand,
  GetIdentityVerificationAttributesCommand,
  GetIdentityDkimAttributesCommand,
  DeleteIdentityCommand,
} from "@aws-sdk/client-ses";

const POSTAL_SERVER_ID = 1;
const AWS_REGION = "us-east-2";

function getSesClient(): SESClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.AWS_API_KEY;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new SESClient({
    region: AWS_REGION,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function registerDomainWithSes(domain: string): Promise<{
  success: boolean;
  verificationToken?: string;
  dkimTokens?: string[];
  error?: string;
}> {
  const client = getSesClient();
  if (!client) return { success: false, error: "AWS SES credentials not configured" };

  try {
    const verifyResult = await client.send(new VerifyDomainIdentityCommand({ Domain: domain }));
    const verificationToken = verifyResult.VerificationToken;
    console.log(`[DomainEngine] SES domain verification initiated for ${domain}, token: ${verificationToken}`);

    const dkimResult = await client.send(new VerifyDomainDkimCommand({ Domain: domain }));
    const dkimTokens = dkimResult.DkimTokens || [];
    console.log(`[DomainEngine] SES DKIM tokens for ${domain}: ${dkimTokens.join(", ")}`);

    return { success: true, verificationToken, dkimTokens };
  } catch (err: any) {
    console.error(`[DomainEngine] SES registration failed for ${domain}:`, err.message);
    return { success: false, error: err.message };
  }
}

async function checkSesVerificationStatus(domain: string): Promise<{
  identityVerified: boolean;
  dkimVerified: boolean;
}> {
  const client = getSesClient();
  if (!client) return { identityVerified: false, dkimVerified: false };

  try {
    const [identityResult, dkimResult] = await Promise.all([
      client.send(new GetIdentityVerificationAttributesCommand({ Identities: [domain] })),
      client.send(new GetIdentityDkimAttributesCommand({ Identities: [domain] })),
    ]);

    const identityStatus = identityResult.VerificationAttributes?.[domain]?.VerificationStatus;
    const dkimStatus = dkimResult.DkimAttributes?.[domain]?.DkimVerificationStatus;

    console.log(`[DomainEngine] SES status for ${domain} — identity: ${identityStatus}, dkim: ${dkimStatus}`);

    return {
      identityVerified: identityStatus === "Success",
      dkimVerified: dkimStatus === "Success",
    };
  } catch (err: any) {
    console.error(`[DomainEngine] SES status check failed for ${domain}:`, err.message);
    return { identityVerified: false, dkimVerified: false };
  }
}

async function removeDomainFromSes(domain: string): Promise<void> {
  const client = getSesClient();
  if (!client) return;
  try {
    await client.send(new DeleteIdentityCommand({ Identity: domain }));
    console.log(`[DomainEngine] SES identity deleted for ${domain}`);
  } catch (err: any) {
    console.warn(`[DomainEngine] SES identity delete failed for ${domain}:`, err.message);
  }
}

async function verifySpf(domain: string): Promise<boolean> {
  try {
    const records = await dns.resolveTxt(domain);
    const flat = records.flat().join(" ");
    return flat.includes("include:spf.argilette.co") || flat.includes("ip4:89.167.73.73");
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

export async function addClientDomain(userId: string, domain: string, fromName?: string, fromEmail?: string): Promise<{
  success: boolean;
  domain?: ClientDomain;
  dnsRecords?: object;
  error?: string;
}> {
  domain = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim();

  const [existing] = await db.select().from(clientDomains).where(eq(clientDomains.domain, domain));
  if (existing) {
    return { success: false, error: "Domain already registered" };
  }

  const sesResult = await registerDomainWithSes(domain);
  if (!sesResult.success) {
    return { success: false, error: `SES registration failed: ${sesResult.error}` };
  }

  const dkimSelector = `argi-${crypto.randomBytes(4).toString("hex")}`;

  const [created] = await db.insert(clientDomains).values({
    userId,
    domain,
    status: "pending",
    dkimSelector,
    dkimPublicKey: "",
    spfRecord: "",
    returnPathHost: "",
    postalServerId: POSTAL_SERVER_ID,
    sesVerified: false,
    sesDkimTokens: JSON.stringify(sesResult.dkimTokens || []),
    defaultFromName: fromName || "",
    defaultFromEmail: fromEmail || `hello@${domain}`,
  }).returning();

  const dnsRecords: any = {
    ses_verification: {
      type: "TXT",
      name: `_amazonses.${domain}`,
      value: sesResult.verificationToken || "",
      description: "Verifies domain ownership with Amazon SES",
    },
  };

  if (sesResult.dkimTokens?.length) {
    sesResult.dkimTokens.forEach((token, i) => {
      dnsRecords[`ses_dkim_${i + 1}`] = {
        type: "CNAME",
        name: `${token}._domainkey.${domain}`,
        value: `${token}.dkim.amazonses.com`,
        description: `SES DKIM record ${i + 1} of ${sesResult.dkimTokens!.length}`,
      };
    });
  }

  return {
    success: true,
    domain: created,
    dnsRecords,
    sesVerificationToken: sesResult.verificationToken,
  };
}

export async function verifyClientDomain(domainId: string, userId: string): Promise<{
  sesIdentity: boolean;
  sesDkim: boolean;
  allVerified: boolean;
  status: string;
}> {
  const [domainRecord] = await db.select().from(clientDomains).where(eq(clientDomains.id, domainId));
  if (!domainRecord) throw new Error("Domain not found");
  if (domainRecord.userId !== userId) throw new Error("Domain not found");

  const sesStatus = await checkSesVerificationStatus(domainRecord.domain);

  const allVerified = sesStatus.identityVerified && sesStatus.dkimVerified;
  const status = allVerified ? "active" : "verifying";

  await db.update(clientDomains).set({
    sesVerified: allVerified,
    dkimVerified: sesStatus.dkimVerified,
    status: status as any,
    lastCheckedAt: new Date(),
    verifiedAt: allVerified ? new Date() : undefined,
    updatedAt: new Date(),
  }).where(eq(clientDomains.id, domainId));

  return {
    sesIdentity: sesStatus.identityVerified,
    sesDkim: sesStatus.dkimVerified,
    allVerified,
    status,
  };
}

export async function getUserDomains(userId: string): Promise<ClientDomain[]> {
  return db.select().from(clientDomains).where(eq(clientDomains.userId, userId));
}

export async function getActiveDomainForUser(userId: string): Promise<ClientDomain | null> {
  const domains = await db.select().from(clientDomains)
    .where(eq(clientDomains.userId, userId));
  return domains.find(d => d.status === "active") || null;
}

export async function updateDomainSender(domainId: string, userId: string, fromName?: string, fromEmail?: string): Promise<ClientDomain | null> {
  const [domain] = await db.select().from(clientDomains)
    .where(eq(clientDomains.id, domainId));

  if (!domain || domain.userId !== userId) return null;

  const updates: Record<string, any> = {};
  if (fromName !== undefined) updates.defaultFromName = fromName;
  if (fromEmail !== undefined) updates.defaultFromEmail = fromEmail;

  if (Object.keys(updates).length === 0) return domain;

  const [updated] = await db.update(clientDomains).set(updates)
    .where(eq(clientDomains.id, domainId)).returning();
  return updated;
}

export async function deleteDomain(domainId: string, userId: string): Promise<boolean> {
  const [domain] = await db.select().from(clientDomains)
    .where(eq(clientDomains.id, domainId));

  if (!domain || domain.userId !== userId) return false;

  await removeDomainFromSes(domain.domain);
  await db.delete(clientDomains).where(eq(clientDomains.id, domainId));
  return true;
}

export default {
  addClientDomain,
  verifyClientDomain,
  getUserDomains,
  getActiveDomainForUser,
  updateDomainSender,
  deleteDomain,
};
