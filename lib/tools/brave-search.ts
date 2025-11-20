import {
  ChatTool,
  ToolDefinition,
  ToolHandler,
  isToolDisabled,
} from "./types";

export type BraveSearchArgs = {
  query: string;
  freshness?: "pd" | "pw" | "pm" | "py";
};

export const parseBraveSearchArgs = (args: unknown): BraveSearchArgs => {
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

const BRAVE_SEARCH_INTERVAL_MS = 2_000;
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

    return resultText;
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

const braveSearchSpec: ChatTool = {
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
};

const isDisabled = isToolDisabled("brave_search");
const hasApiKey = Boolean(process.env.BRAVE_API_KEY);

export const braveSearchTool: ToolDefinition = {
  spec: braveSearchSpec,
  handler: braveSearch,
  available: !isDisabled && hasApiKey,
  unavailableReason: isDisabled
    ? "disabled via MCP_DISABLE_BRAVE_SEARCH"
    : hasApiKey
    ? undefined
    : "missing BRAVE_API_KEY",
};
