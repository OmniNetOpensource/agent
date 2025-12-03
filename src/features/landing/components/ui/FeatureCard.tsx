"use client";

import { type LucideIcon } from "lucide-react";
import { AnimatedItem } from "./AnimatedSection";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <AnimatedItem>
      <div className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] p-6 transition-all duration-300 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--surface-muted)]">
          <Icon className="h-6 w-6 text-[var(--text-secondary)]" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </AnimatedItem>
  );
}
