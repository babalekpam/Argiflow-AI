import type { Session } from "express-session";

export const SESSION_ESTABLISHMENT_ERROR_CODE = "SESSION_ESTABLISHMENT_FAILED";

export type AuthSession = Session & {
  userId?: string;
  adminId?: string;
  originalUserId?: string;
};

export type AuthSessionRequest = {
  session: AuthSession;
};

export type SessionEstablishmentStage = "regenerate" | "save";

/**
 * A login must not become successful until the newly-regenerated session has
 * been durably saved. The error intentionally does not retain callback error
 * details because those may contain credentials or session implementation
 * details.
 */
export class SessionEstablishmentError extends Error {
  readonly code = SESSION_ESTABLISHMENT_ERROR_CODE;

  constructor(readonly stage: SessionEstablishmentStage) {
    super("Unable to establish authenticated session");
    this.name = "SessionEstablishmentError";
  }
}


export function establishUserSession(request: AuthSessionRequest, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((regenerateError) => {
      if (regenerateError) {
        reject(new SessionEstablishmentError("regenerate"));
        return;
      }

      // express-session replaces req.session during regeneration. Always use
      // that replacement, rather than the pre-regeneration object.
      const session = request.session;
      session.userId = userId;
      delete session.adminId;
      delete session.originalUserId;

      session.save((saveError) => {
        if (saveError) {
          reject(new SessionEstablishmentError("save"));
          return;
        }
        resolve();
      });
    });
  });
}
