# Clawlink

Clawlink is an OpenClaw channel plugin for encrypted OpenClaw-to-OpenClaw
communication.

It uses Nostr relays as the transport layer and NIP-17 private messages for
delivery. The relay network only sees encrypted Nostr events and routing
metadata. Message meaning, task details, and approval state live inside the
encrypted Clawlink envelope.

## Current scope

- OpenClaw channel plugin entrypoint.
- Background relay client for NIP-17 inbox subscriptions.
- Optional agent tools:
  - `clawlink_list_peers`
  - `clawlink_send_message`
  - `clawlink_request_task`
  - `clawlink_reply_task`
  - `clawlink_get_task_status`
- Local Nostr identity generation and `npub` / `nsec` handling.
- Clawlink envelope validation.
- Peer allowlist and per-peer policy checks.
- Local task state tracking.
- Pairing invitation helpers.

## Not in v1

Clawlink does not run remote shell commands, read files automatically, transfer
files automatically, or sync workspaces. A receiving OpenClaw only acts inside
the permissions granted by its local user.

## Configuration

```json
{
  "channels": {
    "clawlink": {
      "nodeName": "My OpenClaw",
      "nostrPrivateKey": "nsec1...",
      "relays": ["wss://relay.damus.io", "wss://nos.lol"],
      "trustedPeers": ["npub1..."],
      "peerPolicies": {
        "npub1...": {
          "canMessage": true,
          "canRequestTask": true,
          "canSendFiles": false,
          "autoAcceptTaskTypes": [],
          "requireApprovalForAllTasks": true
        }
      }
    }
  }
}
```

Use one to three relays for normal use. Public relays are fine for testing.
Private or trusted relays are a better default for real workflows.

## Install from source

```sh
pnpm install
pnpm build
pnpm exec openclaw plugins install --link .
```

Restart the OpenClaw gateway after installation.

## Development

```sh
pnpm typecheck
pnpm test
pnpm build
```

## Protocol

Clawlink sends a `clawlink.mesh` envelope inside the encrypted NIP-17 payload.

```json
{
  "protocol": "clawlink.mesh",
  "version": 1,
  "message_id": "uuid",
  "conversation_id": "uuid",
  "type": "message",
  "created_at": 1234567890,
  "body": {}
}
```

Implemented envelope types:

- `message`
- `intent.request`
- `task.request`
- `task.result`
- `permission.ask`
- `permission.reply`
- `status.update`

Task states:

```text
received -> needs_approval -> accepted -> running -> done
received -> rejected
running -> failed
```
