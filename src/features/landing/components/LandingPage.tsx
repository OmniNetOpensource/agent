"use client";

import { LandingNav } from "./LandingNav";
import { Hero } from "./sections/Hero";
import { Features } from "./sections/Features";
import { Demo } from "./sections/Demo";
import { HowItWorks } from "./sections/HowItWorks";
import { CallToAction } from "./sections/CallToAction";
import { Footer } from "./sections/Footer";

export function LandingPage() {
  return (
    <div className="h-screen overflow-y-auto bg-background">
      <LandingNav />
      <main>
        <Hero />
        <Features />
        <Demo />
        <HowItWorks />
        <CallToAction />
      </main>
      <Footer />
    </div>
  );
}
