"use client";

import { motion } from "framer-motion";
import { howItWorks } from "../../data/content";
import { AnimatedSection } from "../ui/AnimatedSection";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <AnimatedSection className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            How It Works
          </h2>
          <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
            A simple, transparent process that puts you in control.
          </p>
        </AnimatedSection>

        <div className="relative">
          {/* Connection line */}
          <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-[var(--border-subtle)] md:block" />
          <div className="absolute left-8 top-0 block h-full w-px bg-[var(--border-subtle)] md:hidden" />

          <div className="space-y-12 md:space-y-0">
            {howItWorks.map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: index * 0.15 }}
                className={`relative flex items-start gap-6 md:items-center md:gap-8 ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Step number */}
                <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-base)] md:mx-auto">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">
                    {item.step}
                  </span>
                </div>

                {/* Content */}
                <div
                  className={`flex-1 md:w-1/2 md:flex-none ${
                    index % 2 === 0 ? "md:text-right md:pr-16" : "md:text-left md:pl-16"
                  }`}
                >
                  <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </h3>
                  <p className="text-[var(--text-secondary)]">{item.description}</p>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden flex-1 md:block" />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
