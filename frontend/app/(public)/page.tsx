"use client";

import { useState } from "react";
import Link from "next/link";
import { HeroVideo } from "@/components/HeroVideo";
import { createClient } from "@/lib/supabase";

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        setError("Supabase not configured. Please set environment variables.");
        setIsLoading(false);
        return;
      }
      
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (authError) {
        setError(authError.message);
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
      setIsLoading(false);
    }
  };

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
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                "Signing in..."
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Sign in
                </>
              )}
            </button>
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
              <h1 className="opacity-0 animate-fade-in-up text-5xl md:text-6xl lg:text-7xl font-semibold text-white leading-[1.1] tracking-tight mb-6">
                Track your exercise.
              </h1>
              
              <p className="opacity-0 animate-fade-in-up animation-delay-100 text-lg md:text-xl text-slate-400 leading-relaxed mb-10">
                Comprehensive health management for better at-home care and seamless clinic coordination.
              </p>
              
              <div className="opacity-0 animate-fade-in-up animation-delay-200 space-y-3">
                <button 
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="group inline-flex items-center gap-3 px-6 py-3.5 text-base font-medium text-slate-900 bg-white rounded-full hover:bg-slate-100 transition-all hover:scale-105 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {isLoading ? "Signing in..." : "Sign in with Google"}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3" />
                  </svg>
                </button>
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
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
