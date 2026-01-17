"use client";

import Link from "next/link";
import { HeroVideo } from "@/components/HeroVideo";
import { TypewriterText } from "@/components/TypewriterText";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-2xl font-semibold text-slate-900 tracking-tight">
            healthier
          </Link>

          <nav className="hidden md:flex items-center gap-10">
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all hover:scale-105"
            >
              Demo App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-slate-900 min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 xl:gap-24 items-center">
            {/* Left: Text */}
            <div className="order-2 lg:order-1 relative z-10 pr-0 lg:pr-8">
              <h1 className="opacity-0 animate-fade-in-up text-5xl md:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-[1.1] tracking-tight break-words">
                <TypewriterText />
              </h1>
              
              <p className="opacity-0 animate-fade-in-up animation-delay-100 text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
                Comprehensive health management for better at-home care and seamless clinic coordination.
              </p>
              
              <div className="opacity-0 animate-fade-in-up animation-delay-200">
                <Link 
                  href="/dashboard" 
                  className="group inline-flex items-center gap-2 px-6 py-3.5 text-base font-medium text-slate-900 bg-white rounded-full hover:bg-slate-100 transition-all hover:scale-105"
                >
                  Try the demo
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right: Hero video */}
            <div className="order-1 lg:order-2 opacity-0 animate-slide-in-right animation-delay-200 relative z-0">
              <div className="relative w-full">
                <HeroVideo />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Care Section */}
      <section className="py-28 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mb-6 tracking-tight">
            Better care, everywhere
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Empowering patients at home with voice-guided support while giving clinicians 
            real-time insights for seamless care coordination. One platform for better outcomes 
            both in the home and in the clinic.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-slate-500">
            healthier — Medication adherence made simple.
          </p>
          <div className="flex items-center gap-8">
            <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Log in
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
