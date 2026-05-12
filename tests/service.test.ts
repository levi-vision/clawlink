import { describe, expect, it } from "vitest";

import { createEnvelope } from "../src/envelope.js";
import { createIdentity } from "../src/identity.js";
import {
  GIFT_WRAP_LOOKBACK_SECONDS,
  ClawlinkService,
} from "../src/service.js";
import type { NostrClawlinkTransport } from "../src/transport.js";

describe("service", () => {
  it("records incoming task requests according to peer policy", () => {
    const local = createIdentity();
    const peer = createIdentity();
    const service = new ClawlinkService({
      config: {
        nodeName: "local",
        nostrPrivateKey: local.nsec,
        identity: local,
        relays: ["wss://relay.example"],
        trustedPeers: [peer.publicKey],
        peerPolicies: {
          [peer.publicKey]: {
            canRequestTask: true,
            requireApprovalForAllTasks: true,
          },
        },
      },
    });

    const decision = service.handleIncoming({
      outerEventId: "outer",
      senderPublicKey: peer.publicKey,
      envelope: createEnvelope({
        type: "task.request",
        body: {
          taskId: "task-1",
          instruction: "run tests",
          taskType: "ci",
        },
      }),
    });

    expect(decision.action).toBe("needs_approval");
    expect(service.taskStore.get("task-1")?.state).toBe("needs_approval");
  });

  it("subscribes across the NIP-59 gift wrap timestamp randomization window", () => {
    const local = createIdentity();
    let capturedSince: number | undefined;
    const transport = {
      subscribeInbox(params: { since?: number }) {
        capturedSince = params.since;
        return { close: () => undefined };
      },
      close() {
        return undefined;
      },
    } as unknown as NostrClawlinkTransport;
    const service = new ClawlinkService({
      config: {
        nodeName: "local",
        nostrPrivateKey: local.nsec,
        identity: local,
        relays: ["wss://relay.example"],
        trustedPeers: [],
        peerPolicies: {},
      },
      transport,
    });

    const before = Math.floor(Date.now() / 1000);
    service.startInbox();
    const after = Math.floor(Date.now() / 1000);

    expect(capturedSince).toBeGreaterThanOrEqual(
      before - GIFT_WRAP_LOOKBACK_SECONDS - 1,
    );
    expect(capturedSince).toBeLessThanOrEqual(after - GIFT_WRAP_LOOKBACK_SECONDS);
  });
});
