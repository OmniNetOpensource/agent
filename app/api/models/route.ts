import { NextResponse } from "next/server";
import { fetchOpenRouterModels } from "@/lib/openrouter";
import { DEFAULT_CHAT_MODEL_ID } from "@/lib/models";

export async function GET() {
  try {
    const models = await fetchOpenRouterModels();
    const defaultModelId =
      process.env.OPENROUTER_DEFAULT_MODEL ||
      models[0]?.id ||
      DEFAULT_CHAT_MODEL_ID;

    return NextResponse.json(
      { models, defaultModelId },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("[Models-API] Failed to load models:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { models: [], defaultModelId: DEFAULT_CHAT_MODEL_ID, error: message },
      { status: 500 }
    );
  }
}
