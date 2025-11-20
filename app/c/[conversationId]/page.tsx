// app/c/[conversationId]/page.tsx
import { ChatPage } from "@/app/page";

type ConversationPageProps = {
  params: { conversationId: string };
};

export default function ConversationPage({ params }: ConversationPageProps) {
  void params;
  return <ChatPage />;
}
