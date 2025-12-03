import { Header } from "@/src/features/chat/components/Header";
import Sidebar from "@/src/features/sidebar/components/Sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <Sidebar />
      <div className="relative flex-1 overflow-hidden flex flex-col">
        <Header />
        <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
