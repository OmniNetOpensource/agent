"use client";

import { Streamdown } from "streamdown";
import { code } from "@streamdown/code";
import { math } from "@streamdown/math";
import { cjk } from "@streamdown/cjk";

type Props = {
  content: string;
  isAnimating?: boolean;
};

const plugins = { code, math, cjk };

export default function Markdown({ content, isAnimating = false }: Props) {
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <Streamdown plugins={plugins} isAnimating={isAnimating}>
        {content}
      </Streamdown>
    </div>
  );
}
