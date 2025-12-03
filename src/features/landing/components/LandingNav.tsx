"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { navLinks } from "../data/content";

export function LandingNav() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "border-b border-[var(--border-subtle)] bg-[var(--surface-base)]/80 backdrop-blur-lg"
            : "bg-transparent"
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold text-[var(--text-primary)]">
            Aether
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <Button asChild size="sm">
              <Link href="/c/new">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--text-primary)] md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <motion.div
          className="fixed inset-0 z-40 bg-[var(--surface-base)] pt-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="flex flex-col items-center gap-6 p-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-lg text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <Button asChild className="mt-4 w-full max-w-xs">
              <Link href="/c/new">Get Started</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </>
  );
}
