import Sidebar from "@/src/features/sidebar/components/Sidebar";
import { ChatRoom } from "./components/ChatRoom";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen bg-(--surface-primary) text-foreground">
      <Sidebar />
      <div className="relative flex-1 min-w-0 flex gap-2 p-2 md:p-3 lg:p-4">
        {/* 主内容区（带边框） */}
        <ChatRoom>{children}</ChatRoom>
      </div>
    </div>
  );
}
