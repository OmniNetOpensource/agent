import Sidebar from "@/src/features/sidebar/components/Sidebar";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { PreviewList } from "@/src/features/preview/components/PreviewList";
import { ChatRoom } from "./components/ChatRoom";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen bg-(--surface-primary) text-foreground">
      <Sidebar />
      <div className="relative flex-1 min-w-0 flex gap-2 p-2 md:p-3 lg:p-4">
        {/* 主内容区（带边框） */}
        <ChatRoom>{children}</ChatRoom>
        {/* PreviewList（带边框，独立区域） */}
        <PreviewList />
        {/* PreviewPanel（带边框，独立区域） */}
        <PreviewPanel />
      </div>
    </div>
  );
}
