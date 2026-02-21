"use client";

import { motion } from "framer-motion";

export default function LandingFooter() {
  return (
    <motion.footer
      className="relative border-t border-zinc-800/50"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.6 }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm text-zinc-500">
          <div className="w-4 h-4 rounded-full bg-zinc-600/60" />
          <span>&copy; 2026 CodeSight</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-zinc-500">
          <a
            href="#"
            className="hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            Terms
          </a>
          <a
            href="#"
            className="hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            Privacy
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zinc-300 transition-colors duration-200 cursor-pointer"
          >
            GitHub
          </a>
        </div>
      </div>
    </motion.footer>
  );
}
