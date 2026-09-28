"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../lib/supabase";
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Logging in...");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

if (error) {
  console.error("Supabase login error:", error);
  setMessage(error.message);
  return;
}
    setMessage("Login successful!");
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-6 text-3xl font-bold">Login</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border p-3"
            required
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-black p-3 text-white"
          >
            Login
          </button>
        </form>

        {message && <p className="mt-4 text-sm">{message}</p>}

        <p className="mt-4 text-sm">
          Account nahi hai?{" "}
          <a href="/signup" className="font-semibold underline">
            Sign up
          </a>
        </p>
      </div>
    </main>
  );
}