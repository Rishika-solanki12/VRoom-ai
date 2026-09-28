"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

type SavedResume = {
  id: string; user_id: string; file_name: string; storage_path: string; file_hash: string;
  file_size: number | null; mime_type: string | null; analysis: ResumeAnalysis | null;
  target_role: string | null; job_description: string | null; ats_score: number | null;
  uploaded_at: string; updated_at: string; is_current: boolean;
};

type ResumeAnalysis = {
  candidateSummary?: string;

  skills?: {
    technical?: unknown[];
    soft?: unknown[];
    other?: unknown[];
  };

  experience?: {
    company?: string;
    role?: string;
    duration?: string;
    responsibilities?: string[] | string;
  }[];
  education?: unknown[];
  projects?: unknown[];
  certifications?: unknown[];
  achievements?: unknown[];

  strengths?: unknown[];
  weaknesses?: unknown[];
  missingInformation?: unknown[];
  resumeImprovements?: unknown[];

  atsAnalysis?: {
    atsFriendly?: boolean;
    atsScore?: number;
    keywordStrength?: string;
    formattingIssues?: unknown[];
    missingKeywords?: unknown[];
    sectionCompleteness?: unknown[];
  };

  jobMatching?: {
    matchSummary?: string;
    matchingSkills?: unknown[];
    missingSkills?: unknown[];
    relevantExperience?: unknown[];
    jobRequirements?: unknown[];
    resumeGaps?: unknown[];
    suggestions?: unknown[];
  };
};

