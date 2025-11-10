"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";
import "katex/dist/katex.min.css";

type Props = {
  content: string;
};

export default function Markdown({ content }: Props) {
  return (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          // 自定义链接样式
          a: ({ ...props }) => (
            <a
              {...props}
              className="text-blue-400 hover:text-blue-300 underline"
              target="_blank"
              rel="noopener noreferrer"
            />
          ),
          // 自定义代码块样式
          pre: ({ ...props }) => (
            <pre
              {...props}
              className="!bg-black/40 !border !border-white/10 rounded-lg overflow-x-auto"
            />
          ),
          // 自定义行内代码样式
          code: ({ className, ...props }) => {
            const isInline = !className || !className.includes("language-");
            if (isInline) {
              return (
                <code
                  {...props}
                  className="!bg-white/10 !text-blue-300 px-1.5 py-0.5 rounded"
                />
              );
            }
            return <code {...props} className={className} />;
          },
          // 自定义表格样式
          table: ({ ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} className="border-collapse border border-white/20" />
            </div>
          ),
          th: ({ ...props }) => (
            <th
              {...props}
              className="border border-white/20 bg-white/5 px-4 py-2"
            />
          ),
          td: ({ ...props }) => (
            <td {...props} className="border border-white/20 px-4 py-2" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
