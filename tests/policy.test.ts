import { describe, expect, it } from "vitest";

import { createEnvelope } from "../src/envelope.js";
import { decideIncomingEnvelope, isValidTaskTransition } from "../src/policy.js";

describe("policy", () => {
  it("rejects untrusted non-permission messages", () => {
    const decision = decideIncomingEnvelope({
      trusted: false,
      envelope: createEnvelope({ type: "message", body: { text: "hello" } }),
    });

    expect(decision.action).toBe("reject");
  });

  it("allows untrusted permission requests to enter approval", () => {
    const decision = decideIncomingEnvelope({
      trusted: false,
      envelope: createEnvelope({
        type: "permission.ask",
        body: { reason: "pairing" },
      }),
    });

    expect(decision.action).toBe("needs_approval");
  });

  it("requires task approval unless policy auto-accepts the task type", () => {
    const envelope = createEnvelope({
      type: "task.request",
      body: { taskId: "t1", instruction: "run tests", taskType: "ci" },
    });

    expect(
      decideIncomingEnvelope({
        trusted: true,
        envelope,
        policy: { canRequestTask: true, requireApprovalForAllTasks: true },
      }).action,
    ).toBe("needs_approval");

    expect(
      decideIncomingEnvelope({
        trusted: true,
        envelope,
        policy: {
          canRequestTask: true,
          requireApprovalForAllTasks: false,
          autoAcceptTaskTypes: ["ci"],
        },
      }).action,
    ).toBe("accept");
  });

  it("keeps task transitions explicit", () => {
    expect(isValidTaskTransition("received", "needs_approval")).toBe(true);
    expect(isValidTaskTransition("running", "done")).toBe(true);
    expect(isValidTaskTransition("done", "running")).toBe(false);
  });
});
