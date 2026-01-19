import Sidebar from "@/src/features/sidebar/components/Sidebar";
import { NewChatButton } from "@/src/features/sidebar/components/NewChatButton";
import { SidebarToggleButton } from "@/src/features/sidebar/components/SidebarToggleButton";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen bg-background text-foreground">
      <Sidebar />
      <div className="relative flex-1 min-w-0 flex flex-col p-2 md:p-3 lg:p-4">
        <div className="flex items-center h-12 px-1 border border-b-0 border-(--border-subtle) rounded-t-xl bg-(--surface-base)">
          <SidebarToggleButton />
          <div className="flex-1" />
          <NewChatButton variant="topbar" />
        </div>
        <div className="flex-1 min-h-0 flex flex-col border border-t-0 border-(--border-subtle) rounded-b-xl bg-(--surface-base) overflow-hidden">
          {children}
        </div>
      </div>
      <PreviewPanel />
    </div>
  );
}
