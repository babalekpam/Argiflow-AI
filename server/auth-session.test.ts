import test from "node:test";
import assert from "node:assert/strict";
import {
  establishUserSession,
  SESSION_ESTABLISHMENT_ERROR_CODE,
  SessionEstablishmentError,
  type AuthSession,
  type AuthSessionRequest,
} from "./auth-session";

type FakeSessionOptions = {
  regenerateError?: Error;
  saveError?: Error;
  onEvent?: (event: string) => void;
};

function createFakeSession(options: FakeSessionOptions = {}) {
  const events: string[] = [];
  const savedStates: Array<{
    userId?: string;
    adminId?: string;
    originalUserId?: string;
  }> = [];
  const request = {
    session: undefined as unknown as AuthSession,
  } as AuthSessionRequest;
  const initialSession = {
    userId: "previous-user",
    adminId: "old-admin",
    originalUserId: "previous-user",
    regenerate(callback: (error?: Error) => void) {
      events.push("regenerate");
      options.onEvent?.("regenerate");
      if (!options.regenerateError) {
        request.session = {
          userId: "previous-user",
          adminId: "old-admin",
          originalUserId: "previous-user",
          save(callback: (error?: Error) => void) {
            events.push("save");
            options.onEvent?.("save");
            savedStates.push({
              userId: this.userId,
              adminId: this.adminId,
              originalUserId: this.originalUserId,
            });
            callback(options.saveError);
          },
        } as AuthSession;
      }
      callback(options.regenerateError);
    },
  } as unknown as AuthSession;
  request.session = initialSession;

  return { request, events, savedStates };
}

test("regenerates before saving and removes old admin context", async () => {
  const { request, events, savedStates } = createFakeSession();

  await establishUserSession(request, "new-user");

  assert.deepEqual(events, ["regenerate", "save"]);
  assert.deepEqual(savedStates, [{
    userId: "new-user",
    adminId: undefined,
    originalUserId: undefined,
  }]);
  assert.equal(request.session.userId, "new-user");
  assert.equal(request.session.adminId, undefined);
  assert.equal(request.session.originalUserId, undefined);
});


test("does not save or report success when regeneration fails", async () => {
  const { request, events, savedStates } = createFakeSession({
    regenerateError: new Error("cookie token password details must not escape"),
  });

  await assert.rejects(
    establishUserSession(request, "new-user"),
    (error: unknown) => {
      assert.ok(error instanceof SessionEstablishmentError);
      assert.equal(error.stage, "regenerate");
      assert.equal(error.code, SESSION_ESTABLISHMENT_ERROR_CODE);
      assert.equal(error.message, "Unable to establish authenticated session");
      assert.doesNotMatch(error.message, /cookie|token|password/i);
      return true;
    },
  );
  assert.deepEqual(events, ["regenerate"]);
  assert.deepEqual(savedStates, []);
});

test("does not report success when persistence fails", async () => {
  const { request, events, savedStates } = createFakeSession({
    saveError: new Error("session store token and cookie details must not escape"),
  });

  await assert.rejects(
    establishUserSession(request, "new-user"),
    (error: unknown) => {
      assert.ok(error instanceof SessionEstablishmentError);
      assert.equal(error.stage, "save");
      assert.equal(error.code, SESSION_ESTABLISHMENT_ERROR_CODE);
      assert.equal(error.message, "Unable to establish authenticated session");
      assert.doesNotMatch(error.message, /cookie|token|password/i);
      return true;
    },
  );
  assert.deepEqual(events, ["regenerate", "save"]);
  assert.deepEqual(savedStates, [{
    userId: "new-user",
    adminId: undefined,
    originalUserId: undefined,
  }]);
});
