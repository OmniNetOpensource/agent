import { braveSearchTool } from "./tools/brave-search";
import { fetchUrlTool } from "./tools/fetch";
import { renderHtmlTool } from "./tools/render-html";
import { serpSearchTool } from "./tools/serp-search";
import { tavilySearchTool } from "./tools/tavily-search";
import {
  type ChatTool,
  type ToolDefinition,
  type ToolHandler,
  type ToolProgressCallback,
  type ToolName,
} from "./tools/types";

const hasBraveKey = Boolean(process.env.BRAVE_API_KEY);
const hasSerpKey = Boolean(process.env.SERP_API_KEY);
const hasTavilyKey = Boolean(process.env.TAVILY_API_KEY);

const toolMap: Partial<Record<ToolName, ToolDefinition>> = {
  fetch_url: fetchUrlTool,
  render_html: renderHtmlTool,
};

if (hasBraveKey) {
  toolMap.brave_search = braveSearchTool;
}

if (hasSerpKey) {
  toolMap.serp_search = serpSearchTool;
}

if (hasTavilyKey) {
  toolMap.tavily_search = tavilySearchTool;
}

const toolEntries = Object.entries(toolMap) as Array<
  [ToolName, ToolDefinition]
>;

toolEntries.forEach(([name]) => {
  console.error("[Tools] Enabled tool:", name);
});

if (!hasBraveKey) {
  console.error("[Tools] Skipping tool: brave_search (missing BRAVE_API_KEY)");
}

if (!hasSerpKey) {
  console.error("[Tools] Skipping tool: serp_search (missing SERP_API_KEY)");
}

if (!hasTavilyKey) {
  console.error("[Tools] Skipping tool: tavily_search (missing TAVILY_API_KEY)");
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
