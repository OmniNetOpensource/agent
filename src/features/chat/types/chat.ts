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

export type AttachmentKind = "image" | "file" | "video" | "audio";

export type AttachmentBase = {
  id: string;
  kind: AttachmentKind;
  name: string;
  size: number;
  mimeType: string;
};

export type Attachment = AttachmentBase & {
  blob: Blob;
  displayUrl: string;
};

export type SerializedAttachment = AttachmentBase & {
  url: string;
};

export type LegacyAttachment = SerializedAttachment;

export type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; imageUrl: { url: string } }
  | { type: "file"; file: { filename: string; file_data: string } }
  | { type: "video_url"; videoUrl: { url: string } }
  | { type: "input_audio"; inputAudio: { data: string; format: string } };

export type ContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: Attachment[] }
  | { type: "research"; items: ResearchItem[] }
  | { type: "error"; message: string };

export type SerializedContentBlock =
  | { type: "content"; content: string }
  | { type: "attachments"; attachments: SerializedAttachment[] }
  | { type: "research"; items: ResearchItem[] }
  | { type: "error"; message: string };

export type MessageBase<Block> = { role: "user" | "assistant"; blocks: Block[] };

export type Message = MessageBase<ContentBlock>;

export type SerializedMessage = MessageBase<SerializedContentBlock>;

export type MessageLike = Message | SerializedMessage;

export type ChatRequest = {
  conversationHistory: SerializedMessage[];
  conversationId?: string | null;
  model?: string;
  searchEnabled?: boolean;
  systemInstruction?: string;
};
