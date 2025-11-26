import { NextRequest, NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  DEFAULT_CHAT_MODEL_ID,
} from "@/src/features/model/lib/openrouter";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export async function GET(request: NextRequest) {
  try {
    const models = await fetchOpenRouterModels();
    const defaultModelId = models[0]?.id || DEFAULT_CHAT_MODEL_ID;

    const data = { models, defaultModelId };
    const etag = `"${simpleHash(JSON.stringify(data))}"`;

    const ifNoneMatch = request.headers.get("If-None-Match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "no-cache",
        },
      });
    }

    return NextResponse.json(data, {
      headers: {
        ETag: etag,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Models-API] Failed to load models:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { models: [], defaultModelId: DEFAULT_CHAT_MODEL_ID, error: message },
      { status: 500 }
    );
  }
}
