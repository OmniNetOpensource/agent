import { mutationGeneric } from "convex/server";
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

export const upsertConversation = mutationGeneric({
  args: {
    conversationId: v.string(),
    created_at: v.string(),
    updated_at: v.string(),
    messages: v.array(message),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cloudConversations")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .first();

    if (existing) {
      // Only update if the incoming timestamp is newer to prevent race conditions
      // where slower earlier requests overwrite newer data
      if (args.updated_at > existing.updated_at) {
        await ctx.db.patch(existing._id, {
          updated_at: args.updated_at,
          messages: args.messages,
        });
      }
      return;
    }

    await ctx.db.insert("cloudConversations", {
      conversationId: args.conversationId,
      created_at: args.created_at,
      updated_at: args.updated_at,
      messages: args.messages,
    });
  },
});
