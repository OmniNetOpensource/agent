import {
  ChatTool,
  ToolDefinition,
  ToolHandler,
  cleanHtmlToText,
  isToolDisabled,
} from "./types";

export type FetchUrlArgs = {
  url: string;
};

export const parseFetchUrlArgs = (args: unknown): FetchUrlArgs => {
  if (!args || typeof args !== "object") {
    throw new Error("fetch_url requires an object with a URL");
  }

  const url = (args as { url?: unknown }).url;
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("fetch_url requires a non-empty URL string");
  }

  try {
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  return { url };
};

const fetchUrl: ToolHandler = async (args) => {
  const { url } = parseFetchUrlArgs(args);
  console.error("[Tools:fetch_url] Fetching URL:", url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(
        "[Tools:fetch_url] HTTP error:",
        response.status,
        response.statusText
      );
      return `Error: HTTP ${response.status} ${response.statusText}`;
    }

    const contentType = response.headers.get("content-type") || "";
    console.error("[Tools:fetch_url] Content-Type:", contentType);

    if (contentType.includes("application/json")) {
      const json = await response.json();
      const jsonText = JSON.stringify(json, null, 2);
      console.error("[Tools:fetch_url] JSON response length:", jsonText.length);
      return jsonText;
    }

    const text = await response.text();
    console.error(
      "[Tools:fetch_url] Fetched text/HTML length:",
      text.length,
      "bytes"
    );

    const cleaned = cleanHtmlToText(text);
    console.error(
      "[Tools:fetch_url] Cleaned text length:",
      cleaned.length,
      "bytes"
    );
    return cleaned;
  } catch (error) {
    console.error(
      "[Tools:fetch_url] Error:",
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    );
    return `Error fetching URL: ${
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    }`;
  }
};

const fetchUrlSpec: ChatTool = {
  type: "function",
  function: {
    name: "fetch_url",
    description:
      "Fetch more detailed content from a URL and convert it to plain text. Useful for reading web pages, documentation, or API responses.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch",
          format: "uri",
        },
      },
      required: ["url"],
    },
  },
};

const isDisabled = isToolDisabled("fetch_url");

export const fetchUrlTool: ToolDefinition = {
  spec: fetchUrlSpec,
  handler: fetchUrl,
  available: !isDisabled,
  unavailableReason: isDisabled
    ? "disabled via MCP_DISABLE_FETCH_URL"
    : undefined,
};
