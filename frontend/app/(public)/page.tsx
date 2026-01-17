import Link from "next/link";
import { HeroVideo } from "@/components/HeroVideo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-sage-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="text-3xl font-light text-sage-900 tracking-tight" style={{ fontFamily: 'SF Pro Display, -apple-system, sans-serif' }}>
            Healthier
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            <a href="#features" className="text-sm text-sage-600 hover:text-sage-900 transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-sage-600 hover:text-sage-900 transition-colors">
              How it works
            </a>
            <a href="#about" className="text-sm text-sage-600 hover:text-sage-900 transition-colors">
              About
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="btn-pill-dark text-sm"
            >
              Demo App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section - Full height sage background with video */}
      <section className="bg-sage-400 min-h-[calc(100vh-5rem)] flex items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-16 py-16 w-full">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="order-2 lg:order-1 lg:pr-8">
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-medium text-white mb-6 leading-tight tracking-tight">
                Never miss<br />a dose again.
              </h1>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-10 max-w-lg">
                Voice-guided reminders and real-time monitoring for elderly patients.
              </p>
              
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="btn-pill-dark bg-sage-950 hover:bg-sage-900 text-base px-6 py-3">
                  Demo App
                </Link>
                <a
                  href="#how-it-works"
                  className="text-base text-white/90 hover:text-white transition-colors flex items-center gap-2 font-medium"
                >
                  Learn more
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right: Hero video - larger and prominent */}
            <div className="order-1 lg:order-2 flex justify-center lg:justify-end">
              <HeroVideo />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - White background */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-uppercase text-sage-500 mb-4">
              Features
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-sage-900">
              Everything you need
            </h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="card-inset bg-sage-50 p-8">
              <div className="w-14 h-14 rounded-2xl bg-sage-200 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-sage-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-sage-900 mb-3">
                Voice Reminders
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                Friendly voice agent guides patients through their medication schedule step by step.
              </p>
            </div>

            {/* Card 2 */}
            <div className="card-inset bg-sage-50 p-8">
              <div className="w-14 h-14 rounded-2xl bg-sage-200 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-sage-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-sage-900 mb-3">
                Smart Alerts
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                Clinicians receive instant notifications when patients miss doses or show concerning patterns.
              </p>
            </div>

            {/* Card 3 */}
            <div className="card-inset bg-sage-50 p-8">
              <div className="w-14 h-14 rounded-2xl bg-sage-200 flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-sage-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-sage-900 mb-3">
                Analytics
              </h3>
              <p className="text-sage-600 text-sm leading-relaxed">
                Track adherence trends, identify at-risk patients, and make data-driven care decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section - Sage background */}
      <section id="how-it-works" className="py-24 bg-sage-400">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="label-uppercase text-white/70 mb-4">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white">
              Simple for everyone
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* For Patients */}
            <div className="card-inset bg-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-8">
                For Patients
              </h3>
              <ol className="space-y-6">
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">01</span>
                  <div>
                    <p className="text-white mb-1">Receive a reminder</p>
                    <p className="text-sm text-white/60">Gentle notification when it is time</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">02</span>
                  <div>
                    <p className="text-white mb-1">Follow the guide</p>
                    <p className="text-sm text-white/60">Voice walks you through each pill</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">03</span>
                  <div>
                    <p className="text-white mb-1">Confirm</p>
                    <p className="text-sm text-white/60">Simple voice or tap to confirm</p>
                  </div>
                </li>
              </ol>
            </div>

            {/* For Clinicians */}
            <div className="card-inset bg-white/10 p-8">
              <h3 className="text-xl font-semibold text-white mb-8">
                For Clinicians
              </h3>
              <ol className="space-y-6">
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">01</span>
                  <div>
                    <p className="text-white mb-1">Add patients</p>
                    <p className="text-sm text-white/60">Configure schedules in minutes</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">02</span>
                  <div>
                    <p className="text-white mb-1">Monitor</p>
                    <p className="text-sm text-white/60">Real-time data and alerts</p>
                  </div>
                </li>
                <li className="flex gap-5">
                  <span className="text-2xl font-serif text-white/40">03</span>
                  <div>
                    <p className="text-white mb-1">Intervene early</p>
                    <p className="text-sm text-white/60">Support patients proactively</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* About Section - White */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-2xl mx-auto text-center">
            <p className="label-uppercase text-sage-500 mb-4">
              About
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-sage-900 mb-8">
              Built for those who need it most
            </h2>
            <p className="text-sage-600 leading-relaxed mb-10">
            Healthier addresses medication non-adherence among elderly patients and those with 
            memory impairments. Our platform bridges the gap between patients and care teams 
            with gentle reminders that feel like a helping hand.
            </p>
            <Link href="/dashboard" className="btn-pill-dark inline-block">
              Get started today
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-sage-50 border-t border-sage-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-sage-500">
            Healthier — Medication adherence made simple.
          </p>
          <div className="flex items-center gap-8">
            <Link href="/login" className="text-sm text-sage-500 hover:text-sage-900 transition-colors">
              Log in
            </Link>
            <Link href="/dashboard" className="text-sm text-sage-500 hover:text-sage-900 transition-colors">
              Dashboard
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
