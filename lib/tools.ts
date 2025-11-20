type ToolName = "fetch_url" | "brave_search";

type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type FetchUrlArgs = {
  url: string;
};

export type BraveSearchArgs = {
  query: string;
  freshness?: "pd" | "pw" | "pm" | "py";
};

type ToolHandler = (args: unknown) => Promise<string>;

const TOOL_DISABLE_PREFIX = "MCP_DISABLE_";
const RESULT_TRUNCATE_LENGTH = 10_000;

const cleanHtmlToText = (html: string) =>
  html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const parseFetchUrlArgs = (args: unknown): FetchUrlArgs => {
  if (!args || typeof args !== "object") {
    throw new Error("fetch_url requires an object with a URL");
  }

  const url = (args as { url?: unknown }).url;
  if (typeof url !== "string" || url.trim().length === 0) {
    throw new Error("fetch_url requires a non-empty URL string");
  }

  try {
    // Validate URL format early so we can return a friendly error
    new URL(url);
  } catch {
    throw new Error("Invalid URL format");
  }

  return { url };
};

const parseBraveSearchArgs = (args: unknown): BraveSearchArgs => {
  if (!args || typeof args !== "object") {
    throw new Error("brave_search requires an object with a query");
  }

  const { query, freshness } = args as {
    query?: unknown;
    freshness?: unknown;
  };

  if (typeof query !== "string" || query.trim().length === 0) {
    throw new Error("brave_search requires a non-empty query string");
  }

  if (
    freshness !== undefined &&
    freshness !== "pd" &&
    freshness !== "pw" &&
    freshness !== "pm" &&
    freshness !== "py"
  ) {
    throw new Error(
      "freshness must be one of: pd (past day), pw (past week), pm (past month), py (past year)"
    );
  }

  return { query, freshness };
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
      return jsonText.substring(0, RESULT_TRUNCATE_LENGTH);
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
    return cleaned.substring(0, RESULT_TRUNCATE_LENGTH);
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

const BRAVE_SEARCH_INTERVAL_MS = 1_000;
let lastBraveSearchAt = 0;
let braveSearchQueue: Promise<void> = Promise.resolve();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const enqueueBraveSearchCall = async <T>(
  task: () => Promise<T>
): Promise<T> => {
  const runTask = async () => {
    const now = Date.now();
    const elapsed = now - lastBraveSearchAt;

    if (elapsed < BRAVE_SEARCH_INTERVAL_MS) {
      const waitTime = BRAVE_SEARCH_INTERVAL_MS - elapsed;
      console.error(
        "[Tools:brave_search] Throttling request, waiting",
        `${waitTime}ms`
      );
      await sleep(waitTime);
    }

    lastBraveSearchAt = Date.now();
    return task();
  };

  const queuedTask = braveSearchQueue
    .catch(() => {})
    .then(runTask);

  braveSearchQueue = queuedTask.then(() => {}).catch(() => {});
  return queuedTask;
};

const performBraveSearch = async (
  query: string,
  freshness: BraveSearchArgs["freshness"],
  apiKey: string
): Promise<string> => {
  console.error(
    "[Tools:brave_search] Searching:",
    query,
    "| freshness:",
    freshness || "none"
  );

  try {
    const params = new URLSearchParams({
      q: query,
      count: "20",
    });

    if (freshness) {
      params.append("freshness", freshness);
    }

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip",
          "X-Subscription-Token": apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(
        "[Tools:brave_search] API error:",
        response.status,
        response.statusText
      );
      return `Brave Search API error: ${response.status} ${response.statusText}`;
    }

    const data = await response.json();

    let resultText = `Search results for: "${query}"\n\n`;

    if (data.web?.results && data.web.results.length > 0) {
      resultText += "Web Results:\n\n";
      data.web.results.forEach(
        (
          result: { title: string; url: string; description?: string },
          index: number
        ) => {
          resultText += `${index + 1}. ${result.title}\n`;
          resultText += `   URL: ${result.url}\n`;
          resultText += `   ${result.description || "No description"}\n\n`;
        }
      );
    }

    if (data.news?.results && data.news.results.length > 0) {
      resultText += "\nNews Results:\n\n";
      data.news.results
        .slice(0, 3)
        .forEach(
          (
            result: { title: string; source?: string; description?: string },
            index: number
          ) => {
            resultText += `${index + 1}. ${result.title}\n`;
            resultText += `   Source: ${result.source || "Unknown"}\n`;
            resultText += `   ${result.description || ""}\n\n`;
          }
        );
    }

    if (!data.web?.results || data.web.results.length === 0) {
      resultText = `No results found for "${query}"`;
    }

    return resultText.substring(0, RESULT_TRUNCATE_LENGTH);
  } catch (error) {
    console.error(
      "[Tools:brave_search] Error:",
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    );
    return `Brave Search error: ${
      typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error)
    }`;
  }
};

const braveSearch: ToolHandler = async (args) => {
  const { query, freshness } = parseBraveSearchArgs(args);
  const apiKey = process.env.BRAVE_API_KEY;

  if (!apiKey) {
    console.error("[Tools:brave_search] Missing BRAVE_API_KEY");
    return "Error: BRAVE_API_KEY is not set";
  }

  return enqueueBraveSearchCall(() =>
    performBraveSearch(query, freshness, apiKey)
  );
};

const isDisabled = (name: ToolName) =>
  process.env[`${TOOL_DISABLE_PREFIX}${name.toUpperCase()}`] === "true";

const toolMap: Record<
  ToolName,
  {
    spec: ChatTool;
    handler: ToolHandler;
    available: boolean;
    unavailableReason?: string;
  }
> = {
  fetch_url: {
    spec: {
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
    },
    handler: fetchUrl,
    available: !isDisabled("fetch_url"),
    unavailableReason: isDisabled("fetch_url")
      ? "disabled via MCP_DISABLE_FETCH_URL"
      : undefined,
  },
  brave_search: {
    spec: {
      type: "function",
      function: {
        name: "brave_search",
        description:
          "Search the web using Brave Search API. Get real-time, up-to-date information from the internet. Supports web search, news, and image results.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
            freshness: {
              type: "string",
              description:
                "Time filter: pd=past day, pw=past week, pm=past month, py=past year",
              enum: ["pd", "pw", "pm", "py"],
            },
          },
          required: ["query"],
        },
      },
    },
    handler: braveSearch,
    available:
      !isDisabled("brave_search") && Boolean(process.env.BRAVE_API_KEY),
    unavailableReason: isDisabled("brave_search")
      ? "disabled via MCP_DISABLE_BRAVE_SEARCH"
      : process.env.BRAVE_API_KEY
      ? undefined
      : "missing BRAVE_API_KEY",
  },
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
