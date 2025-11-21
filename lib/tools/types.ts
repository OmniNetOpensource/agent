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
};

export const cleanHtmlToText = (html: string) =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
