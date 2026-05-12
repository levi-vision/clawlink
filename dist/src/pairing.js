import { randomBytes, randomUUID } from "node:crypto";
import { encodePublicKey, normalizePublicKey } from "./identity.js";
export function createPairingInvitation(params) {
    const publicKey = normalizePublicKey(params.publicKey);
    return {
        protocol: "clawlink.pairing",
        version: 1,
        publicKey,
        npub: encodePublicKey(publicKey),
        relays: [...new Set(params.relays.map((relay) => relay.trim()).filter(Boolean))],
        token: `${randomUUID()}.${randomBytes(16).toString("base64url")}`,
        expiresAt: Date.now() + (params.ttlMs ?? 10 * 60 * 1000),
    };
}
export function encodePairingInvitation(invitation) {
    const payload = Buffer.from(JSON.stringify(invitation), "utf8").toString("base64url");
    return `clawlink1.${payload}`;
}
export function parsePairingInvitation(input) {
    const trimmed = input.trim();
    if (!trimmed.startsWith("clawlink1.")) {
        throw new Error("Pairing invitation must start with clawlink1.");
    }
    const encoded = trimmed.slice("clawlink1.".length);
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (parsed?.protocol !== "clawlink.pairing" ||
        parsed?.version !== 1 ||
        typeof parsed?.publicKey !== "string" ||
        typeof parsed?.token !== "string" ||
        typeof parsed?.expiresAt !== "number" ||
        !Array.isArray(parsed?.relays)) {
        throw new Error("Invalid Clawlink pairing invitation.");
    }
    const publicKey = normalizePublicKey(parsed.publicKey);
    return {
        protocol: "clawlink.pairing",
        version: 1,
        publicKey,
        npub: encodePublicKey(publicKey),
        relays: parsed.relays.filter((relay) => {
            return typeof relay === "string" && relay.trim().length > 0;
        }),
        token: parsed.token,
        expiresAt: parsed.expiresAt,
    };
}
export function assertPairingInvitationFresh(invitation, now = Date.now()) {
    if (invitation.expiresAt <= now) {
        throw new Error("Pairing invitation has expired.");
    }
}
//# sourceMappingURL=pairing.js.map