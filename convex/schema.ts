import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const toolCall = v.object({
  tool: v.string(),
  args: v.any(),
});

const toolProgress = v.object({
  stage: v.string(),
  message: v.string(),
  receivedBytes: v.optional(v.number()),
  totalBytes: v.optional(v.number()),
});

const toolResult = v.object({
  result: v.string(),
});

const tool = v.object({
  call: toolCall,
  progress: v.optional(v.array(toolProgress)),
  result: v.optional(toolResult),
});

const researchItem = v.union(
  v.object({ kind: v.literal("thinking"), text: v.string() }),
  v.object({ kind: v.literal("tool"), data: tool })
);

const block = v.union(
  v.object({ type: v.literal("content"), content: v.string() }),
  v.object({ type: v.literal("research"), items: v.array(researchItem) })
);

const message = v.object({
  role: v.union(v.literal("user"), v.literal("assistant")),
  createdAt: v.string(),
  blocks: v.array(block),
});

export default defineSchema({
  cloudConversations: defineTable({
    conversationId: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
    messages: v.array(message),
  }).index("by_conversationId", ["conversationId"]),
});
