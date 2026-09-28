"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type UserProfile = {
  email: string;
  fullName: string;
  targetRole: string;
  experienceLevel: string;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile>({
    email: "",
    fullName: "",
    targetRole: "",
    experienceLevel: "Fresher",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      let saved: Partial<UserProfile> = {};

      try {
        const raw = localStorage.getItem("vroom-user-profile");
        if (raw) saved = JSON.parse(raw);
      } catch {
        // Ignore invalid local profile data.
      }

      setProfile({
        email: user.email || "",
        fullName:
          saved.fullName ||
          String(user.user_metadata?.full_name || user.user_metadata?.name || ""),
        targetRole: saved.targetRole || "",
        experienceLevel: saved.experienceLevel || "Fresher",
      });

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function updateField(field: keyof UserProfile, value: string) {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
    setMessage("");
  }

  function handleSave() {
    setSaving(true);
    setMessage("");

    try {
      localStorage.setItem(
        "vroom-user-profile",
        JSON.stringify({
          fullName: profile.fullName.trim(),
          targetRole: profile.targetRole.trim(),
          experienceLevel: profile.experienceLevel,
        })
      );

      setMessage("Profile saved successfully.");
    } catch {
      setMessage("Profile could not be saved. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b16] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Loading your profile...</p>
        </div>
      </main>
    );
  }

  const initial = (profile.fullName || profile.email || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-[#080b16] text-white">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="mb-4 text-sm text-violet-300 transition hover:text-violet-200"
            >
              ← Back to Dashboard
            </button>

            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              VRoom AI Account
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Your Profile
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Keep your career preferences ready for interviews and practice.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="self-start rounded-xl border border-red-400/20 bg-red-500/[0.06] px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/10"
          >
            Logout
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-3xl font-bold shadow-lg shadow-violet-950/30">
              {initial}
            </div>

            <h2 className="mt-5 break-words text-xl font-semibold">
              {profile.fullName.trim() || "VRoom AI User"}
            </h2>

            <p className="mt-1 break-all text-sm text-slate-400">
              {profile.email}
            </p>

            <div className="mt-6 space-y-3 border-t border-white/[0.07] pt-5">
              <div className="rounded-xl bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Target Role
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {profile.targetRole.trim() || "Not selected yet"}
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.025] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  Experience
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {profile.experienceLevel}
                </p>
              </div>
            </div>
          </aside>

          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-semibold">Career profile</h2>
              <p className="mt-1 text-sm text-slate-500">
                These details can later be connected to your VRoom AI interview
                and resume preferences.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Full name
                </span>
                <input
                  value={profile.fullName}
                  onChange={(event) =>
                    updateField("fullName", event.target.value)
                  }
                  placeholder="Enter your name"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Email
                </span>
                <input
                  value={profile.email}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-3 text-sm text-slate-500 outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Target job role
                </span>
                <input
                  value={profile.targetRole}
                  onChange={(event) =>
                    updateField("targetRole", event.target.value)
                  }
                  placeholder="e.g. Frontend Developer"
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">
                  Experience level
                </span>
                <select
                  value={profile.experienceLevel}
                  onChange={(event) =>
                    updateField("experienceLevel", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.09] bg-[#0b1020] px-4 py-3 text-sm text-white outline-none transition focus:border-violet-400/50"
                >
                  <option>Fresher</option>
                  <option>0-1 Year</option>
                  <option>1-2 Years</option>
                  <option>2-3 Years</option>
                  <option>3-5 Years</option>
                  <option>5+ Years</option>
                </select>
              </label>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>

              <button
                type="button"
                onClick={() => router.push("/mock-interview")}
                className="rounded-xl border border-white/[0.09] bg-white/[0.03] px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.06]"
              >
                Go to Mock Interview
              </button>

              {message && (
                <p className="text-sm text-emerald-300">{message}</p>
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-violet-400/10 bg-violet-500/[0.05] p-5">
              <p className="text-sm font-medium text-violet-200">
                VRoom AI progress
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Interview history, resume score, practice hours and completed
                goals will appear on your Dashboard after the progress system is
                connected.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
