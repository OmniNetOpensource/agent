"use client";

import dynamic from "next/dynamic";

const Markdown = dynamic(() => import("./Markdown"), {
  loading: () => (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
    </div>
  ),
  ssr: false,
});

export default Markdown;
