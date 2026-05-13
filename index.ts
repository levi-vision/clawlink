import { defineChannelPluginEntry } from "openclaw/plugin-sdk/channel-core";
import { dispatchInboundDirectDmWithRuntime } from "openclaw/plugin-sdk/channel-inbound";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";

import { extractClawlinkConfigFromOpenClawConfig } from "./src/config.js";
import { clawlinkChannelPlugin } from "./src/channel.js";
import { ClawlinkService } from "./src/service.js";
import { InMemoryTaskStore } from "./src/task-store.js";
import { registerClawlinkTools } from "./src/tools.js";
import { CHANNEL_ID, PLUGIN_ID } from "./src/types.js";
import type { IncomingDecision } from "./src/policy.js";
import type { IncomingClawlinkEvent, ClawlinkEnvelope } from "./src/types.js";

const taskStore = new InMemoryTaskStore();
let service: ClawlinkService | undefined;

type PortableChannelEntry = {
  id: string;
  name: string;
  description: string;
  configSchema: unknown;
  register: (api: OpenClawPluginApi) => void;
  channelPlugin: unknown;
};

const entry: PortableChannelEntry = defineChannelPluginEntry({
  id: PLUGIN_ID,
  name: "Clawlink",
  description: "Nostr-first encrypted communication between OpenClaw nodes.",
  plugin: clawlinkChannelPlugin,
  registerFull(api) {
    registerClawlinkTools(api, taskStore);

    // Tool discovery needs descriptors only; the relay client belongs to full runtime.
    if (api.registrationMode !== "full") {
      return;
    }

    api.registerService({
      id: `${PLUGIN_ID}-relay-client`,
      start(ctx) {
        const config = extractClawlinkConfigFromOpenClawConfig(ctx.config);
        if (!config.identity) {
          ctx.logger.warn(
            "Clawlink relay client not started: nostrPrivateKey is not configured.",
          );
          return;
        }
        service = new ClawlinkService({
          config,
          taskStore,
          onAudit: (event) => ctx.logger.debug?.(JSON.stringify(event)),
        });
        service.startInbox({
          onIncoming: async (event, decision) => {
            ctx.logger.info(
              `[${CHANNEL_ID}] received ${event.envelope.type} from ${event.senderPublicKey}`,
            );
            if (decision.action === "reject") {
              return;
            }
            await dispatchInboundClawlinkEvent({
              api,
              config,
              service: service!,
              event,
              decision,
              logger: ctx.logger,
            });
          },
          onError: (error) => ctx.logger.warn(error.message),
        });
        ctx.logger.info(
          `[${CHANNEL_ID}] relay client started for ${config.identity.npub}`,
        );
      },
      stop(ctx) {
        service?.stop();
        service = undefined;
        ctx.logger.info(`[${CHANNEL_ID}] relay client stopped`);
      },
    });
  },
});

export default entry;

async function dispatchInboundClawlinkEvent(params: {
  api: OpenClawPluginApi;
  config: ReturnType<typeof extractClawlinkConfigFromOpenClawConfig>;
  service: ClawlinkService;
  event: IncomingClawlinkEvent;
  decision: IncomingDecision;
  logger: { warn: (message: string) => void };
}): Promise<void> {
  try {
    await dispatchInboundDirectDmWithRuntime({
      cfg: params.api.config,
      runtime: params.api.runtime,
      channel: CHANNEL_ID,
      channelLabel: "Clawlink",
      accountId: "default",
      peer: { kind: "direct", id: params.event.senderPublicKey },
      senderId: params.event.senderPublicKey,
      senderAddress: params.event.senderPublicKey,
      recipientAddress: params.config.identity?.publicKey ?? CHANNEL_ID,
      conversationLabel: "Clawlink",
      rawBody: formatEnvelopeForAgent(params.event.envelope, params.decision),
      bodyForAgent: formatEnvelopeForAgent(params.event.envelope, params.decision),
      messageId: params.event.envelope.message_id,
      timestamp: params.event.envelope.created_at,
      commandAuthorized: params.decision.action === "accept",
      provider: CHANNEL_ID,
      surface: "nostr",
      extraContext: {
        clawlinkEnvelopeType: params.event.envelope.type,
        clawlinkConversationId: params.event.envelope.conversation_id,
        clawlinkDecision: params.decision.action,
        clawlinkDecisionReason: params.decision.reason,
      },
      deliver: async (payload) => {
        const textParts = [
          payload.text,
          ...(payload.mediaUrls ?? []),
          payload.mediaUrl,
        ].filter((part): part is string => {
          return typeof part === "string" && part.trim().length > 0;
        });
        if (textParts.length === 0) {
          return;
        }
        await params.service.sendMessage({
          peer: params.event.senderPublicKey,
          text: textParts.join("\n"),
          conversationId: params.event.envelope.conversation_id,
        });
      },
      onRecordError: (err) => {
        params.logger.warn(`Clawlink failed to record inbound session: ${String(err)}`);
      },
      onDispatchError: (err) => {
        params.logger.warn(`Clawlink failed to dispatch inbound message: ${String(err)}`);
      },
    });
  } catch (err) {
    params.logger.warn(`Clawlink inbound dispatch failed: ${String(err)}`);
  }
}

function formatEnvelopeForAgent(
  envelope: ClawlinkEnvelope,
  decision: IncomingDecision,
): string {
  const prefix = `[Clawlink ${envelope.type}; policy=${decision.action}; reason=${decision.reason}]`;
  switch (envelope.type) {
    case "message":
      return `${prefix}\n${String(envelope.body.text ?? "")}`;
    case "intent.request":
      return `${prefix}\nIntent: ${String(envelope.body.intent ?? "")}`;
    case "task.request":
      return `${prefix}\nTask: ${String(envelope.body.instruction ?? "")}`;
    case "task.result":
      return `${prefix}\nTask result for ${String(envelope.body.taskId ?? "")}: ${String(
        envelope.body.status ?? "",
      )}\n${JSON.stringify(envelope.body.result ?? envelope.body.error ?? null)}`;
    case "permission.ask":
      return `${prefix}\nPermission request: ${String(envelope.body.reason ?? "")}`;
    case "permission.reply":
      return `${prefix}\nPermission reply: ${String(envelope.body.accepted ?? "")}`;
    case "status.update":
      return `${prefix}\nTask ${String(envelope.body.taskId ?? "")} is ${String(
        envelope.body.state ?? "",
      )}`;
  }
}
