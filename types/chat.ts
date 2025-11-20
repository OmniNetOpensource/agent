export type ResearchItem =
  | { kind: "thinking"; text: string; isExpanded: boolean }
  | {
      kind: "tool_call";
      tool: string;
      args: Record<string, unknown>;
      isExpanded: boolean;
    }
  | { kind: "tool_result"; tool: string; result: string; isExpanded: boolean };

export type Attachment = {
  id: string;
  kind: "image" | "file" | "video" | "audio";
  name: string;
  size: number;
  mimeType: string;
  dataUrl: string;
};

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; imageUrl: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "video_url"; videoUrl: { url: string } }
  | { type: "input_audio"; inputAudio: { data: string; format: string } };

export type ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[]; isExpanded: boolean };

export type Message = { role: "user" | "assistant"; blocks: ContentBlock[] };
