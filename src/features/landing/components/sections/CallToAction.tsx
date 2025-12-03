"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedSection } from "../ui/AnimatedSection";

export function CallToAction() {
  return (
    <section className="px-4 py-24">
      <AnimatedSection>
        <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-8 text-center sm:p-12">
          <h2 className="mb-4 text-3xl font-bold text-[var(--text-primary)] sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mb-8 text-[var(--text-secondary)]">
            Experience the future of AI-powered research. No signup required.
          </p>
          <Button asChild size="lg" className="gap-2">
            <Link href="/c/new">
              Start Your First Chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AnimatedSection>
    </section>
  );
}
