// app/c/[conversationId]/page.tsx
import ChatPageClient from "@/components/ChatPageClient";

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  await params;
  return <ChatPageClient />;
}
