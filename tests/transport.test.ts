import { describe, expect, it } from "vitest";
import type { Event, Filter } from "nostr-tools";

import { createEnvelope } from "../src/envelope.js";
import { createIdentity } from "../src/identity.js";
import { NostrClawlinkTransport, wrapEnvelopeForPeer } from "../src/transport.js";

describe("transport", () => {
  it("wraps and unwraps an envelope using NIP-17", () => {
    const alice = createIdentity();
    const bob = createIdentity();
    const envelope = createEnvelope({
      type: "message",
      body: { text: "hello bob" },
    });

    const event = wrapEnvelopeForPeer({
      senderPrivateKey: alice.privateKey,
      recipientPublicKey: bob.publicKey,
      envelope,
    });
    const bobTransport = new NostrClawlinkTransport({
      privateKey: bob.privateKey,
      relays: ["wss://relay.example"],
      pool: fakePool(),
    });

    const incoming = bobTransport.unwrapEvent(event);
    expect(incoming.senderPublicKey).toBe(alice.publicKey);
    expect(incoming.envelope).toEqual(envelope);
  });

  it("fails to unwrap with the wrong recipient key", () => {
    const alice = createIdentity();
    const bob = createIdentity();
    const mallory = createIdentity();
    const event = wrapEnvelopeForPeer({
      senderPrivateKey: alice.privateKey,
      recipientPublicKey: bob.publicKey,
      envelope: createEnvelope({ type: "message", body: { text: "secret" } }),
    });
    const malloryTransport = new NostrClawlinkTransport({
      privateKey: mallory.privateKey,
      relays: ["wss://relay.example"],
      pool: fakePool(),
    });

    expect(() => malloryTransport.unwrapEvent(event)).toThrow();
  });

  it("reports accepted and rejected relays", async () => {
    const alice = createIdentity();
    const bob = createIdentity();
    const transport = new NostrClawlinkTransport({
      privateKey: alice.privateKey,
      relays: ["wss://ok.example", "wss://bad.example"],
      pool: fakePool({ rejectRelay: "wss://bad.example" }),
    });

    const result = await transport.sendEnvelope(
      { publicKey: bob.publicKey },
      createEnvelope({ type: "message", body: { text: "hello" } }),
    );

    expect(result.acceptedRelays).toEqual(["wss://ok.example"]);
    expect(result.rejectedRelays).toHaveLength(1);
  });
});

function fakePool(options: { rejectRelay?: string } = {}) {
  return {
    publish(relays: string[]) {
      return relays.map((relay) =>
        relay === options.rejectRelay
          ? Promise.reject(new Error("relay unavailable"))
          : Promise.resolve("ok"),
      );
    },
    subscribeMany(
      _relays: string[],
      _filter: Filter,
      _params: { onevent: (event: Event) => void },
    ) {
      return { close: () => undefined };
    },
    destroy() {
      return undefined;
    },
  };
}
