export type ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool_call"; tool: string; args: Record<string, unknown> }
  | { kind: "tool_result"; tool: string; result: string };

export type ContentBlock =
  | { type: "content"; content: string }
  | { type: "research"; items: ResearchItem[] };

export type Message = { role: "user" | "assistant"; blocks: ContentBlock[] };
