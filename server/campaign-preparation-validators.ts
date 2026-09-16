import { z } from "zod";

/**
 * This is the deliberately small, non-AI contract for the user-click
 * campaign preparation flow.  Keeping it independent of Express and the
 * database makes it safe to exercise in unit tests.
 */
export const campaignPreparationStepSchema = z.object({
  subject: z.string().trim().min(1).max(500),
  body: z.string().trim().min(1).max(100_000),
  delayDays: z.number().int().min(0).max(365),
}).strict();

export const campaignPreparationPayloadSchema = z.object({
  name: z.string().trim().min(1).max(200),
  businessContext: z.string().trim().min(1).max(100_000),
  goals: z.array(z.string().trim().min(1).max(1_000)).max(100),
  steps: z.array(campaignPreparationStepSchema).length(4),
  leadIds: z.array(z.string().trim().min(1)).max(10_000),
  accountIds: z.array(z.string().trim().min(1)).max(1_000),
}).strict().superRefine((payload, context) => {
  const duplicateLeadIds = payload.leadIds.filter(
    (id, index) => payload.leadIds.indexOf(id) !== index,
  );
  if (duplicateLeadIds.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["leadIds"],
      message: "leadIds must not contain duplicates",
    });
  }

  const duplicateAccountIds = payload.accountIds.filter(
    (id, index) => payload.accountIds.indexOf(id) !== index,
  );
  if (duplicateAccountIds.length > 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["accountIds"],
      message: "accountIds must not contain duplicates",
    });
  }

  if (payload.steps[0]?.delayDays !== 0) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["steps", 0, "delayDays"],
      message: "The initial step must send immediately (delayDays must be 0)",
    });
  }
});

export function parseStringIdArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const ids = value.map(id => typeof id === "string" ? id.trim() : "");
  if (ids.some(id => id.length === 0)) return null;
  if (new Set(ids).size !== ids.length) return null;
  return ids;
}

export type CampaignPreparationPayload = z.infer<typeof campaignPreparationPayloadSchema>;

export type CampaignPreparationValidation =
  | { success: true; data: CampaignPreparationPayload }
  | { success: false; errors: string[] };

export function validateCampaignPreparationPayload(
  input: unknown,
): CampaignPreparationValidation {
  const result = campaignPreparationPayloadSchema.safeParse(input);
  if (result.success) return result;

  return {
    success: false,
    errors: result.error.issues.map(issue => {
      const path = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
      return `${path}${issue.message}`;
    }),
  };
}

export interface CampaignSequenceForReadiness {
  stepNumber?: unknown;
  subject?: unknown;
  body?: unknown;
  isActive?: unknown;
}

/**
 * Prepared campaigns are intentionally stricter than legacy campaigns:
 * exactly four active, ordered, non-empty steps are required.
 */
export function getPreparedSequenceIssues(
  sequences: readonly CampaignSequenceForReadiness[],
): string[] {
  const issues: string[] = [];
  if (sequences.length !== 4) {
    issues.push("Prepared campaigns must contain exactly four sequence steps (an initial step and three follow-ups).");
    return issues;
  }

  sequences.forEach((sequence, index) => {
    const expectedStep = index + 1;
    if (sequence.stepNumber !== expectedStep) {
      issues.push("Prepared campaign steps must be ordered 1 through 4.");
    }
    if (sequence.isActive !== true) {
      issues.push(`Prepared campaign step ${expectedStep} must be active.`);
    }
    if (typeof sequence.subject !== "string" || sequence.subject.trim().length === 0) {
      issues.push(`Prepared campaign step ${expectedStep} must have a non-empty subject.`);
    }
    if (typeof sequence.body !== "string" || sequence.body.trim().length === 0) {
      issues.push(`Prepared campaign step ${expectedStep} must have a non-empty body.`);
    }
  });

  return Array.from(new Set(issues));
}
