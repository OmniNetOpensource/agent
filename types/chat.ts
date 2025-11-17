export type ResearchItem =
  | { kind: "thinking"; text: string; isExpanded: boolean }
  | {
      kind: "tool_call";
      tool: string;
      args: Record<string, unknown>;
      isExpanded: boolean;
    }
  | { kind: "tool_result"; tool: string; result: string; isExpanded: boolean };

export type ContentBlock =
  | { type: "content"; content: string }
  | { type: "research"; items: ResearchItem[]; isExpanded: boolean };

export type Message = { role: "user" | "assistant"; blocks: ContentBlock[] };
