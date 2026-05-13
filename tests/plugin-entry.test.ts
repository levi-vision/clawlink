import { describe, expect, it } from "vitest";

import entry from "../index.js";

const CLAWLINK_TOOL_NAMES = [
  "clawlink_list_peers",
  "clawlink_send_message",
  "clawlink_request_task",
  "clawlink_reply_task",
  "clawlink_get_task_status",
];

describe("plugin entry", () => {
  it("registers Clawlink tools without starting services during tool discovery", () => {
    const api = createApi("tool-discovery");

    entry.register(api);

    expect(api.toolNames).toEqual(CLAWLINK_TOOL_NAMES);
    expect(api.toolOptions).toEqual(CLAWLINK_TOOL_NAMES.map(() => ({ optional: true })));
    expect(api.serviceIds).toEqual([]);
    expect(api.channelRegistrations).toEqual([]);
  });

  it("registers tools and the relay service during full runtime registration", () => {
    const api = createApi("full");

    entry.register(api);

    expect(api.toolNames).toEqual(CLAWLINK_TOOL_NAMES);
    expect(api.serviceIds).toEqual(["clawlink-relay-client"]);
    expect(api.channelRegistrations).toHaveLength(1);
  });
});

function createApi(registrationMode: string) {
  const api = {
    id: "clawlink",
    name: "Clawlink",
    source: "test",
    registrationMode,
    config: {},
    runtime: {},
    logger: {
      debug: () => undefined,
      info: () => undefined,
      warn: () => undefined,
    },
    toolNames: [] as string[],
    toolOptions: [] as unknown[],
    serviceIds: [] as string[],
    channelRegistrations: [] as unknown[],
    registerTool(tool: { name?: string }, opts?: unknown) {
      if (!tool.name) {
        throw new Error("test tool must expose a name");
      }
      this.toolNames.push(tool.name);
      this.toolOptions.push(opts);
    },
    registerService(service: { id: string }) {
      this.serviceIds.push(service.id);
    },
    registerChannel(registration: unknown) {
      this.channelRegistrations.push(registration);
    },
    registerHook: () => undefined,
    registerHttpRoute: () => undefined,
    registerGatewayMethod: () => undefined,
    registerCli: () => undefined,
    registerProvider: () => undefined,
    registerSpeechProvider: () => undefined,
    registerRealtimeTranscriptionProvider: () => undefined,
    registerRealtimeVoiceProvider: () => undefined,
    registerMediaUnderstandingProvider: () => undefined,
    registerImageGenerationProvider: () => undefined,
    registerMusicGenerationProvider: () => undefined,
    registerVideoGenerationProvider: () => undefined,
    registerWebFetchProvider: () => undefined,
    registerWebSearchProvider: () => undefined,
    registerCliBackend: () => undefined,
  };

  return api as typeof api & Parameters<typeof entry.register>[0];
}
