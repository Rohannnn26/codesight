"use client";

import { useState } from "react";
import { GithubIcon } from "lucide-react";
import { signIn } from "@/lib/auth-client";

const LoginUI = () => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGithubSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn.social({
        provider: "github",
      });
    } catch (error) {
      console.error("Error during GitHub sign-in:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-neutral-900 text-zinc-100 dark flex">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-zinc-700/10 blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-slate-500/10 blur-3xl animate-pulse [animation-delay:1000ms]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.05),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.04),transparent_45%)]" />
      </div>

      <div className="flex-1 flex flex-col justify-center px-12 py-16">
        <div className="max-w-lg">
          <div className="mb-16">
            <div className="inline-flex items-center gap-2 text-2xl font-bold">
              <div className="w-8 h-8 rounded-full bg-zinc-300/80 shadow-[0_0_24px_rgba(212,212,216,0.25)]" />
              <span>CodeSight</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold mb-6 leading-tight text-balance">
            Cut Code Review Time &amp; Bugs in Half. <span className="block">Instantly.</span>
          </h1>

          <p className="text-lg text-zinc-400 leading-relaxed">
            Supercharge your team to ship faster with the most advanced AI code reviews.
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center px-12 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
            <p className="text-zinc-400">Login using one of the following providers:</p>
          </div>

          <button
            onClick={handleGithubSignIn}
            disabled={isLoading}
            className="group relative w-full py-3 px-4 bg-zinc-100 text-zinc-900 rounded-lg font-semibold hover:bg-white active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed enabled:cursor-pointer transition-all duration-200 ease-out flex items-center justify-center gap-3 mb-8 shadow-[0_1px_0_rgba(255,255,255,0.2)_inset,0_8px_30px_rgba(0,0,0,0.25)] hover:-translate-y-[1px]"
          >
            <span className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-white/10 via-zinc-200/20 to-white/10" />
            <GithubIcon size={20} className="relative" />
            {isLoading ? "Signing in..." : "GitHub"}
          </button>

          <div className="space-y-4 text-center text-sm text-zinc-400">
            <div>
              New to CodeSight?{" "}
              <a href="#" className="text-zinc-200 hover:text-white font-semibold transition-colors duration-200 cursor-pointer">
                Sign Up
              </a>
            </div>
            <div>
              <a href="#" className="text-zinc-200 hover:text-white font-semibold transition-colors duration-200 cursor-pointer">
                Self-Hosted Services
              </a>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-zinc-700/60 flex justify-center gap-4 text-xs text-zinc-500">
            <a href="#" className="hover:text-zinc-300 transition-colors duration-200 cursor-pointer">
              Terms of Use
            </a>
            <span>and</span>
            <a href="#" className="hover:text-zinc-300 transition-colors duration-200 cursor-pointer">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginUI;
