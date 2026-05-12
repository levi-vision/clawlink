import { describe, expect, it } from "vitest";

import { createEnvelope, parseEnvelope, stringifyEnvelope } from "../src/envelope.js";

describe("envelope", () => {
  it("round-trips a message envelope", () => {
    const envelope = createEnvelope({
      type: "message",
      body: { text: "hello" },
    });

    expect(parseEnvelope(stringifyEnvelope(envelope))).toEqual(envelope);
  });

  it("rejects unknown protocols and malformed bodies", () => {
    expect(() =>
      parseEnvelope(
        JSON.stringify({
          protocol: "wrong",
          version: 1,
          message_id: "m",
          conversation_id: "c",
          type: "message",
          created_at: 1,
          body: { text: "hello" },
        }),
      ),
    ).toThrow(/protocol/);

    expect(() =>
      stringifyEnvelope(
        createEnvelope({
          type: "task.result",
          body: { taskId: "task-1", status: "running" } as any,
        }),
      ),
    ).toThrow(/status/);
  });
});
