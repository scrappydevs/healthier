"use server";

import { cookies } from "next/headers";

export type LoginState = {
  ok: boolean;
  message?: string;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { ok: false, message: "Email is required." };
  if (!email.includes("@")) return { ok: false, message: "Enter a valid email." };
  if (!password) return { ok: false, message: "Password is required." };

  const jar = await cookies();

  jar.set("healthier_session", "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  jar.set("healthier_email", email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return { ok: true, message: "Signed in successfully." };
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete("healthier_session");
  jar.delete("healthier_email");
}
