"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = { ok: false };

export function LoginForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  React.useEffect(() => {
    if (state.ok) {
      router.replace("/dashboard");
    }
  }, [router, state.ok]);

  return (
    <form action={formAction} className="grid gap-4">
      {state.message ? (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "border px-3 py-2 text-sm",
            state.ok
              ? "border-blue-500 bg-blue-50 text-blue-900"
              : "border-red-500 bg-red-50 text-red-900",
          )}
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-xs leading-relaxed text-neutral-500">
        Demo sign-in only. We will wire real auth when we implement the backend flow.
      </p>
    </form>
  );
}
