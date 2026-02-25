"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Shield, Zap, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import CodeReviewDemo from "./code-review-demo";
import LandingFooter from "./landing-footer";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Analysis",
    description:
      "Advanced models understand your code context and provide meaningful, actionable feedback.",
  },
  {
    icon: Shield,
    title: "Security Scanning",
    description:
      "Automatically detect vulnerabilities, injection risks, and unsafe patterns before they reach production.",
  },
  {
    icon: Zap,
    title: "Instant Reviews",
    description:
      "Get comprehensive code reviews in seconds, not hours. Ship faster with confidence.",
  },
  {
    icon: GitBranch,
    title: "Git Integration",
    description:
      "Seamlessly integrates with your GitHub workflow. Reviews on every pull request, automatically.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = () => router.push("/login");

  const ease: [number, number, number, number] = [0.25, 0.4, 0.25, 1];

  const fadeInUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.7, ease },
    },
  };

  const fadeInLeft = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease },
    },
  };

  const fadeInRight = {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease },
    },
  };

  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.12 } },
  };

  const staggerFast = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08 } },
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-zinc-950 via-zinc-900 to-neutral-900 text-zinc-100 dark overflow-x-hidden">
      {/* ── Background effects ────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-zinc-700/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/3 right-0 h-96 w-96 rounded-full bg-slate-500/10 blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute bottom-1/4 left-1/4 h-64 w-64 rounded-full bg-zinc-600/8 blur-3xl animate-pulse [animation-delay:2s]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.04),transparent_45%)]" />
      </div>

      {/* ── Header ────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50 shadow-[0_1px_12px_rgba(0,0,0,0.3)]"
            : ""
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-zinc-300/80 shadow-[0_0_20px_rgba(212,212,216,0.2)]" />
            <span className="text-lg font-bold tracking-tight">CodeSight</span>
          </div>

          <button
            onClick={handleLogin}
            className="px-5 py-2 text-sm font-medium text-zinc-300 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-all duration-200 cursor-pointer hover:bg-zinc-800/50"
          >
            Login
          </button>
        </div>
      </header>

      {/* ── Hero — text left, demo right ──────────────────────── */}
      <section className="relative pt-32 pb-20 px-6 z-10">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Left — copy */}
          <motion.div
            className="flex-1 max-w-xl"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.div variants={fadeInLeft} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-700/60 bg-zinc-800/40 text-xs text-zinc-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                AI-Powered Code Reviews
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInLeft}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.08] tracking-tight mb-6"
            >
              Cut Code Review Time
              <br />
              <span className="text-zinc-400">&amp; Bugs in Half.</span>
            </motion.h1>

            <motion.p
              variants={fadeInLeft}
              className="text-lg text-zinc-400 mb-10 leading-relaxed"
            >
              Supercharge your team with AI-powered code analysis that catches
              bugs, security vulnerabilities, and quality issues before they
              reach production.
            </motion.p>

            <motion.div variants={fadeInLeft}>
              <button
                onClick={handleLogin}
                className="group inline-flex items-center gap-2 px-7 py-3 bg-zinc-100 text-zinc-900 rounded-lg font-semibold text-sm hover:bg-white transition-all duration-200 cursor-pointer shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-px active:scale-[0.985]"
              >
                Get Started Free
                <ArrowRight
                  size={16}
                  className="group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            </motion.div>
          </motion.div>

          {/* Right — demo */}
          <motion.div
            className="flex-1 w-full min-w-0"
            initial="hidden"
            animate="visible"
            variants={fadeInRight}
          >
            <CodeReviewDemo />
          </motion.div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="relative py-28 px-6 z-10">
        <motion.div
          className="max-w-5xl mx-auto"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Built for Modern Teams
            </h2>
            <p className="text-zinc-400 text-lg">
              Everything you need to ship better code, faster
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-2 gap-5"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={staggerFast}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeInUp}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="group p-6 rounded-xl border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/40 hover:border-zinc-700/60 transition-colors duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center mb-4 group-hover:bg-zinc-700/80 transition-colors duration-300">
                  <f.icon size={20} className="text-zinc-300" />
                </div>
                <h3 className="text-[15px] font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="relative py-28 px-6 z-10">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold mb-4"
          >
            Ready to Ship Better Code?
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-zinc-400 text-lg mb-8"
          >
            Join developers who review code smarter, not harder.
          </motion.p>
          <motion.div variants={fadeInUp}>
            <button
              onClick={handleLogin}
              className="group inline-flex items-center gap-2 px-8 py-3.5 bg-zinc-100 text-zinc-900 rounded-lg font-semibold hover:bg-white transition-all duration-200 cursor-pointer shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-px active:scale-[0.985]"
            >
              Get Started — It&apos;s Free
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <LandingFooter />
    </div>
  );
}
