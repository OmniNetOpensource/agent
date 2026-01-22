import type { SerializedMessage } from "@/src/features/chat/types/chat";

export type OpenAIInputItem =
  | { type: "message"; role: "user" | "assistant" | "system"; content: string | OpenAIContentPart[] }
  | OpenAIFunctionCall
  | OpenAIFunctionCallOutput;

export type OpenAIContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; image_url: string };

export type OpenAITool = {
  type: "function";
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type OpenAIFunctionCallOutput = {
  type: "function_call_output";
  call_id: string;
  output: string;
};

export type OpenAIFunctionCall = {
  type: "function_call";
  name: string;
  call_id: string;
  arguments: string;
  id?: string;
};

type ChatTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export function convertToOpenAIInput(history: SerializedMessage[]): OpenAIInputItem[] {
  return history.map((msg) => {
    const contentParts: OpenAIContentPart[] = [];

    for (const block of msg.blocks) {
      if (block.type === "content" && block.content) {
        contentParts.push({ type: "input_text", text: block.content });
      } else if (block.type === "attachments") {
        for (const att of block.attachments) {
          if (att.kind === "image" && att.url) {
            contentParts.push({ type: "input_image", image_url: att.url });
          }
        }
      }
    }

    const content = contentParts.length === 1 && contentParts[0].type === "input_text"
      ? contentParts[0].text
      : contentParts;

    return {
      type: "message" as const,
      role: msg.role,
      content: content.length === 0 ? "" : content,
    };
  });
}

export function convertToolsToOpenAI(tools: ChatTool[]): OpenAITool[] {
  return tools
    .filter((t) => t.type === "function")
    .map((t) => ({
      type: "function" as const,
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));
}
