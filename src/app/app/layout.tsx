import Sidebar from "@/src/features/sidebar/components/Sidebar";
import { NewChatButton } from "@/src/features/sidebar/components/NewChatButton";
import { SidebarToggleButton } from "@/src/features/sidebar/components/SidebarToggleButton";
import { SelectionQuotePopup } from "@/src/features/chat/components/SelectionQuotePopup";
import { PreviewButton } from "@/src/features/preview/components/PreviewButton";
import { PreviewPanel } from "@/src/features/preview/components/PreviewPanel";
import { PreviewList } from "@/src/features/preview/components/PreviewList";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex h-screen w-screen bg-background text-foreground">
      <Sidebar />
      <div className="relative flex-1 min-w-0 flex gap-2 p-2 md:p-3 lg:p-4">
        {/* 主内容区（带边框） */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center h-12 px-1 border border-b-0 border-(--border-subtle) rounded-t-xl bg-(--surface-base)">
            <SidebarToggleButton />
            <div className="flex-1" />
            <PreviewButton />
            <NewChatButton variant="topbar" />
          </div>
          <div className="flex-1 min-h-0 flex flex-col border border-t-0 border-(--border-subtle) rounded-b-xl bg-(--surface-base) overflow-hidden">
            {children}
          </div>
        </div>
        {/* PreviewList（带边框，独立区域） */}
        <PreviewList />
        {/* PreviewPanel（带边框，独立区域） */}
        <PreviewPanel />
      </div>
      <SelectionQuotePopup />
    </div>
  );
}
