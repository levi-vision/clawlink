import type { OpenClawConfig } from "openclaw/plugin-sdk/core";

import {
  CHANNEL_ID,
  DEFAULT_RELAYS,
  PLUGIN_ID,
  type ClawlinkPluginConfig,
  type ResolvedClawlinkConfig,
} from "./types.js";
import { createIdentity, normalizePublicKey } from "./identity.js";
import { normalizePeerPolicy } from "./policy.js";

export function normalizeRelayUrls(relays: unknown): string[] {
  const raw = Array.isArray(relays) ? relays : DEFAULT_RELAYS;
  return [
    ...new Set(
      raw
        .filter((relay): relay is string => typeof relay === "string")
        .map((relay) => relay.trim())
        .filter((relay) => relay.startsWith("wss://") || relay.startsWith("ws://")),
    ),
  ];
}

export function normalizeClawlinkConfig(raw: unknown): ResolvedClawlinkConfig {
  const record = isRecord(raw) ? raw : {};
  const privateKey =
    typeof record.nostrPrivateKey === "string"
      ? record.nostrPrivateKey.trim()
      : undefined;
  const trustedPeers = normalizeTrustedPeers(record.trustedPeers);
  const peerPolicies = normalizePeerPolicies(record.peerPolicies);
  return {
    nodeName:
      typeof record.nodeName === "string" && record.nodeName.trim().length > 0
        ? record.nodeName.trim()
        : "Clawlink Node",
    nostrPrivateKey: privateKey,
    identity: privateKey ? createIdentity(privateKey) : undefined,
    relays: normalizeRelayUrls(record.relays),
    trustedPeers,
    peerPolicies,
  };
}

export function extractClawlinkConfigFromOpenClawConfig(
  cfg: OpenClawConfig | Record<string, unknown> | undefined,
): ResolvedClawlinkConfig {
  const source = cfg as Record<string, unknown> | undefined;
  const pluginConfig = getPathRecord(source, [
    "plugins",
    "entries",
    PLUGIN_ID,
    "config",
  ]);
  const channelConfig = getPathRecord(source, ["channels", CHANNEL_ID]);
  return normalizeClawlinkConfig({
    ...pluginConfig,
    ...channelConfig,
  });
}

export function buildSetupConfig(params: {
  existing?: OpenClawConfig;
  nodeName?: string;
  privateKey?: string;
  relayUrls?: string[];
}): OpenClawConfig {
  const cfg = structuredClone((params.existing ?? {}) as Record<string, unknown>);
  const channels = ensureRecord(cfg, "channels");
  const privateKey = params.privateKey ?? createIdentity().nsec;
  channels[CHANNEL_ID] = {
    ...(isRecord(channels[CHANNEL_ID]) ? channels[CHANNEL_ID] : {}),
    nodeName: params.nodeName ?? "Clawlink Node",
    nostrPrivateKey: privateKey,
    relays: params.relayUrls?.length ? params.relayUrls : [...DEFAULT_RELAYS],
    trustedPeers: isRecord(channels[CHANNEL_ID])
      ? channels[CHANNEL_ID].trustedPeers
      : [],
    peerPolicies: isRecord(channels[CHANNEL_ID])
      ? channels[CHANNEL_ID].peerPolicies
      : {},
  };
  return cfg as OpenClawConfig;
}

function normalizeTrustedPeers(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const peers: string[] = [];
  for (const peer of value) {
    if (typeof peer !== "string") {
      continue;
    }
    try {
      peers.push(normalizePublicKey(peer));
    } catch {
      // Ignore invalid configured peers instead of failing the whole channel.
    }
  }
  return [...new Set(peers)];
}

function normalizePeerPolicies(value: unknown): ClawlinkPluginConfig["peerPolicies"] {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: ClawlinkPluginConfig["peerPolicies"] = {};
  for (const [rawKey, rawPolicy] of Object.entries(value)) {
    try {
      const key = normalizePublicKey(rawKey);
      normalized[key] = normalizePeerPolicy(
        isRecord(rawPolicy) ? rawPolicy : undefined,
      );
    } catch {
      // Ignore invalid policy keys.
    }
  }
  return normalized;
}

function getPathRecord(
  source: Record<string, unknown> | undefined,
  path: string[],
): Record<string, unknown> {
  let current: unknown = source;
  for (const key of path) {
    if (!isRecord(current)) {
      return {};
    }
    current = current[key];
  }
  return isRecord(current) ? current : {};
}

function ensureRecord(target: Record<string, unknown>, key: string): Record<string, unknown> {
  if (!isRecord(target[key])) {
    target[key] = {};
  }
  return target[key] as Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
