import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";

import type { ClawlinkIdentity } from "./types.js";

const HEX_32_BYTES = /^[0-9a-f]{64}$/i;

export function bytesToHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.trim().toLowerCase();
  if (!HEX_32_BYTES.test(normalized)) {
    throw new Error("Expected a 32-byte hex string.");
  }
  return Uint8Array.from(Buffer.from(normalized, "hex"));
}

export function isHexPublicKey(value: string): boolean {
  return HEX_32_BYTES.test(value.trim());
}

export function decodePrivateKey(input: string | Uint8Array): Uint8Array {
  if (input instanceof Uint8Array) {
    if (input.length !== 32) {
      throw new Error("Nostr private key must be 32 bytes.");
    }
    return input;
  }

  const value = input.trim();
  if (value.startsWith("nsec1")) {
    const decoded = nip19.decode(value);
    if (decoded.type !== "nsec") {
      throw new Error("Expected an nsec private key.");
    }
    return decoded.data;
  }

  return hexToBytes(value);
}

export function normalizePublicKey(input: string): string {
  const value = input.trim();
  if (value.startsWith("npub1")) {
    const decoded = nip19.decode(value);
    if (decoded.type !== "npub") {
      throw new Error("Expected an npub public key.");
    }
    return decoded.data.toLowerCase();
  }
  if (!isHexPublicKey(value)) {
    throw new Error("Expected a Nostr npub or 32-byte public key hex.");
  }
  return value.toLowerCase();
}

export function encodePublicKey(publicKey: string): string {
  return nip19.npubEncode(normalizePublicKey(publicKey));
}

export function encodePrivateKey(privateKey: Uint8Array): string {
  return nip19.nsecEncode(privateKey);
}

export function createIdentity(privateKeyInput?: string | Uint8Array): ClawlinkIdentity {
  const privateKey = privateKeyInput
    ? decodePrivateKey(privateKeyInput)
    : generateSecretKey();
  const privateKeyHex = bytesToHex(privateKey);
  const publicKey = getPublicKey(privateKey);
  return {
    privateKey,
    privateKeyHex,
    nsec: encodePrivateKey(privateKey),
    publicKey,
    npub: encodePublicKey(publicKey),
  };
}
