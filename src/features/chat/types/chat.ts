export type ToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

export type ToolProgress = {
  stage: string;
  message: string;
  receivedBytes?: number;
  totalBytes?: number;
};

export type ToolResult = {
  result: string;
};

export type Tool = {
  call: ToolCall;
  progress?: ToolProgress[];
  result?: ToolResult;
};

export type ResearchItem =
  | { kind: "thinking"; text: string }
  | { kind: "tool"; data: Tool };

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
  | { type: "research"; items: ResearchItem[] };

export type Message = { role: "user" | "assistant"; blocks: ContentBlock[] };
