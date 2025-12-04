"use client";

import { NewChatButton } from "./NewChatButton";

export function Header() {
  return (
    <header className="flex flex-col gap-3 border-b bg-card px-3 md:px-4 lg:px-6 py-3 md:py-4">
      <div className="flex items-center gap-3 px-1 md:px-3">
        <div className="ml-auto">
          <NewChatButton />
        </div>
      </div>
    </header>
  );
}
