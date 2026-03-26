import type { Tool } from "@renews/core/index";
import { RemoteSearchProvider } from "./provider.js";

export const remoteSearchTool = (apiBaseURL: string, apiKey: string): Tool<
  { query: string; maxResults?: number; filters?: Record<string, unknown> },
  { results: Awaited<ReturnType<RemoteSearchProvider["search"]>> }
> => ({
  name: "remote.search",
  description: "Call the external search provider.",
  inputSchema: {},
  outputSchema: {},
  permission: { mode: "ask", action: "use_remote_search", risk: "high" },
  async run(_ctx, args) {
    const provider = new RemoteSearchProvider(apiBaseURL, apiKey);
    return {
      results: await provider.search(args),
    };
  },
});
