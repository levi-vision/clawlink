import { describe, expect, it } from "vitest";

import {
  assertPairingInvitationFresh,
  createPairingInvitation,
  encodePairingInvitation,
  parsePairingInvitation,
} from "../src/pairing.js";
import { createIdentity } from "../src/identity.js";

describe("pairing", () => {
  it("encodes and parses pairing invitations", () => {
    const identity = createIdentity();
    const invitation = createPairingInvitation({
      publicKey: identity.publicKey,
      relays: ["wss://relay.example"],
      ttlMs: 1_000,
    });

    const parsed = parsePairingInvitation(encodePairingInvitation(invitation));
    expect(parsed.publicKey).toBe(identity.publicKey);
    expect(parsed.npub).toBe(identity.npub);
    expect(parsed.relays).toEqual(["wss://relay.example"]);
    expect(() => assertPairingInvitationFresh(parsed)).not.toThrow();
  });

  it("rejects expired invitations", () => {
    const identity = createIdentity();
    const invitation = createPairingInvitation({
      publicKey: identity.publicKey,
      relays: [],
      ttlMs: -1,
    });

    expect(() => assertPairingInvitationFresh(invitation)).toThrow(/expired/);
  });
});
