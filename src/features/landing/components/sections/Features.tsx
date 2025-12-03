"use client";

import { features } from "../../data/content";
import { AnimatedSection, AnimatedStagger } from "../ui/AnimatedSection";
import { FeatureCard } from "../ui/FeatureCard";

export function Features() {
  return (
    <section id="features" className="px-4 py-24">
      <div className="mx-auto max-w-6xl">
        <AnimatedSection className="mb-16 text-center">
          <h2 className="mb-4 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Everything You Need
          </h2>
          <p className="mx-auto max-w-2xl text-[var(--text-secondary)]">
            Powerful features designed to help you research, learn, and create
            with AI assistance.
          </p>
        </AnimatedSection>

        <AnimatedStagger
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          staggerDelay={0.1}
        >
          {features.map((feature) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </AnimatedStagger>
      </div>
    </section>
  );
}
