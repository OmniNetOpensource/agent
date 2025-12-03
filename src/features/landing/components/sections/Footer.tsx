"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] px-4 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            Aether
          </span>
          <span className="text-sm text-[var(--text-tertiary)]">
            The invisible medium of knowledge
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Link
            href="/c/new"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Start Chatting
          </Link>
          <a
            href="#features"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            How It Works
          </a>
        </div>

        <p className="text-sm text-[var(--text-tertiary)]">
          © {new Date().getFullYear()} Aether
        </p>
      </div>
    </footer>
  );
}
