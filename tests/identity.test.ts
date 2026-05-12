import { describe, expect, it } from "vitest";

import {
  createIdentity,
  decodePrivateKey,
  encodePublicKey,
  normalizePublicKey,
} from "../src/identity.js";

describe("identity", () => {
  it("generates stable nsec and npub encodings", () => {
    const identity = createIdentity();

    expect(identity.privateKey).toHaveLength(32);
    expect(identity.privateKeyHex).toMatch(/^[0-9a-f]{64}$/);
    expect(identity.nsec).toMatch(/^nsec1/);
    expect(identity.npub).toMatch(/^npub1/);
    expect(createIdentity(identity.nsec).publicKey).toBe(identity.publicKey);
    expect(decodePrivateKey(identity.privateKeyHex)).toHaveLength(32);
  });

  it("normalizes npub and public key hex to the same key", () => {
    const identity = createIdentity();
    expect(normalizePublicKey(identity.npub)).toBe(identity.publicKey);
    expect(encodePublicKey(identity.publicKey)).toBe(identity.npub);
  });
});
