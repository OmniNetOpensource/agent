"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseResearchCardProps = {
  icon: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick">;
  children?: ReactNode;
};

export function BaseResearchCard({
  icon,
  title,
  description,
  action,
  isActive = false,
  onClick,
  buttonProps,
  children,
}: BaseResearchCardProps) {
  const { className: buttonClassName, ...restButtonProps } =
    buttonProps ?? {};

  return (
    <div
      className={cn(
        "group/research-card rounded-lg border border-(--border-primary) bg-(--surface-secondary) p-3 transition-all duration-300 ease-in-out",
        "hover:bg-(--surface-hover)",
        isActive &&
          "relative border-l-4 border-l-(--interactive-primary) before:content-[''] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-(--interactive-primary) before:opacity-60 before:animate-pulse"
      )}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex w-full min-h-[36px] flex-nowrap items-center gap-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--interactive-primary)/30",
          !onClick && "cursor-default",
          buttonClassName
        )}
        {...restButtonProps}
      >
        <span className="flex h-4 w-4 items-center justify-center text-foreground">
          {icon}
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate font-medium text-(--text-tertiary) transition-colors group-hover/research-card:text-(--text-secondary)">
            {title}
          </span>
          {description && (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-(--text-tertiary)">
              {description}
            </span>
          )}
        </span>
        {action}
      </button>
      {children}
    </div>
  );
}
