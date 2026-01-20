import { braveSearchTool } from "./tools/brave-search";
import { fetchUrlTool } from "./tools/fetch";
import {
  type ChatTool,
  type ToolDefinition,
  type ToolHandler,
  type ToolProgressCallback,
  type ToolName,
} from "./tools/types";

const allTools: Record<ToolName, ToolDefinition> = {
  fetch_url: fetchUrlTool,
  brave_search: braveSearchTool,
};

// Only include brave_search if API key is available
const hasApiKey = Boolean(process.env.BRAVE_API_KEY);
const toolMap = hasApiKey
  ? allTools
  : ({ fetch_url: fetchUrlTool } as Record<ToolName, ToolDefinition>);

const toolEntries = Object.entries(toolMap);

toolEntries.forEach(([name]) => {
  console.error("[Tools] Enabled tool:", name);
});

if (!hasApiKey) {
  console.error("[Tools] Skipping tool: brave_search (missing BRAVE_API_KEY)");
}

export const toolSpecs: ChatTool[] = toolEntries.map(([, tool]) => tool.spec);

const enabledToolHandlers = new Map<string, ToolHandler>(
  toolEntries.map(([name, tool]) => [name, tool.handler])
);

export const callToolByName = async (
  name: string,
  args: unknown,
  onProgress?: ToolProgressCallback
): Promise<string> => {
  const handler = enabledToolHandlers.get(name);
  if (!handler) {
    console.error("[Tools] Tool not available:", name);
    return `Error: Tool "${name}" is not available.`;
  }

  try {
    return await handler(args, onProgress);
  } catch (error) {
    console.error(
      `[Tools] Error calling tool "${name}":`,
      typeof error === "object" && error !== null
        ? (error as Error).stack || (error as Error).message
        : String(error)
    );
    return `Error executing ${name}: ${
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    }`;
  }
};

