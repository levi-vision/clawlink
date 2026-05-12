import type { ClawlinkIdentity } from "./types.js";
export declare function bytesToHex(bytes: Uint8Array): string;
export declare function hexToBytes(hex: string): Uint8Array;
export declare function isHexPublicKey(value: string): boolean;
export declare function decodePrivateKey(input: string | Uint8Array): Uint8Array;
export declare function normalizePublicKey(input: string): string;
export declare function encodePublicKey(publicKey: string): string;
export declare function encodePrivateKey(privateKey: Uint8Array): string;
export declare function createIdentity(privateKeyInput?: string | Uint8Array): ClawlinkIdentity;
