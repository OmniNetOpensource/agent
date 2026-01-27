import {
  ChatTool,
  ToolDefinition,
  ToolHandler,
} from "./types";

type SerpSearchArgs = {
  query: string;
};

type SerpOrganicResult = {
  title?: unknown;
  link?: unknown;
  url?: unknown;
  snippet?: unknown;
  [key: string]: unknown;
};

type SerpSearchPayload = {
  query: string;
  results: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  rawResults: SerpOrganicResult[];
};

const parseSerpSearchArgs = (args: unknown): SerpSearchArgs => {
  if (!args || typeof args !== "object") {
    throw new Error("serp_search requires an object with a query");
  }

  const { query } = args as { query?: unknown };

  if (typeof query !== "string" || query.trim().length === 0) {
    throw new Error("serp_search requires a non-empty query string");
  }

  return { query };
};

const SERP_SEARCH_INTERVAL_MS = 2_000;
let lastSerpSearchAt = 0;
let serpSearchQueue: Promise<void> = Promise.resolve();

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const enqueueSerpSearchCall = async <T>(task: () => Promise<T>): Promise<T> => {
  const runTask = async () => {
    const now = Date.now();
    const elapsed = now - lastSerpSearchAt;

    if (elapsed < SERP_SEARCH_INTERVAL_MS) {
      const waitTime = SERP_SEARCH_INTERVAL_MS - elapsed;
      console.error(
        "[Tools:serp_search] Throttling request, waiting",
        `${waitTime}ms`
      );
      await sleep(waitTime);
    }

    lastSerpSearchAt = Date.now();
    return task();
  };

  const queuedTask = serpSearchQueue
    .catch(() => {})
    .then(runTask);

  serpSearchQueue = queuedTask.then(() => {}).catch(() => {});
  return queuedTask;
};

const formatSerpSearchResponse = (
  query: string,
  data: { organic_results?: SerpOrganicResult[] }
): string => {
  const rawResults = Array.isArray(data.organic_results)
    ? data.organic_results
    : [];

  const results: SerpSearchPayload["results"] = rawResults
    .map((result) => {
      if (!result || typeof result !== "object") {
        return null;
      }

      const title =
        typeof result.title === "string" && result.title.trim().length > 0
          ? result.title
          : "";
      const url =
        typeof result.link === "string" && result.link.trim().length > 0
          ? result.link
          : typeof result.url === "string" && result.url.trim().length > 0
            ? result.url
            : "";
      const description =
        typeof result.snippet === "string" ? result.snippet : "";

      if (!title && !url) {
        return null;
      }

      return {
        title: title || url,
        url,
        description,
      };
    })
    .filter(
      (
        result
      ): result is {
        title: string;
        url: string;
        description: string;
      } => Boolean(result && result.url)
    )
    .slice(0, 10);

  const payload: SerpSearchPayload = {
    query,
    results,
    rawResults: rawResults.slice(0, 10),
  };

  return JSON.stringify(payload);
};

const performSerpSearch = async (
  query: string,
  apiKey: string
): Promise<string> => {
  console.error("[Tools:serp_search] Searching:", query);

  const params = new URLSearchParams({
    engine: "google",
    q: query,
    api_key: apiKey,
    num: "10",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`https://serpapi.com/search?${params}`, {
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(
        "[Tools:serp_search] API error:",
        response.status,
        response.statusText
      );
      return `SerpAPI error: ${response.status} ${response.statusText}`;
    }

    const data = (await response.json()) as {
      organic_results?: SerpOrganicResult[];
    };
    return formatSerpSearchResponse(query, data);
  } catch (error) {
    const isAbortError =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      (error as { name?: string }).name === "AbortError";
    const message = isAbortError
      ? "Request timed out"
      : typeof error === "object" && error !== null
        ? (error as Error).message
        : String(error);
    console.error("[Tools:serp_search] Error:", message);
    return `SerpAPI error: ${message}`;
  } finally {
    clearTimeout(timeoutId);
  }
};

const serpSearch: ToolHandler = async (args) => {
  const { query } = parseSerpSearchArgs(args);
  const apiKey = process.env.SERP_API_KEY;

  if (!apiKey) {
    console.error("[Tools:serp_search] Missing SERP_API_KEY");
    return "Error: SERP_API_KEY is not set";
  }

  return enqueueSerpSearchCall(() => performSerpSearch(query, apiKey));
};

const serpSearchSpec: ChatTool = {
  type: "function",
  function: {
    name: "serp_search",
    description:
      "Search the web using Google Search via SerpAPI. Get comprehensive, real-time search results. Ideal for research and fact-checking.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query",
        },
      },
      required: ["query"],
    },
  },
};

export const serpSearchTool: ToolDefinition = {
  spec: serpSearchSpec,
  handler: serpSearch,
};
