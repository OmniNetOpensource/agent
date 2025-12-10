export type DashboardStatsResponse = {
  userMessageCount: number;
  conversationCount: number;
};

export type LocalDashboardStats = {
  conversationCount: number;
  messageCount: number;
};

export type SyncResponse = {
  success: boolean;
  syncedConversations: number;
  syncedMessages: number;
  errors?: string[];
};

