"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-20">
      {/* Background decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-[var(--text-tertiary)] opacity-[0.03] blur-3xl"
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute -right-20 bottom-1/4 h-96 w-96 rounded-full bg-[var(--text-tertiary)] opacity-[0.03] blur-3xl"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-block rounded-full border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-1.5 text-sm text-[var(--text-secondary)]">
            AI-Powered Research Assistant
          </span>
        </motion.div>

        <motion.h1
          className="mb-6 text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl md:text-6xl lg:text-7xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          The Invisible Medium
          <br />
          <span className="text-[var(--text-secondary)]">of Knowledge</span>
        </motion.h1>

        <motion.p
          className="mx-auto mb-8 max-w-2xl text-lg text-[var(--text-secondary)] sm:text-xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          An AI chat experience that searches, analyzes, and synthesizes
          information from across the web. Watch the thinking process unfold in
          real-time.
        </motion.p>

        <motion.div
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button asChild size="lg" className="gap-2">
            <Link href="/c/new">
              Start Chatting
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="#features">Learn More</a>
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.div
          className="flex h-8 w-5 items-start justify-center rounded-full border border-[var(--border-subtle)] p-1"
          animate={{ y: [0, 5, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <div className="h-1.5 w-1 rounded-full bg-[var(--text-tertiary)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
