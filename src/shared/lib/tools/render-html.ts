import { ChatTool, ToolDefinition, ToolHandler } from "./types";

type RenderHtmlArgs = {
  html: string;
  title?: string;
};

type RenderHtmlResult =
  | { success: true }
  | { success: false; error: string };

const parseRenderHtmlArgs = (args: unknown): RenderHtmlArgs => {
  if (!args || typeof args !== "object") {
    throw new Error("render_html requires an object with html content");
  }

  const html = (args as { html?: unknown }).html;
  if (typeof html !== "string" || html.trim().length === 0) {
    throw new Error("render_html requires non-empty html string");
  }

  const title = (args as { title?: unknown }).title;
  const resolvedTitle =
    typeof title === "string" && title.trim().length > 0
      ? title.trim()
      : "Untitled Preview";

  return { html, title: resolvedTitle };
};

const renderHtml: ToolHandler = async (args) => {
  try {
    const { title } = parseRenderHtmlArgs(args);
    console.error("[Tools:render_html] Creating preview:", title);

    const result: RenderHtmlResult = { success: true };

    return JSON.stringify(result);
  } catch (error) {
    console.error(
      "[Tools:render_html] Error:",
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    );

    const result: RenderHtmlResult = {
      success: false,
      error:
        typeof error === "object" && error !== null
          ? (error as Error).message
          : String(error),
    };

    return JSON.stringify(result);
  }
};

const renderHtmlSpec: ChatTool = {
  type: "function",
  function: {
    name: "render_html",
    description:
      "当用户想要直接生成一个网站时调用此工具。将 HTML 内容渲染为可交互的预览，用户可以在预览面板中查看。",
    parameters: {
      type: "object",
      properties: {
        html: {
          type: "string",
          description: "The complete HTML content to render (can include CSS and JavaScript)",
        },
        title: {
          type: "string",
          description: "Optional title for the preview (defaults to 'Untitled Preview')",
        },
      },
      required: ["html"],
    },
  },
};

export const renderHtmlTool: ToolDefinition = {
  spec: renderHtmlSpec,
  handler: renderHtml,
};
