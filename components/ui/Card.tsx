"use client";

import type { HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "sm" | "md";
};

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-6",
};

const cx = (...classes: Array<string | undefined | false>) =>
  classes.filter(Boolean).join(" ");

export function Card({ padding = "md", className, ...props }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-(--border-subtle) bg-(--surface-card) shadow-sm",
        paddingClasses[padding],
        className
      )}
      {...props}
    />
  );
}
