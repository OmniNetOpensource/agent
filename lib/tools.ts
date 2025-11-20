import { braveSearchTool, type BraveSearchArgs } from "./tools/brave-search";
import { fetchUrlTool, type FetchUrlArgs } from "./tools/fetch";
import {
  type ChatTool,
  type ToolDefinition,
  type ToolHandler,
  type ToolName,
} from "./tools/types";

const toolMap: Record<ToolName, ToolDefinition> = {
  fetch_url: fetchUrlTool,
  brave_search: braveSearchTool,
};

const enabledToolEntries = Object.entries(toolMap).filter(
  ([, tool]) => tool.available
);

enabledToolEntries.forEach(([name]) => {
  console.error("[Tools] Enabled tool:", name);
});

Object.entries(toolMap)
  .filter(([, tool]) => !tool.available)
  .forEach(([name, tool]) => {
    console.error(
      "[Tools] Skipping tool:",
      name,
      tool.unavailableReason ? `(${tool.unavailableReason})` : ""
    );
  });

export const toolSpecs: ChatTool[] = enabledToolEntries.map(
  ([, tool]) => tool.spec
);

const enabledToolHandlers = new Map<string, ToolHandler>(
  enabledToolEntries.map(([name, tool]) => [name, tool.handler])
);

export const callToolByName = async (
  name: string,
  args: unknown
): Promise<string> => {
  const handler = enabledToolHandlers.get(name);
  if (!handler) {
    console.error("[Tools] Tool not available:", name);
    return `Error: Tool "${name}" is not available or disabled.`;
  }

  try {
    return await handler(args);
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

export type { BraveSearchArgs, FetchUrlArgs };
