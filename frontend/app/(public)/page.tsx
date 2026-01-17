"use client";

import Link from "next/link";
import { HeroVideo } from "@/components/HeroVideo";

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
            <a href="#features" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#about" className="text-sm text-slate-500 hover:text-slate-900 transition-colors">
              About
            </a>
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

        {/* Animated gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-float animation-delay-300" />

        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-20 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left: Text */}
            <div className="order-2 lg:order-1">
              <h1 className="opacity-0 animate-fade-in-up text-5xl md:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
                Never miss<br />
                a dose again.
              </h1>
              
              <p className="opacity-0 animate-fade-in-up animation-delay-100 text-lg md:text-xl text-slate-400 leading-relaxed mb-10 max-w-lg">
                Voice-guided reminders and real-time monitoring that keeps patients safe and caregivers informed.
              </p>
              
              <div className="opacity-0 animate-fade-in-up animation-delay-200 flex flex-wrap items-center gap-4">
                <Link 
                  href="/dashboard" 
                  className="group px-6 py-3.5 text-base font-medium text-slate-900 bg-white rounded-full hover:bg-slate-100 transition-all hover:scale-105 flex items-center gap-2"
                >
                  Try the demo
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </Link>
                <a
                  href="#how-it-works"
                  className="px-6 py-3.5 text-base text-slate-300 hover:text-white transition-colors flex items-center gap-2 font-medium"
                >
                  Learn more
                </a>
              </div>
            </div>

            {/* Right: Hero video */}
            <div className="order-1 lg:order-2 opacity-0 animate-slide-in-right animation-delay-200">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl" />
                <div className="relative">
                  <HeroVideo />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-4">
              Features
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 tracking-tight">
              Everything you need
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group p-8 bg-slate-50 rounded-3xl hover-lift cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Voice Reminders
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Friendly voice agent guides patients through their medication schedule step by step.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group p-8 bg-slate-50 rounded-3xl hover-lift cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Smart Alerts
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Clinicians receive instant notifications when patients miss doses or show concerning patterns.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group p-8 bg-slate-50 rounded-3xl hover-lift cursor-default">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Analytics
              </h3>
              <p className="text-slate-600 leading-relaxed">
                Track adherence trends, identify at-risk patients, and make data-driven care decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-28 bg-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <p className="text-sm font-medium text-blue-400 uppercase tracking-wider mb-4">
              How it works
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold text-white tracking-tight">
              Simple for everyone
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* For Patients */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm hover-lift">
              <h3 className="text-xl font-semibold text-white mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </span>
                For Patients
              </h3>
              <ol className="space-y-6">
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">01</span>
                  <div>
                    <p className="text-white font-medium mb-1">Receive a reminder</p>
                    <p className="text-sm text-slate-400">Gentle notification when it is time</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">02</span>
                  <div>
                    <p className="text-white font-medium mb-1">Follow the guide</p>
                    <p className="text-sm text-slate-400">Voice walks you through each pill</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">03</span>
                  <div>
                    <p className="text-white font-medium mb-1">Confirm</p>
                    <p className="text-sm text-slate-400">Simple voice or tap to confirm</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* For Clinicians */}
            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm hover-lift">
              <h3 className="text-xl font-semibold text-white mb-8 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </span>
                For Clinicians
              </h3>
              <ol className="space-y-6">
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">01</span>
                  <div>
                    <p className="text-white font-medium mb-1">Add patients</p>
                    <p className="text-sm text-slate-400">Configure schedules in minutes</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">02</span>
                  <div>
                    <p className="text-white font-medium mb-1">Monitor</p>
                    <p className="text-sm text-slate-400">Real-time data and alerts</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-3xl font-light text-slate-600">03</span>
                  <div>
                    <p className="text-white font-medium mb-1">Intervene early</p>
                    <p className="text-sm text-slate-400">Support patients proactively</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-28 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-4">
              About
            </p>
            <h2 className="text-4xl md:text-5xl font-semibold text-slate-900 mb-8 tracking-tight">
              Built for those who need it most
            </h2>
            <p className="text-lg text-slate-600 leading-relaxed mb-10">
              healthier addresses medication non-adherence among elderly patients and those with 
              memory impairments. Our platform bridges the gap between patients and care teams 
              with gentle reminders that feel like a helping hand.
            </p>
            <Link 
              href="/dashboard" 
              className="inline-flex items-center gap-2 px-6 py-3.5 text-base font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all hover:scale-105"
            >
              Get started today
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
              </svg>
            </Link>
          </div>
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
