import test from "node:test";
import assert from "node:assert/strict";
import { campaignLaunchGates } from "./campaign-launch-gates";

test("a ready draft can open review before giving consent", () => {
  assert.deepEqual(campaignLaunchGates({
    ready: true, busy: false, confirmRecipients: false, confirmTerms: false,
  }), { canReview: true, canLaunch: false });
});

test("launch requires both confirmations and a ready, idle draft", () => {
  for (const ready of [false, true]) {
    for (const busy of [false, true]) {
      for (const confirmRecipients of [false, true]) {
        for (const confirmTerms of [false, true]) {
          const gates = campaignLaunchGates({ ready, busy, confirmRecipients, confirmTerms });
          assert.equal(gates.canLaunch, ready && !busy && confirmRecipients && confirmTerms);
        }
      }
    }
  }
});