function ResumeAnalyzerContent() {
    const router = useRouter();
  const searchParams = useSearchParams();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] =
    useState<ResumeAnalysis | null>(null);

  const [error, setError] = useState("");
  const [savedResume, setSavedResume] = useState<SavedResume | null>(null);
  const [savedResumes, setSavedResumes] = useState<SavedResume[]>([]);
  const [isLoadingSavedResume, setIsLoadingSavedResume] = useState(true);
  const [selectedFileHash, setSelectedFileHash] = useState("");
  const [resumeMessage, setResumeMessage] = useState("");

  const createFileHash = async (file: File) => {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  useEffect(() => {
    let active = true;
    const loadSavedResume = async () => {
      setIsLoadingSavedResume(true);
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (!active) return;
      if (authError || !authData.user) { setIsLoadingSavedResume(false); return; }

      const { data, error: resumeError } = await supabase
        .from("user_resumes").select("*").eq("user_id", authData.user.id)
        .order("is_current", { ascending: false }).order("updated_at", { ascending: false });
      if (!active) return;
      if (resumeError) {
        console.error("Could not load saved resume:", resumeError);
        setError(`Could not load saved resume: ${resumeError.message}`);
        setIsLoadingSavedResume(false); return;
      }
      if (data && data.length > 0) {
        const resumes = data as SavedResume[];
        const resume = resumes.find((item) => item.is_current) || resumes[0];
        setSavedResumes(resumes);
        setSavedResume(resume);
        setAnalysis(resume.analysis || null);
        setJobRole(resume.target_role || "");
        setJobDescription(resume.job_description || "");
        try {
          localStorage.setItem("vroom-resume-uploaded", "true");
          if (resume.analysis) localStorage.setItem("vroom-resume-analysis", JSON.stringify({
            analysis: resume.analysis, jobRole: resume.target_role || "",
            jobDescription: resume.job_description || "", fileName: resume.file_name,
            analyzedAt: resume.updated_at || resume.uploaded_at,
          }));
        } catch (e) { console.error("Could not restore resume locally:", e); }
      }
      setIsLoadingSavedResume(false);
    };
    void loadSavedResume();
    return () => { active = false; };
  }, []);

  // ============================================================
  // FILE UPLOAD
  // ============================================================

  const handleResumeChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/msword"];
    const lowerName = file.name.toLowerCase();
    const validType = allowedTypes.includes(file.type) || [".pdf",".doc",".docx"].some((x) => lowerName.endsWith(x));
    if (!validType) { alert("Please upload a PDF, DOC or DOCX resume."); event.target.value = ""; return; }
    if (file.size > 5 * 1024 * 1024) { alert("Resume file maximum 5 MB ka hona chahiye."); event.target.value = ""; return; }
    setError(""); setResumeMessage("");
    try {
      const hash = await createFileHash(file);
      if (savedResumes.some((item) => item.file_hash === hash)) {
        setResumeFile(null); setSelectedFileHash("");
        setResumeMessage("This resume is already uploaded.");
        event.target.value = ""; return;
      }
      setSelectedFileHash(hash); setResumeFile(file);
      setAnalysis(savedResume?.analysis || null);
      if (savedResume) setResumeMessage("A new resume is selected. Analyze it to make it current; your older resumes will stay saved.");
    } catch (e) {
      console.error("Could not fingerprint resume:", e);
      setError("Could not read this resume. Please choose the file again.");
      event.target.value = "";
    }
  };

  // ============================================================
  // REMOVE RESUME
  // ============================================================

  const removeResume = () => {
    setResumeFile(null);
    setSelectedFileHash("");
    setAnalysis(savedResume?.analysis || null);
    setError("");
    setResumeMessage("");

    const input = document.getElementById(
      "resume-upload"
    ) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  };

  // ============================================================
  // ANALYZE RESUME
  // ============================================================

  const handleAnalyze = async () => {
    setError(""); setResumeMessage("");
    if (!resumeFile) { setError(savedResume ? "To run a new analysis, choose a new or updated resume first." : "Please upload your resume first."); return; }
    if (!jobRole.trim()) { setError("Please enter the target job role."); return; }
    setIsAnalyzing(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Please log in again before analyzing your resume.");
      const user = authData.user;
      const fileHash = selectedFileHash || await createFileHash(resumeFile);
      if (savedResumes.some((item) => item.file_hash === fileHash)) { setResumeMessage("This resume is already uploaded."); return; }

      const formData = new FormData();
      formData.append("resume", resumeFile); formData.append("jobRole", jobRole.trim());
      formData.append("jobDescription", jobDescription.trim());
      const response = await fetch("/api/resume/analyze", { method: "POST", body: formData });
      const responseText = await response.text();
      let data: any = null;
      try { data = responseText ? JSON.parse(responseText) : null; }
      catch { throw new Error(`Server returned an invalid response (${response.status}).`); }
      if (!response.ok) throw new Error(data?.error || `Resume analysis failed. Server status: ${response.status}`);
      if (!data?.analysis) throw new Error("Resume analysis response is empty.");

      const safeName = resumeFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const extension = safeName.includes(".") ? safeName.split(".").pop() : "bin";
      const storagePath = `${user.id}/current-${fileHash.slice(0,16)}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, resumeFile, {
        cacheControl: "3600", upsert: true, contentType: resumeFile.type || undefined,
      });
      if (uploadError) throw new Error(`Resume storage upload failed: ${uploadError.message}`);

      const now = new Date().toISOString();
      const { error: unsetError } = await supabase
        .from("user_resumes").update({ is_current: false })
        .eq("user_id", user.id).eq("is_current", true);
      if (unsetError) {
        await supabase.storage.from("resumes").remove([storagePath]);
        throw new Error(`Could not switch current resume: ${unsetError.message}`);
      }

      const record = {
        user_id: user.id, file_name: resumeFile.name, storage_path: storagePath, file_hash: fileHash,
        file_size: resumeFile.size, mime_type: resumeFile.type || null, analysis: data.analysis,
        target_role: jobRole.trim(), job_description: jobDescription.trim(),
        ats_score: typeof data.analysis?.atsAnalysis?.atsScore === "number" ? data.analysis.atsAnalysis.atsScore : null,
        is_current: true, updated_at: now,
      };
      const { data: savedData, error: saveError } = await supabase
        .from("user_resumes").insert(record).select("*").single();
      if (saveError) {
        if (savedResume?.id) await supabase.from("user_resumes").update({ is_current: true }).eq("id", savedResume.id);
        await supabase.storage.from("resumes").remove([storagePath]);
        throw new Error(`Could not save resume record: ${saveError.message}`);
      }

      const saved = savedData as SavedResume;
      setSavedResume(saved);
      setSavedResumes((previous) => [saved, ...previous.map((item) => ({ ...item, is_current: false }))]);
      setAnalysis(data.analysis); setResumeFile(null); setSelectedFileHash("");
      setResumeMessage("Resume uploaded and analyzed successfully.");
      const input = document.getElementById("resume-upload") as HTMLInputElement | null;
      if (input) input.value = "";

      try {
        localStorage.setItem("vroom-resume-uploaded","true");
        localStorage.setItem("vroom-resume-analysis", JSON.stringify({
          analysis: data.analysis, jobRole: jobRole.trim(), jobDescription: jobDescription.trim(),
          fileName: saved.file_name, analyzedAt: saved.updated_at || now,
        }));
      } catch (e) { console.error("Could not save resume analysis locally:", e); }

      const { error: activityError } = await supabase.from("user_activities").insert({
        user_id: user.id, activity_type: "resume_analysis", title: "Resume analyzed",
        description: `Resume analyzed for ${jobRole.trim()}`,
        score: typeof data.analysis?.atsAnalysis?.atsScore === "number" ? data.analysis.atsAnalysis.atsScore : null,
        duration_minutes: 0, metadata: { file_name: saved.file_name, target_role: jobRole.trim() },
      });
      if (activityError) console.warn("Resume activity was not saved:", activityError);
    } catch (e: unknown) {
      console.error("Resume analysis error:", e);
      setError(e instanceof Error ? e.message : "Resume analysis failed. Please try again.");
    } finally { setIsAnalyzing(false); }
  };

  const makeResumeCurrent = async (resume: SavedResume) => {
    if (resume.id === savedResume?.id) return;
    setError(""); setResumeMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Please log in again.");

      const { error: unsetError } = await supabase.from("user_resumes")
        .update({ is_current: false }).eq("user_id", authData.user.id).eq("is_current", true);
      if (unsetError) throw unsetError;

      const { error: currentError } = await supabase.from("user_resumes")
        .update({ is_current: true }).eq("id", resume.id).eq("user_id", authData.user.id);
      if (currentError) {
        if (savedResume?.id) await supabase.from("user_resumes").update({ is_current: true }).eq("id", savedResume.id);
        throw currentError;
      }

      const current = { ...resume, is_current: true };
      setSavedResume(current);
      setSavedResumes((items) => items.map((item) => ({ ...item, is_current: item.id === resume.id })));
      setAnalysis(resume.analysis || null);
      setJobRole(resume.target_role || "");
      setJobDescription(resume.job_description || "");
      setResumeFile(null); setSelectedFileHash("");
      setResumeMessage(`${resume.file_name} is now your current resume.`);
      localStorage.setItem("vroom-resume-uploaded", "true");
      if (resume.analysis) localStorage.setItem("vroom-resume-analysis", JSON.stringify({
        analysis: resume.analysis, jobRole: resume.target_role || "", jobDescription: resume.job_description || "",
        fileName: resume.file_name, analyzedAt: resume.updated_at || resume.uploaded_at,
      }));
    } catch (e: unknown) {
      console.error("Could not switch current resume:", e);
      setError(e instanceof Error ? e.message : "Could not switch current resume.");
    }
  };

  const startAddingResume = () => {
    setResumeFile(null); setSelectedFileHash("");
    setResumeMessage("Choose another resume. Your older resumes will stay saved below.");
    window.setTimeout(() => {
      const input = document.getElementById("resume-upload") as HTMLInputElement | null;
      input?.click();
    }, 0);
  };

  const continueToInterview = () => router.push("/mock-interview?resumeReady=1");

  // ============================================================
  // SAFE VALUE RENDERING
  // ============================================================

  const renderValue = (
    value: unknown
  ): React.ReactNode => {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }

    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.map((item, index) => (
            <div key={index}>
              {renderValue(item)}
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      const objectValue =
        value as Record<string, unknown>;

      return (
        <div className="space-y-2">
          {Object.entries(objectValue).map(
            ([key, item]) => (
              <div
                key={key}
                className="rounded-lg border border-white/5 bg-white/[0.02] p-3"
              >
                <p className="mb-1 text-xs font-semibold capitalize text-slate-400">
                  {key.replace(
                    /([A-Z])/g,
                    " $1"
                  )}
                </p>

                <div className="text-sm text-slate-200">
                  {renderValue(item)}
                </div>
              </div>
            )
          )}
        </div>
      );
    }

    return null;
  };

  // ============================================================
  // LIST RENDERER
  // ============================================================

  const renderList = (
    items: unknown[] | undefined
  ) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          No information found.
        </p>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
          >
            {typeof item === "object" &&
            item !== null ? (
              renderValue(item)
            ) : (
              <p className="text-sm leading-6 text-slate-300">
                {String(item)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ============================================================
  // SKILL BADGES
  // ============================================================

  const renderSkills = (
    items: unknown[] | undefined
  ) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          None identified.
        </p>
      );
    }

    return (
      <div className="flex flex-wrap gap-2">
        {items.map((skill, index) => (
          <span
            key={index}
            className="rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs font-medium text-cyan-200"
          >
            {typeof skill === "object"
              ? JSON.stringify(skill)
              : String(skill)}
          </span>
        ))}
      </div>
    );
  };

  // ============================================================
  // EXPERIENCE CARD
  // ============================================================

  const renderExperience = (
    items: unknown[] | undefined
  ) => {
    if (!items || items.length === 0) {
      return (
        <p className="text-sm text-slate-500">
          No experience information found.
        </p>
      );
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => {
          if (
            typeof item !== "object" ||
            item === null
          ) {
            return (
              <div
                key={index}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
              >
                <p className="text-sm text-slate-300">
                  {String(item)}
                </p>
              </div>
            );
          }

          const experience =
            item as Record<string, unknown>;

          const company =
            typeof experience.company === "string"
              ? experience.company
              : "";

          const role =
            typeof experience.role === "string"
              ? experience.role
              : "";

          const duration =
            typeof experience.duration === "string"
              ? experience.duration
              : "";

          const responsibilities =
            experience.responsibilities;

          const hasResponsibilities =
            typeof responsibilities === "string"
              ? responsibilities.trim().length > 0
              : Array.isArray(responsibilities) &&
                responsibilities.length > 0;

          return (
            <div
              key={index}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  {role && (
                    <h4 className="text-base font-semibold text-white">
                      {String(role)}
                    </h4>
                  )}

                  {company && (
                    <p className="mt-1 text-sm font-medium text-cyan-300">
                      {String(company)}
                    </p>
                  )}
                </div>

                {duration && (
                  <span className="w-fit rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-400">
                    {String(duration)}
                  </span>
                )}
              </div>

              {hasResponsibilities && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Responsibilities
                  </p>

                  {Array.isArray(
                    responsibilities
                  ) ? (
                    <ul className="space-y-2">
                      {responsibilities.map(
                        (
                          responsibility,
                          responsibilityIndex
                        ) => (
                          <li
                            key={
                              responsibilityIndex
                            }
                            className="flex gap-2 text-sm leading-6 text-slate-300"
                          >
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />

                            <span>
                              {typeof responsibility ===
                              "object"
                                ? renderValue(
                                    responsibility
                                  )
                                : String(
                                    responsibility
                                  )}
                            </span>
                          </li>
                        )
                      )}
                    </ul>
                  ) : (
                    <div className="text-sm leading-6 text-slate-300">
                      {renderValue(
                        responsibilities
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ============================================================
  // SECTION COMPONENT
  // ============================================================

  const AnalysisSection = ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section className="rounded-3xl border border-white/[0.07] bg-slate-900/70 p-5 shadow-xl backdrop-blur-xl sm:p-6">
      <h2 className="mb-5 text-lg font-semibold text-white">
        {title}
      </h2>

      {children}
    </section>
  );

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-purple-600/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="mb-5 text-sm text-slate-400 transition hover:text-white"
          >
            ← Back
          </button>

          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-blue-400">
            VRoom AI
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Resume Analyzer
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 sm:text-base">
            Upload your resume and tell VRoom which
            job you are targeting. VRoom will analyze
            your actual resume, ATS readiness and job
            relevance.
          </p>

          {searchParams.get("returnTo") === "mock-interview" && (
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.06] px-4 py-3 text-sm text-cyan-200">
              Resume-Based Interview setup is waiting for you. Use your saved resume or analyze a new one, then continue to the Mock Interview configuration screen.
            </div>
          )}
        </header>

        {/* =====================================================
            UPLOAD / INPUT SECTION
        ====================================================== */}

        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          {/* Left */}
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl backdrop-blur-xl sm:p-7">
            <div className="mb-6">
              <h2 className="text-xl font-semibold">
                Your Resume
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Upload your latest resume in PDF,
                DOC or DOCX format.
              </p>
            </div>

            {isLoadingSavedResume && !resumeFile ? (
              <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-sm text-slate-400">Loading your saved resume...</div>
            ) : savedResume && !resumeFile ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">📄</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">{savedResume.file_name}</p>
                    <p className="mt-1 text-xs text-slate-400">{savedResume.file_size ? `${(savedResume.file_size/1024/1024).toFixed(2)} MB` : "Saved resume"}</p>
                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400"><span>✓</span><span>Resume Uploaded</span></div>
                    <p className="mt-2 text-xs text-slate-500">Last updated: {new Date(savedResume.updated_at || savedResume.uploaded_at).toLocaleString()}</p>
                    <button type="button" onClick={startAddingResume} className="mt-4 inline-flex rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-200 transition hover:bg-blue-500/20">+ Add Resume</button>
                    <input id="resume-upload" type="file" accept=".pdf,.doc,.docx" onChange={handleResumeChange} className="hidden" />
                  </div>
                </div>
              </div>
            ) : !resumeFile ? (
              <label
                htmlFor="resume-upload"
                className="group flex min-h-[230px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 px-6 text-center transition hover:border-blue-500/60 hover:bg-blue-500/5"
              >
                <input
                  id="resume-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />

                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-3xl transition group-hover:scale-105">
                  📄
                </div>

                <h3 className="text-base font-semibold">
                  Upload your resume
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  PDF, DOC or DOCX
                </p>

                <span className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold transition group-hover:bg-blue-500">
                  Choose Resume
                </span>

                <p className="mt-3 text-xs text-slate-500">
                  Maximum file size: 5 MB
                </p>
              </label>
            ) : (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-2xl">
                    📄
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-white">
                      {resumeFile.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {(
                        resumeFile.size /
                        1024 /
                        1024
                      ).toFixed(2)}{" "}
                      MB
                    </p>

                    <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400">
                      <span>✓</span>
                      <span>
                        Resume selected
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={removeResume}
                    className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}

            {savedResumes.length > 0 && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">My Resumes</h3>
                    <p className="mt-1 text-xs text-slate-500">Click an older resume to make it current.</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs text-slate-400">{savedResumes.length} saved</span>
                </div>
                <div className="space-y-2">
                  {savedResumes.map((item) => (
                    <button key={item.id} type="button" onClick={() => void makeResumeCurrent(item)}
                      className={`w-full rounded-xl border p-4 text-left transition ${item.id === savedResume?.id ? "border-emerald-500/30 bg-emerald-500/[0.06]" : "border-slate-800 bg-slate-950/60 hover:border-blue-500/40"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{item.file_name}</p>
                          <p className="mt-1 text-xs text-slate-400">{item.target_role || "No target role saved"}</p>
                          <p className="mt-1 text-[11px] text-slate-600">{new Date(item.updated_at || item.uploaded_at).toLocaleDateString()}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          {item.id === savedResume?.id ? <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">Current</span> : <span className="text-[11px] font-medium text-blue-300">Make Current →</span>}
                          {item.ats_score !== null && item.ats_score !== undefined && <p className="mt-2 text-xs text-cyan-300">ATS {item.ats_score}/100</p>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Job Role */}
            <div className="mt-7">
              <label
                htmlFor="job-role"
                className="mb-2 block text-sm font-semibold"
              >
                Target Job Role
              </label>

              <input
                id="job-role"
                type="text"
                value={jobRole}
                onChange={(e) =>
                  setJobRole(e.target.value)
                }
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Job Description */}
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-3">
                <label
                  htmlFor="job-description"
                  className="block text-sm font-semibold"
                >
                  Job Description
                </label>

                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-400">
                  Optional
                </span>
              </div>

              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(e) =>
                  setJobDescription(
                    e.target.value
                  )
                }
                placeholder="Paste the company's job description here..."
                rows={8}
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3.5 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {resumeMessage && (
              <div className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4 text-sm leading-6 text-cyan-200">{resumeMessage}</div>
            )}
            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm leading-6 text-red-300">
                {error}
              </div>
            )}

            {/* Analyze */}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing || isLoadingSavedResume || (!resumeFile && !!savedResume)}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAnalyzing ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />

                  Analyzing Resume...
                </>
              ) : (
                <>
                  {savedResume && resumeFile ? "🤖 Analyze & Add Resume" : "🤖 Analyze My Resume"}
                  <span>→</span>
                </>
              )}
            </button>
          </section>

          {/* Right */}
          <section className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-lg font-semibold">
                How VRoom uses your resume
              </h2>

              <div className="mt-5 space-y-4">
                {[
                  [
                    "1",
                    "Resume Analysis",
                    "Skills, experience, projects and resume structure.",
                  ],
                  [
                    "2",
                    "Job Matching",
                    "Compare your resume with the selected role and optional JD.",
                  ],
                  [
                    "3",
                    "Resume-Based Interview",
                    "Use your actual resume later for personalized interview questions.",
                  ],
                ].map(
                  ([number, title, description]) => (
                    <div
                      key={number}
                      className="flex gap-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sm">
                        {number}
                      </div>

                      <div>
                        <p className="text-sm font-semibold">
                          {title}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {description}
                        </p>
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-blue-500/20 bg-blue-500/5 p-6">
              <div className="flex gap-3">
                <span className="text-xl">
                  💡
                </span>

                <div>
                  <h3 className="text-sm font-semibold">
                    One resume, multiple VRoom features
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    Your uploaded resume can later
                    power job matching, ATS analysis,
                    resume-based interviews and other
                    career features.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Supported formats
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {["PDF", "DOC", "DOCX"].map(
                  (format) => (
                    <span
                      key={format}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-300"
                    >
                      {format}
                    </span>
                  )
                )}
              </div>
            </div>
          </section>
        </div>

        {/* =====================================================
            ANALYSIS RESULT
        ====================================================== */}

        {analysis && (
          <div className="mt-10 space-y-6">
            {searchParams.get("returnTo") === "mock-interview" && savedResume && (
              <button type="button" onClick={continueToInterview} className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-cyan-500">
                Continue to Resume-Based Interview <span>→</span>
              </button>
            )}
            {/* Result Header */}
            <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/[0.05] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                    Analysis Complete
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Your Resume Analysis
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Target role:{" "}
                    <span className="font-medium text-slate-200">
                      {jobRole}
                    </span>
                  </p>
                </div>

                {analysis.atsAnalysis
                  ?.atsScore !==
                  undefined && (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-6 py-4 text-center">
                    <p className="text-xs uppercase tracking-wider text-slate-500">
                      ATS Score
                    </p>

                    <p className="mt-1 text-3xl font-bold text-cyan-300">
                      {
                        analysis.atsAnalysis
                          .atsScore
                      }
                      <span className="text-sm text-slate-500">
                        /100
                      </span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Candidate Summary */}
            {analysis.candidateSummary && (
              <AnalysisSection title="Candidate Summary">
                <p className="text-sm leading-7 text-slate-300">
                  {analysis.candidateSummary}
                </p>
              </AnalysisSection>
            )}

            {/* Skills */}
            {analysis.skills && (
              <AnalysisSection title="Skills">
                <div className="grid gap-5 md:grid-cols-3">
                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                      Technical
                    </p>

                    {renderSkills(
                      analysis.skills
                        .technical
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-purple-400">
                      Soft Skills
                    </p>

                    {renderSkills(
                      analysis.skills.soft
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Other
                    </p>

                    {renderSkills(
                      analysis.skills.other
                    )}
                  </div>
                </div>
              </AnalysisSection>
            )}

            {/* Experience */}
            <AnalysisSection title="Experience">
              {renderExperience(
                analysis.experience
              )}
            </AnalysisSection>

            {/* Education */}
            <AnalysisSection title="Education">
              {renderList(
                analysis.education
              )}
            </AnalysisSection>

            {/* Projects */}
            <AnalysisSection title="Projects">
              {renderList(
                analysis.projects
              )}
            </AnalysisSection>

            {/* Certifications */}
            <AnalysisSection title="Certifications">
              {renderList(
                analysis.certifications
              )}
            </AnalysisSection>

            {/* Achievements */}
            <AnalysisSection title="Achievements">
              {renderList(
                analysis.achievements
              )}
            </AnalysisSection>

            {/* Strengths / Weaknesses */}
            <div className="grid gap-6 lg:grid-cols-2">
              <AnalysisSection title="Strengths">
                {renderList(
                  analysis.strengths
                )}
              </AnalysisSection>

              <AnalysisSection title="Weaknesses">
                {renderList(
                  analysis.weaknesses
                )}
              </AnalysisSection>
            </div>

            {/* ATS */}
            {analysis.atsAnalysis && (
              <AnalysisSection title="ATS Analysis">
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-slate-500">
                        ATS Friendly
                      </p>

                      <p
                        className={`mt-2 text-lg font-semibold ${
                          analysis.atsAnalysis
                            .atsFriendly
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {analysis.atsAnalysis
                          .atsFriendly
                          ? "Yes"
                          : "Needs Improvement"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-slate-500">
                        ATS Score
                      </p>

                      <p className="mt-2 text-lg font-semibold text-cyan-300">
                        {analysis.atsAnalysis
                          .atsScore ?? 0}
                        /100
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="text-xs text-slate-500">
                        Keyword Strength
                      </p>

                      <p className="mt-2 text-sm font-semibold text-white">
                        {analysis.atsAnalysis
                          .keywordStrength ||
                          "Not specified"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Formatting Issues
                    </p>

                    {renderList(
                      analysis.atsAnalysis
                        .formattingIssues
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Missing Keywords
                    </p>

                    {renderList(
                      analysis.atsAnalysis
                        .missingKeywords
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Section Completeness
                    </p>

                    {renderList(
                      analysis.atsAnalysis
                        .sectionCompleteness
                    )}
                  </div>
                </div>
              </AnalysisSection>
            )}

            {/* Job Matching */}
            {analysis.jobMatching && (
              <AnalysisSection title="Job Matching">
                <div className="space-y-6">
                  {analysis.jobMatching
                    .matchSummary && (
                    <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.04] p-5">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-cyan-400">
                        Match Summary
                      </p>

                      <p className="text-sm leading-7 text-slate-300">
                        {
                          analysis.jobMatching
                            .matchSummary
                        }
                      </p>
                    </div>
                  )}

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-emerald-300">
                        Matching Skills
                      </p>

                      {renderList(
                        analysis.jobMatching
                          .matchingSkills
                      )}
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-semibold text-amber-300">
                        Missing Skills
                      </p>

                      {renderList(
                        analysis.jobMatching
                          .missingSkills
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Relevant Experience
                    </p>

                    {renderList(
                      analysis.jobMatching
                        .relevantExperience
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Job Requirements
                    </p>

                    {renderList(
                      analysis.jobMatching
                        .jobRequirements
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Resume Gaps
                    </p>

                    {renderList(
                      analysis.jobMatching
                        .resumeGaps
                    )}
                  </div>

                  <div>
                    <p className="mb-3 text-sm font-semibold text-white">
                      Suggestions
                    </p>

                    {renderList(
                      analysis.jobMatching
                        .suggestions
                    )}
                  </div>
                </div>
              </AnalysisSection>
            )}

            {/* Missing Information */}
            <AnalysisSection title="Missing Information">
              {renderList(
                analysis.missingInformation
              )}
            </AnalysisSection>

            {/* Resume Improvements */}
            <AnalysisSection title="Resume Improvements">
              {renderList(
                analysis.resumeImprovements
              )}
            </AnalysisSection>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ResumeAnalyzerPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <p className="text-sm text-slate-400">
            Loading Resume Analyzer...
          </p>
        </main>
      }
    >
      <ResumeAnalyzerContent />
    </Suspense>
  );
}