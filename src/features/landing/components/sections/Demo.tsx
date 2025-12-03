"use client";

import { motion } from "framer-motion";
import { Search, Loader2, Bot, User } from "lucide-react";
import { AnimatedSection } from "../ui/AnimatedSection";
import { demoMessages } from "../../data/content";

export function Demo() {
  return (
    <section id="demo" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <AnimatedSection className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            See It in Action
          </h2>
          <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
            Watch how Aether researches and responds to your questions with full
            transparency.
          </p>
        </AnimatedSection>

        <AnimatedSection delay={0.2}>
          <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-[var(--shadow-card)]">
            {/* Window header */}
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-[var(--text-tertiary)] opacity-40" />
                <div className="h-3 w-3 rounded-full bg-[var(--text-tertiary)] opacity-40" />
                <div className="h-3 w-3 rounded-full bg-[var(--text-tertiary)] opacity-40" />
              </div>
              <div className="flex-1 text-center text-sm text-[var(--text-tertiary)]">
                Aether Chat
              </div>
            </div>

            {/* Chat messages */}
            <div className="space-y-4 p-6">
              {demoMessages.map((message, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.3 }}
                  className={`flex gap-3 ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-muted)]">
                      <Bot className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                  )}

                  <div
                    className={`flex max-w-md flex-col gap-2 ${
                      message.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    {/* Thinking indicator */}
                    {message.thinking && (
                      <div className="inline-flex items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--text-secondary)]">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {message.thinking}
                      </div>
                    )}

                    {/* Tool call indicator */}
                    {message.toolCall && (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-3 py-2 text-sm">
                        <Search className="h-3 w-3 text-[var(--text-secondary)]" />
                        <span className="text-[var(--text-secondary)]">
                          {message.toolCall.name}
                        </span>
                        {message.toolCall.status === "searching" && (
                          <Loader2 className="h-3 w-3 animate-spin text-[var(--text-tertiary)]" />
                        )}
                      </div>
                    )}

                    {/* Message content */}
                    {message.content && (
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === "user"
                            ? "bg-[var(--button-primary-bg)] text-[var(--button-primary-text)]"
                            : "bg-[var(--surface-muted)] text-[var(--text-primary)]"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.content}
                        </p>
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-user)]">
                      <User className="h-4 w-4 text-[var(--text-secondary)]" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
