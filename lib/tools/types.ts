export type ToolName = "fetch_url" | "brave_search";

export type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ToolHandler = (args: unknown) => Promise<string>;

export type ToolDefinition = {
  spec: ChatTool;
  handler: ToolHandler;
  available: boolean;
  unavailableReason?: string;
};

export const TOOL_DISABLE_PREFIX = "MCP_DISABLE_";

export const cleanHtmlToText = (html: string) =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isToolDisabled = (name: ToolName) =>
  process.env[`${TOOL_DISABLE_PREFIX}${name.toUpperCase()}`] === "true";
