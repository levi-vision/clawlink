export type PairingInvitation = {
    protocol: "clawlink.pairing";
    version: 1;
    publicKey: string;
    npub: string;
    relays: string[];
    token: string;
    expiresAt: number;
};
export declare function createPairingInvitation(params: {
    publicKey: string;
    relays: string[];
    ttlMs?: number;
}): PairingInvitation;
export declare function encodePairingInvitation(invitation: PairingInvitation): string;
export declare function parsePairingInvitation(input: string): PairingInvitation;
export declare function assertPairingInvitationFresh(invitation: PairingInvitation, now?: number): void;
