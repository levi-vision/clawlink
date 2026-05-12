import type { OpenClawPluginApi } from "openclaw/plugin-sdk/core";
import { InMemoryTaskStore } from "./task-store.js";
export declare function registerClawlinkTools(api: OpenClawPluginApi, taskStore?: InMemoryTaskStore): void;
