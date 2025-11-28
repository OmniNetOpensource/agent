import { Composer } from "@/src/features/chat/components/Composer";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import ConversationClient from "./ConversationClient";

type Props = {
  params: Promise<{ conversationId: string }>;
};

export default async function ConversationPage({ params }: Props) {
  const { conversationId } = await params;

  const isNewChat = conversationId === "new";

  return (
    <div className="flex h-full w-full flex-col">
      <main className="relative flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 flex flex-col relative">
          <ConversationClient conversationId={isNewChat ? null : conversationId} />
          <Composer isNewRoute={isNewChat} />
        </div>
        <PreviewPanel />
      </main>
    </div>
  );
}
