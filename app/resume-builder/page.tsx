"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type AnalyzedResume = {
  id: string;
  file_name: string;
  target_role: string | null;
  ats_score: number | null;
  uploaded_at: string;
  updated_at: string;
  is_current: boolean;
  analysis: Record<string, unknown> | null;
};

export default function ResumeBuilderPage() {
  const router = useRouter();

  const [analyzedResumes, setAnalyzedResumes] = useState<AnalyzedResume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [showAnalyzedResumes, setShowAnalyzedResumes] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;

    const loadAnalyzedResumes = async () => {
      setLoadingResumes(true);
      setLoadError("");

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/login");
          return;
        }

        const { data, error } = await supabase
          .from("user_resumes")
          .select(
            "id, file_name, target_role, ats_score, uploaded_at, updated_at, is_current, analysis"
          )
          .eq("user_id", authData.user.id)
          .not("analysis", "is", null)
          .order("is_current", { ascending: false })
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (!active) return;

        setAnalyzedResumes((data || []) as AnalyzedResume[]);
      } catch (error) {
        console.error("Could not load analyzed resumes:", error);
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Could not load your analyzed resumes."
          );
        }
      } finally {
        if (active) setLoadingResumes(false);
      }
    };

    void loadAnalyzedResumes();

    return () => {
      active = false;
    };
  }, [router]);

  const createNewResume = () => {
    router.push("/resume-builder/editor");
  };

  const useAnalyzedResume = () => {
    setShowAnalyzedResumes(true);
    window.setTimeout(() => {
      document.getElementById("analyzed-resume-picker")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const openAnalyzedResume = (resume: AnalyzedResume) => {
    router.push(
      `/resume-builder/editor?source=analyzer&resumeId=${encodeURIComponent(resume.id)}`
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-xl font-bold tracking-tight sm:text-2xl"
          >
            VRoom <span className="text-blue-400">AI</span>
          </button>

          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            Dashboard
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-400">
            Career Tools
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Resume Builder
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Create a professional, ATS-friendly resume from scratch or rebuild
            one of your already analyzed resumes without entering the same
            information again.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <button
            onClick={createNewResume}
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:bg-slate-900/90 sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 text-2xl">
              ✨
            </div>

            <h2 className="text-xl font-bold text-white">Create New Resume</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start with a blank resume and enter your information manually.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-400 transition group-hover:text-blue-300">
              Start from scratch <span>→</span>
            </div>
          </button>

          <button
            onClick={useAnalyzedResume}
            className="group rounded-2xl border border-slate-800 bg-slate-900 p-6 text-left transition duration-200 hover:-translate-y-1 hover:border-purple-500/50 hover:bg-slate-900/90 sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-2xl">
              📄
            </div>

            <h2 className="text-xl font-bold text-white">Use Analyzed Resume</h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Choose one of your analyzed resumes. VRoom AI will bring the
              available resume information into the editor automatically.
            </p>

            <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-400 transition group-hover:text-purple-300">
              Choose analyzed resume
              <span>→</span>
            </div>
          </button>
        </div>

        {showAnalyzedResumes && (
          <section
            id="analyzed-resume-picker"
            className="mt-8 rounded-2xl border border-purple-500/20 bg-purple-500/[0.04] p-5 sm:p-6"
          >
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                  Resume Analyzer
                </p>
                <h2 className="mt-1 text-xl font-bold">Choose a resume to rebuild</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Select the exact analyzed resume you want to use.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAnalyzedResumes(false)}
                className="w-fit rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            {loadingResumes ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center text-sm text-slate-400">
                Loading your analyzed resumes...
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
                {loadError}
              </div>
            ) : analyzedResumes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center">
                <p className="font-semibold text-white">No analyzed resume found</p>
                <p className="mt-2 text-sm text-slate-400">
                  Analyze a resume first, then come back here to rebuild it.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/resume-analyzer")}
                  className="mt-5 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold hover:bg-purple-500"
                >
                  Open Resume Analyzer
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {analyzedResumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    onClick={() => openAnalyzedResume(resume)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-left transition hover:border-purple-400/50 hover:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">📄</span>
                          <h3 className="truncate font-semibold text-white">
                            {resume.file_name}
                          </h3>
                        </div>

                        <p className="mt-3 text-sm text-slate-400">
                          {resume.target_role || "No target role saved"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Analyzed{" "}
                          {new Date(
                            resume.updated_at || resume.uploaded_at
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        {resume.is_current && (
                          <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                            Current
                          </span>
                        )}

                        {resume.ats_score !== null &&
                          resume.ats_score !== undefined && (
                            <p className="mt-2 text-xs font-semibold text-cyan-300">
                              ATS {resume.ats_score}/100
                            </p>
                          )}
                      </div>
                    </div>

                    <div className="mt-5 text-sm font-semibold text-purple-300">
                      Use this resume →
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mt-12">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">Analyzed Resumes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Resumes available from Resume Analyzer.
            </p>
          </div>

          {loadingResumes ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-10 text-center text-sm text-slate-400">
              Loading resumes...
            </div>
          ) : analyzedResumes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-2xl">
                📄
              </div>
              <h3 className="text-lg font-semibold text-white">
                No analyzed resumes yet
              </h3>
              <button
                onClick={() => router.push("/resume-analyzer")}
                className="mt-6 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
              >
                Analyze a Resume
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analyzedResumes.map((resume) => (
                <div
                  key={resume.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="text-3xl">📄</div>
                    {resume.is_current && (
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                        Current
                      </span>
                    )}
                  </div>

                  <h3 className="truncate font-semibold text-white">
                    {resume.file_name}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {resume.target_role || "No target role saved"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Updated{" "}
                    {new Date(
                      resume.updated_at || resume.uploaded_at
                    ).toLocaleDateString()}
                  </p>

                  <button
                    onClick={() => openAnalyzedResume(resume)}
                    className="mt-5 w-full rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-purple-500 hover:text-white"
                  >
                    Rebuild This Resume
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 sm:p-6">
          <div className="flex gap-4">
            <div className="text-xl">🛡️</div>
            <div>
              <h3 className="font-semibold text-white">
                Your factual information stays protected
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                VRoom AI can improve wording and structure, but it should not
                invent missing experience, education, projects or personal
                details. Review the resume before downloading.
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
