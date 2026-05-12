import { generateSecretKey, getPublicKey, nip19 } from "nostr-tools";
const HEX_32_BYTES = /^[0-9a-f]{64}$/i;
export function bytesToHex(bytes) {
    return Buffer.from(bytes).toString("hex");
}
export function hexToBytes(hex) {
    const normalized = hex.trim().toLowerCase();
    if (!HEX_32_BYTES.test(normalized)) {
        throw new Error("Expected a 32-byte hex string.");
    }
    return Uint8Array.from(Buffer.from(normalized, "hex"));
}
export function isHexPublicKey(value) {
    return HEX_32_BYTES.test(value.trim());
}
export function decodePrivateKey(input) {
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
export function normalizePublicKey(input) {
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
export function encodePublicKey(publicKey) {
    return nip19.npubEncode(normalizePublicKey(publicKey));
}
export function encodePrivateKey(privateKey) {
    return nip19.nsecEncode(privateKey);
}
export function createIdentity(privateKeyInput) {
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
//# sourceMappingURL=identity.js.map