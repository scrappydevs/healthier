import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-6xl justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Log in</CardTitle>
            <CardDescription>
              Access the Healthier clinician dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />

            <div className="mt-6 text-sm text-neutral-500">
              <Link className="hover:text-neutral-950 transition-colors" href="/">
                Back to home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
