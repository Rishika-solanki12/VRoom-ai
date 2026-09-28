"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Experience = {
  id: string;
  jobTitle: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
};

type Education = {
  id: string;
  degree: string;
  institution: string;
  location: string;
  startDate: string;
  endDate: string;
};

type Project = {
  id: string;
  name: string;
  link: string;
  description: string;
};

type ResumeData = {
  personal: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    portfolio: string;
  };
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  achievements: string[];
};

const emptyResume: ResumeData = {
  personal: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
  },
  summary: "",
  skills: [],
  experience: [],
  education: [],
  projects: [],
  certifications: [],
  achievements: [],
};


type AnalyzerRecord = {
  id: string;
  file_name: string;
  analysis: Record<string, any> | null;
  target_role: string | null;
  job_description: string | null;
};

const asText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
};

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return "";
};

const itemToText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (!value || typeof value !== "object") return "";
  const objectValue = value as Record<string, unknown>;
  return firstText(
    objectValue.name,
    objectValue.title,
    objectValue.value,
    objectValue.skill,
    objectValue.certification,
    objectValue.achievement,
    objectValue.description
  );
};

const listToStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map(itemToText).filter(Boolean);
};

const descriptionText = (value: unknown): string => {
  if (Array.isArray(value)) {
    return value.map(itemToText).filter(Boolean).join("\n");
  }
  return itemToText(value);
};

const analyzerToResumeData = (analysis: Record<string, any> | null): ResumeData => {
  if (!analysis) return { ...emptyResume, personal: { ...emptyResume.personal } };

  const personal =
    analysis.personal ||
    analysis.personalInformation ||
    analysis.contact ||
    analysis.contactInformation ||
    analysis.candidate ||
    {};

  const technical = listToStrings(analysis.skills?.technical);
  const soft = listToStrings(analysis.skills?.soft);
  const other = listToStrings(analysis.skills?.other);
  const flatSkills = Array.isArray(analysis.skills) ? listToStrings(analysis.skills) : [];
  const skills = Array.from(new Set([...technical, ...soft, ...other, ...flatSkills]));

  const experience: Experience[] = Array.isArray(analysis.experience)
    ? analysis.experience.map((item: any) => ({
        id: crypto.randomUUID(),
        jobTitle: firstText(item?.role, item?.jobTitle, item?.title, item?.position),
        company: firstText(item?.company, item?.organization, item?.employer),
        location: firstText(item?.location),
        startDate: firstText(item?.startDate, item?.start),
        endDate: firstText(item?.endDate, item?.end),
        current: Boolean(item?.current || item?.isCurrent),
        description: descriptionText(
          item?.responsibilities ?? item?.description ?? item?.highlights
        ),
      }))
    : [];

  const education: Education[] = Array.isArray(analysis.education)
    ? analysis.education.map((item: any) => ({
        id: crypto.randomUUID(),
        degree: firstText(
          item?.degree,
          item?.qualification,
          item?.course,
          item?.program,
          item?.title,
          typeof item === "string" ? item : ""
        ),
        institution: firstText(item?.institution, item?.college, item?.university, item?.school),
        location: firstText(item?.location),
        startDate: firstText(item?.startDate, item?.start, item?.from),
        endDate: firstText(item?.endDate, item?.end, item?.to, item?.year),
      }))
    : [];

  const projects: Project[] = Array.isArray(analysis.projects)
    ? analysis.projects.map((item: any) => ({
        id: crypto.randomUUID(),
        name: firstText(
          item?.name,
          item?.title,
          item?.projectName,
          typeof item === "string" ? item : ""
        ),
        link: firstText(item?.link, item?.url, item?.github, item?.website),
        description: descriptionText(
          item?.description ?? item?.details ?? item?.responsibilities ?? item?.highlights
        ),
      }))
    : [];

  return {
    personal: {
      fullName: firstText(
        personal?.fullName,
        personal?.name,
        analysis.fullName,
        analysis.name,
        analysis.candidateName
      ),
      email: firstText(personal?.email, analysis.email),
      phone: firstText(personal?.phone, personal?.phoneNumber, analysis.phone, analysis.phoneNumber),
      location: firstText(personal?.location, personal?.address, analysis.location, analysis.address),
      linkedin: firstText(personal?.linkedin, personal?.linkedIn, analysis.linkedin, analysis.linkedIn),
      portfolio: firstText(
        personal?.portfolio,
        personal?.website,
        analysis.portfolio,
        analysis.website
      ),
    },
    summary: firstText(
      analysis.candidateSummary,
      analysis.professionalSummary,
      analysis.summary
    ),
    skills,
    experience,
    education,
    projects,
    certifications: listToStrings(analysis.certifications),
    achievements: listToStrings(analysis.achievements),
  };
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
      />
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      {description && (
        <p className="mt-1 text-sm leading-6 text-slate-500">
          {description}
        </p>
      )}
    </div>
  );
}

function ResumeEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const source = searchParams.get("source");
  const selectedResumeId = searchParams.get("resumeId");

  const [resume, setResume] = useState<ResumeData>(emptyResume);
  const [analyzerLoading, setAnalyzerLoading] = useState(source === "analyzer");
  const [analyzerError, setAnalyzerError] = useState("");
  const [analyzerFileName, setAnalyzerFileName] = useState("");
  const [activeSection, setActiveSection] = useState("personal");
  const [skillInput, setSkillInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [achievementInput, setAchievementInput] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAI, setShowAI] = useState(true);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [aiMissingRequirements, setAiMissingRequirements] = useState<string[]>([]);
  const [aiDraft, setAiDraft] = useState<ResumeData | null>(null);
  const [aiDraftMode, setAiDraftMode] = useState<"build" | "improve" | null>(null);
  const [aiApplied, setAiApplied] = useState(false);
  const [hasBuiltResume, setHasBuiltResume] = useState(false);
  const [buildCount, setBuildCount] = useState(0);
  const [manualEditMode, setManualEditMode] = useState(false);


  useEffect(() => {
    if (source !== "analyzer") {
      setAnalyzerLoading(false);
      return;
    }

    let active = true;

    const loadAnalyzedResume = async () => {
      setAnalyzerLoading(true);
      setAnalyzerError("");

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) {
          throw new Error("Please log in again to use an analyzed resume.");
        }

        let query = supabase
          .from("user_resumes")
          .select("id, file_name, analysis, target_role, job_description")
          .eq("user_id", authData.user.id);

        if (selectedResumeId) {
          query = query.eq("id", selectedResumeId);
        } else {
          query = query.eq("is_current", true);
        }

        const { data, error } = await query.limit(1).maybeSingle();
        if (error) throw error;
        if (!data) {
          throw new Error("The selected analyzed resume could not be found.");
        }
        if (!data.analysis) {
          throw new Error("This resume has no analysis data yet. Analyze it first.");
        }

        if (!active) return;

        const record = data as AnalyzerRecord;
        setResume(analyzerToResumeData(record.analysis));
        setTargetRole(record.target_role || "");
        setJobDescription(record.job_description || "");
        setAnalyzerFileName(record.file_name || "Analyzed resume");
        setHasBuiltResume(false);
        setManualEditMode(false);
      } catch (error) {
        console.error("Could not load analyzed resume:", error);
        if (active) {
          setAnalyzerError(
            error instanceof Error
              ? error.message
              : "Could not load the analyzed resume."
          );
        }
      } finally {
        if (active) setAnalyzerLoading(false);
      }
    };

    void loadAnalyzedResume();
    return () => {
      active = false;
    };
  }, [source, selectedResumeId]);

  const updatePersonal = (
    field: keyof ResumeData["personal"],
    value: string
  ) => {
    setResume((prev) => ({
      ...prev,
      personal: {
        ...prev.personal,
        [field]: value,
      },
    }));
  };

  const addSkill = () => {
    const skill = skillInput.trim();

    if (!skill) return;

    if (
      resume.skills.some(
        (existingSkill) =>
          existingSkill.toLowerCase() === skill.toLowerCase()
      )
    ) {
      setSkillInput("");
      return;
    }

    setResume((prev) => ({
      ...prev,
      skills: [...prev.skills, skill],
    }));

    setSkillInput("");
  };

  const removeSkill = (index: number) => {
    setResume((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }));
  };

  const addExperience = () => {
    const newExperience: Experience = {
      id: crypto.randomUUID(),
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    };

    setResume((prev) => ({
      ...prev,
      experience: [...prev.experience, newExperience],
    }));
  };

  const updateExperience = (
    id: string,
    field: keyof Experience,
    value: string | boolean
  ) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeExperience = (id: string) => {
    setResume((prev) => ({
      ...prev,
      experience: prev.experience.filter((item) => item.id !== id),
    }));
  };

  const addEducation = () => {
    const newEducation: Education = {
      id: crypto.randomUUID(),
      degree: "",
      institution: "",
      location: "",
      startDate: "",
      endDate: "",
    };

    setResume((prev) => ({
      ...prev,
      education: [...prev.education, newEducation],
    }));
  };

  const updateEducation = (
    id: string,
    field: keyof Education,
    value: string
  ) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeEducation = (id: string) => {
    setResume((prev) => ({
      ...prev,
      education: prev.education.filter((item) => item.id !== id),
    }));
  };

  const addProject = () => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: "",
      link: "",
      description: "",
    };

    setResume((prev) => ({
      ...prev,
      projects: [...prev.projects, newProject],
    }));
  };

  const updateProject = (
    id: string,
    field: keyof Project,
    value: string
  ) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeProject = (id: string) => {
    setResume((prev) => ({
      ...prev,
      projects: prev.projects.filter((item) => item.id !== id),
    }));
  };

  const addCertification = () => {
    const value = certificationInput.trim();

    if (!value) return;

    setResume((prev) => ({
      ...prev,
      certifications: [...prev.certifications, value],
    }));

    setCertificationInput("");
  };

  const removeCertification = (index: number) => {
    setResume((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index),
    }));
  };

  const addAchievement = () => {
    const value = achievementInput.trim();

    if (!value) return;

    setResume((prev) => ({
      ...prev,
      achievements: [...prev.achievements, value],
    }));

    setAchievementInput("");
  };

  const removeAchievement = (index: number) => {
    setResume((prev) => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index),
    }));
  };

  const normalize = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[.\-_/()]/g, " ")
      .replace(/\s+/g, " ");

  const levenshtein = (a: string, b: string) => {
    const left = normalize(a);
    const right = normalize(b);

    if (left === right) return 0;
    if (!left.length) return right.length;
    if (!right.length) return left.length;

    const previous = Array.from({ length: right.length + 1 }, (_, i) => i);

    for (let i = 1; i <= left.length; i += 1) {
      const current = [i];

      for (let j = 1; j <= right.length; j += 1) {
        const insert = current[j - 1] + 1;
        const remove = previous[j] + 1;
        const replace = previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1);
        current[j] = Math.min(insert, remove, replace);
      }

      for (let j = 0; j < current.length; j += 1) previous[j] = current[j];
    }

    return previous[right.length];
  };

  const cleanAIString = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  /**
   * AI is allowed to improve wording, but it is NOT allowed to become the
   * source of truth for personal facts. The user's entered facts always win.
   */
  const mergeAIResumeSafely = (aiResume: ResumeData): ResumeData => {
    const original = resume;

    const safeSkills = original.skills.map((originalSkill) => {
      const matchingAI = Array.isArray(aiResume.skills)
        ? aiResume.skills.find((candidate) => {
            if (typeof candidate !== "string") return false;
            const distance = levenshtein(originalSkill, candidate);
            const maxLength = Math.max(
              normalize(originalSkill).length,
              normalize(candidate).length,
              1
            );
            return distance / maxLength <= 0.34;
          })
        : undefined;

      return cleanAIString(matchingAI) || originalSkill.trim();
    });

    const safeExperience = original.experience.map((item, index) => {
      const aiItem = Array.isArray(aiResume.experience)
        ? aiResume.experience[index]
        : undefined;

      return {
        ...item,
        description:
          cleanAIString(aiItem?.description) || item.description,
      };
    });

    const safeEducation = original.education.map((item) => ({ ...item }));

    const safeProjects = original.projects.map((item, index) => {
      const aiItem = Array.isArray(aiResume.projects)
        ? aiResume.projects[index]
        : undefined;

      return {
        ...item,
        description:
          cleanAIString(aiItem?.description) || item.description,
      };
    });

    return {
      personal: { ...original.personal },
      summary: cleanAIString(aiResume.summary) || original.summary,
      skills: safeSkills,
      experience: safeExperience,
      education: safeEducation,
      projects: safeProjects,
      certifications: [...original.certifications],
      achievements: [...original.achievements],
    };
  };

  const startManualEditing = () => {
    setManualEditMode(true);
    setActiveSection("personal");

    window.setTimeout(() => {
      document.getElementById("personal")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const requestResumeAI = async (mode: "build" | "improve") => {
    if (!targetRole.trim()) {
      setAiError("Please enter the target job role first.");
      return;
    }

    if (mode === "improve" && !aiPrompt.trim()) {
      setAiError("Tell VRoom AI what you want to improve.");
      return;
    }

    try {
      setAiLoading(true);
      setAiError("");
      setAiSuggestions([]);
      setAiMissingRequirements([]);

      const response = await fetch("/api/resume-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          targetRole: targetRole.trim(),
          jobDescription: jobDescription.trim(),
          instruction:
            mode === "build"
              ? "Build a professional ATS-friendly resume for the target role using the candidate information provided. Improve wording and grammar, but never invent facts."
              : aiPrompt.trim(),
          resumeData: resume,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Resume AI request failed.");
      }

      if (!data?.resume) {
        throw new Error("AI returned an invalid resume response.");
      }

      const builtResume = mergeAIResumeSafely(data.resume as ResumeData);

      // Build is the point where the AI-generated professional wording becomes
      // the editable resume. Factual fields remain from the user's input.
      setResume(builtResume);
      setHasBuiltResume(true);
      setBuildCount((count) => count + 1);
      setAiDraft(data.resume as ResumeData);
      setAiDraftMode(mode);
      setAiApplied(true);
      setAiSuggestions(Array.isArray(data.skillSuggestions) ? data.skillSuggestions : []);
      setAiMissingRequirements(Array.isArray(data.missingRequirements) ? data.missingRequirements : []);

      if (mode === "improve") setAiPrompt("");
    } catch (error) {
      console.error("Resume Builder AI error:", error);
      setAiError(
        error instanceof Error ? error.message : "Something went wrong while using Resume AI."
      );
    } finally {
      setAiLoading(false);
    }
  };

  const sendAIRequest = () => {
    void requestResumeAI("improve");
  };

  const downloadPdf = () => {
    if (!hasBuiltResume) {
      setAiError("Build your resume with VRoom AI before downloading the PDF.");
      return;
    }

    const previousTitle = document.title;
    const safeName = (resume.personal.fullName.trim() || "VRoom-AI-Resume")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "");

    document.title = `${safeName || "VRoom-AI-Resume"}-Resume`;
    window.print();

    window.setTimeout(() => {
      document.title = previousTitle;
    }, 1000);
  };

  const resumeName = useMemo(() => {
    return resume.personal.fullName.trim() || "Your Name";
  }, [resume.personal.fullName]);

  const navItems = [
    ["personal", "Personal Information"],
    ["summary", "Professional Summary"],
    ["skills", "Skills"],
    ["experience", "Experience"],
    ["education", "Education"],
    ["projects", "Projects"],
    ["certifications", "Certifications"],
    ["achievements", "Achievements"],
  ];

  return (
    <main className="min-h-screen bg-[#080b16] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#080b16]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/resume-builder")}
              className="rounded-lg px-2 py-2 text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
              aria-label="Back"
            >
              ←
            </button>

            <div>
              <h1 className="text-base font-bold sm:text-lg">
                VRoom <span className="text-violet-400">AI</span>
              </h1>

              <p className="hidden text-[10px] uppercase tracking-[0.2em] text-slate-500 sm:block">
                Resume Builder
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {source === "analyzer" && (
              <span className="hidden rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs text-cyan-300 sm:block">
                From Resume Analyzer
              </span>
            )}

            {hasBuiltResume && (
              <button
                type="button"
                onClick={startManualEditing}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  manualEditMode
                    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
                    : "border-violet-500/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20"
                }`}
              >
                {manualEditMode ? "✓ Editing" : "✎ Edit Resume"}
              </button>
            )}

            <button
              onClick={() => alert("Save will be connected to Supabase after the final resume validation flow is complete.")}
              className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-violet-500 hover:text-white"
            >
              Save
            </button>

            <button
              type="button"
              onClick={downloadPdf}
              disabled={!hasBuiltResume}
              className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Download PDF
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Page heading */}
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
            Resume Editor
          </p>

          <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
            Build your professional resume
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Edit your resume yourself or use VRoom AI to improve individual
            sections. Your information stays editable and under your control.
          </p>
        </div>

        {/* Target Job */}
        <div className="mb-6 rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-5 sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">Target Job</p>
            <h3 className="mt-2 text-xl font-bold text-white">What job are you applying for?</h3>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
              VRoom AI will tailor your resume to this role using only information supported by your profile.
              It will not invent skills, experience, qualifications, companies, dates, or achievements.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Target Job Role <span className="text-violet-400">*</span></label>
              <input
                value={targetRole}
                onChange={(e) => { setTargetRole(e.target.value); setAiError(""); }}
                placeholder="e.g. Frontend Developer"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">Job Description <span className="ml-1 text-xs text-slate-500">Optional</span></label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={4}
                placeholder="Paste the job description here..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
              />
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => void requestResumeAI("build")}
              disabled={aiLoading || analyzerLoading}
              className="rounded-xl bg-violet-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {aiLoading ? "Building your resume..." : hasBuiltResume ? "✨ Rebuild with VRoom AI" : "✨ Build My Resume with AI"}
            </button>
            <span className="text-xs text-slate-500">First enter your information, then VRoom AI professionally formats and rewrites supported content. Your factual details stay protected.</span>
          </div>

          {aiError && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">{aiError}</p>}

          {(aiSuggestions.length > 0 || aiMissingRequirements.length > 0) && (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {aiSuggestions.length > 0 && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
                  <p className="text-sm font-semibold text-amber-300">Suggested skills to consider</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {aiSuggestions.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-slate-500">Suggestions are not automatically added to your resume.</p>
                </div>
              )}
              {aiMissingRequirements.length > 0 && (
                <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-4">
                  <p className="text-sm font-semibold text-orange-300">Requirements not found in your provided information</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                    {aiMissingRequirements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {hasBuiltResume && (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Resume built successfully
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  VRoom AI created your professional draft. You can now manually edit any section before downloading.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs text-emerald-300">
                  Build #{buildCount}
                </span>
                <button
                  type="button"
                  onClick={startManualEditing}
                  className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
                >
                  ✎ Edit Resume Manually
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_minmax(420px,0.9fr)]">
          {/* Navigation */}
          <aside className="hidden xl:block">
            <div className="sticky top-24 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3">
              <p className="px-3 pb-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Sections
              </p>

              <div className="space-y-1">
                {navItems.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => {
                      setActiveSection(id);
                      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                      activeSection === id
                        ? "bg-violet-500/10 font-medium text-violet-300"
                        : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Editor */}
          <section className="min-w-0 space-y-5">
            {hasBuiltResume && (
              <div className={`rounded-2xl border p-4 ${
                manualEditMode
                  ? "border-emerald-400/30 bg-emerald-400/5"
                  : "border-violet-400/20 bg-violet-400/5"
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-lg">{manualEditMode ? "✏️" : "📝"}</span>
                  <div>
                    <p className={`text-sm font-semibold ${manualEditMode ? "text-emerald-300" : "text-violet-300"}`}>
                      {manualEditMode ? "Manual editing is ON" : "Resume is ready to edit"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      {manualEditMode
                        ? "Change any field below. The resume preview updates immediately as you edit."
                        : "Use the Edit Resume button to jump to your editable resume fields."}
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Personal */}
            <div
              id="personal"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <SectionTitle
                title="Personal Information"
                description="Use accurate information. Do not add information you do not actually have."
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Full Name"
                  value={resume.personal.fullName}
                  onChange={(value) => updatePersonal("fullName", value)}
                  placeholder="e.g. Rahul Sharma"
                />

                <Field
                  label="Email"
                  type="email"
                  value={resume.personal.email}
                  onChange={(value) => updatePersonal("email", value)}
                  placeholder="you@example.com"
                />

                <Field
                  label="Phone"
                  value={resume.personal.phone}
                  onChange={(value) => updatePersonal("phone", value)}
                  placeholder="+91 98765 43210"
                />

                <Field
                  label="Location"
                  value={resume.personal.location}
                  onChange={(value) => updatePersonal("location", value)}
                  placeholder="Indore, India"
                />

                <Field
                  label="LinkedIn"
                  value={resume.personal.linkedin}
                  onChange={(value) => updatePersonal("linkedin", value)}
                  placeholder="linkedin.com/in/yourname"
                />

                <Field
                  label="Portfolio / Website"
                  value={resume.personal.portfolio}
                  onChange={(value) => updatePersonal("portfolio", value)}
                  placeholder="yourwebsite.com"
                />
              </div>
            </div>

            {/* Summary */}
            <div
              id="summary"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <SectionTitle
                title="Professional Summary"
                description="You can type your own summary or let VRoom AI create a reviewable professional draft."
              />

              <textarea
                value={resume.summary}
                onChange={(e) =>
                  setResume((prev) => ({
                    ...prev,
                    summary: e.target.value,
                  }))
                }
                rows={6}
                placeholder="Write a concise professional summary..."
                className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
              />
            </div>

            {/* Skills */}
            <div
              id="skills"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <SectionTitle
                title="Skills"
                description="Add only skills you genuinely have. AI will not add new skills to the final resume automatically."
              />

              <div className="flex gap-2">
                <input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  placeholder="e.g. React.js"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />

                <button
                  onClick={addSkill}
                  className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400"
                >
                  Add
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {resume.skills.map((skill, index) => (
                  <button
                    key={`${skill}-${index}`}
                    onClick={() => removeSkill(index)}
                    className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs text-violet-200 transition hover:border-red-400/30 hover:bg-red-400/10 hover:text-red-300"
                    title="Remove skill"
                  >
                    {skill} ×
                  </button>
                ))}

                {resume.skills.length === 0 && (
                  <p className="text-xs text-slate-600">
                    No skills added yet.
                  </p>
                )}
              </div>
            </div>

            {/* Experience */}
            <div
              id="experience"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <SectionTitle
                  title="Experience"
                  description="Add relevant professional experience."
                />

                <button
                  onClick={addExperience}
                  className="shrink-0 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                  + Add Experience
                </button>
              </div>

              <div className="space-y-5">
                {resume.experience.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Experience {index + 1}
                      </p>

                      <button
                        onClick={() => removeExperience(item.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Job Title"
                        value={item.jobTitle}
                        onChange={(value) =>
                          updateExperience(item.id, "jobTitle", value)
                        }
                        placeholder="Frontend Developer"
                      />

                      <Field
                        label="Company"
                        value={item.company}
                        onChange={(value) =>
                          updateExperience(item.id, "company", value)
                        }
                        placeholder="Company Name"
                      />

                      <Field
                        label="Location"
                        value={item.location}
                        onChange={(value) =>
                          updateExperience(item.id, "location", value)
                        }
                        placeholder="Indore, India"
                      />

                      <Field
                        label="Start Date"
                        value={item.startDate}
                        onChange={(value) =>
                          updateExperience(item.id, "startDate", value)
                        }
                        placeholder="Jan 2024"
                      />

                      <Field
                        label="End Date"
                        value={item.endDate}
                        onChange={(value) =>
                          updateExperience(item.id, "endDate", value)
                        }
                        placeholder="Dec 2025"
                      />

                      <label className="flex items-center gap-2 pt-8 text-sm text-slate-300">
                        <input
                          type="checkbox"
                          checked={item.current}
                          onChange={(e) =>
                            updateExperience(
                              item.id,
                              "current",
                              e.target.checked
                            )
                          }
                          className="h-4 w-4 accent-violet-500"
                        />
                        Currently working here
                      </label>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Description
                      </label>

                      <textarea
                        value={item.description}
                        onChange={(e) =>
                          updateExperience(
                            item.id,
                            "description",
                            e.target.value
                          )
                        }
                        rows={5}
                        placeholder="Describe your responsibilities and achievements..."
                        className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                      />
                    </div>
                  </div>
                ))}

                {resume.experience.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                    No experience added yet.
                  </div>
                )}
              </div>
            </div>

            {/* Education */}
            <div
              id="education"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <SectionTitle
                  title="Education"
                  description="Add your relevant educational qualifications."
                />

                <button
                  onClick={addEducation}
                  className="shrink-0 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                  + Add Education
                </button>
              </div>

              <div className="space-y-5">
                {resume.education.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Education {index + 1}
                      </p>

                      <button
                        onClick={() => removeEducation(item.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        label="Degree / Qualification"
                        value={item.degree}
                        onChange={(value) =>
                          updateEducation(item.id, "degree", value)
                        }
                        placeholder="B.Tech in Computer Science"
                      />

                      <Field
                        label="Institution"
                        value={item.institution}
                        onChange={(value) =>
                          updateEducation(item.id, "institution", value)
                        }
                        placeholder="University / College"
                      />

                      <Field
                        label="Location"
                        value={item.location}
                        onChange={(value) =>
                          updateEducation(item.id, "location", value)
                        }
                        placeholder="Indore, India"
                      />

                      <Field
                        label="Start Date"
                        value={item.startDate}
                        onChange={(value) =>
                          updateEducation(item.id, "startDate", value)
                        }
                        placeholder="2022"
                      />

                      <Field
                        label="End Date"
                        value={item.endDate}
                        onChange={(value) =>
                          updateEducation(item.id, "endDate", value)
                        }
                        placeholder="2026"
                      />
                    </div>
                  </div>
                ))}

                {resume.education.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                    No education added yet.
                  </div>
                )}
              </div>
            </div>

            {/* Projects */}
            <div
              id="projects"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <SectionTitle
                  title="Projects"
                  description="Show relevant projects and what you built."
                />

                <button
                  onClick={addProject}
                  className="shrink-0 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20"
                >
                  + Add Project
                </button>
              </div>

              <div className="space-y-5">
                {resume.projects.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        Project {index + 1}
                      </p>

                      <button
                        onClick={() => removeProject(item.id)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="space-y-4">
                      <Field
                        label="Project Name"
                        value={item.name}
                        onChange={(value) =>
                          updateProject(item.id, "name", value)
                        }
                        placeholder="VRoom AI"
                      />

                      <Field
                        label="Project Link"
                        value={item.link}
                        onChange={(value) =>
                          updateProject(item.id, "link", value)
                        }
                        placeholder="https://..."
                      />

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          Description
                        </label>

                        <textarea
                          value={item.description}
                          onChange={(e) =>
                            updateProject(
                              item.id,
                              "description",
                              e.target.value
                            )
                          }
                          rows={4}
                          placeholder="Explain what you built..."
                          className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {resume.projects.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-800 p-8 text-center text-sm text-slate-500">
                    No projects added yet.
                  </div>
                )}
              </div>
            </div>

            {/* Certifications */}
            <div
              id="certifications"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <SectionTitle
                title="Certifications"
                description="Add certifications you have actually completed."
              />

              <div className="flex gap-2">
                <input
                  value={certificationInput}
                  onChange={(e) => setCertificationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCertification();
                    }
                  }}
                  placeholder="e.g. Google Data Analytics Certificate"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />

                <button
                  onClick={addCertification}
                  className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400"
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {resume.certifications.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <span className="text-sm text-slate-300">{item}</span>

                    <button
                      onClick={() => removeCertification(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div
              id="achievements"
              className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 sm:p-6"
            >
              <SectionTitle
                title="Achievements"
                description="Add measurable or meaningful achievements."
              />

              <div className="flex gap-2">
                <input
                  value={achievementInput}
                  onChange={(e) => setAchievementInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addAchievement();
                    }
                  }}
                  placeholder="e.g. Won first place in a coding competition"
                  className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                />

                <button
                  onClick={addAchievement}
                  className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold hover:bg-violet-400"
                >
                  Add
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {resume.achievements.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                  >
                    <span className="text-sm text-slate-300">{item}</span>

                    <button
                      onClick={() => removeAchievement(index)}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Assistant */}
            {showAI && (
              <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 to-indigo-500/5 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🤖</span>
                      <h2 className="font-semibold">
                        Ask VRoom AI
                      </h2>
                    </div>

                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      Tell VRoom AI what you want to improve. It will rewrite the resume professionally while preserving your actual facts.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAI(false)}
                    className="text-xs text-slate-500 hover:text-white"
                  >
                    Hide
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendAIRequest();
                      }
                    }}
                    placeholder="e.g. Improve my professional summary..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-violet-500"
                  />

                  <button
                    onClick={sendAIRequest}
                    disabled={aiLoading}
                    className="rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {aiLoading ? "Working..." : "Ask AI"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Preview */}
          <aside className="min-w-0">
            <div className="sticky top-24">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
                    {hasBuiltResume ? "Final Resume Preview" : "Resume Preview"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {hasBuiltResume
                      ? "Edit the fields on the left and the final resume updates instantly."
                      : "Your typed information stays in the editor until you click Build My Resume with AI."}
                  </p>
                  {hasBuiltResume && (
                    <p className="mt-1 text-[10px] text-slate-600">A4-style, ATS-friendly single-column layout</p>
                  )}
                </div>
              </div>

              {!hasBuiltResume ? (
                <div className="flex min-h-[850px] items-center justify-center rounded-xl border border-dashed border-slate-700 bg-white/[0.03] p-8 text-center shadow-2xl">
                  <div className="max-w-sm">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10 text-2xl">
                      ✨
                    </div>
                    <h3 className="mt-4 text-lg font-semibold text-white">
                      Your professional resume will appear here
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Fill in your real information, choose your target role, and click
                      <span className="font-semibold text-violet-300"> Build My Resume with AI</span>.
                      VRoom AI will then create the formatted resume instead of printing your raw typing directly.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  id="resume-print-root"
                  className="overflow-hidden rounded-xl bg-white text-black shadow-2xl ring-1 ring-black/10"
                >
                  <div
                    className="resume-a4-page mx-auto min-h-[1123px] w-full bg-white px-10 py-12 sm:px-12 sm:py-14"
                    data-resume-page="a4"
                  >
                    <div className="border-b border-slate-900 pb-4">
                      <h1 className="text-[28px] leading-tight font-bold tracking-tight">
                        {resumeName}
                      </h1>

                      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-[10.5px] leading-4 text-slate-600">
                        {[resume.personal.email, resume.personal.phone, resume.personal.location]
                          .filter(Boolean)
                          .map((item, index) => (
                            <span key={`${item}-${index}`}>{item}</span>
                          ))}
                      </div>

                      {(resume.personal.linkedin || resume.personal.portfolio) && (
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[10.5px] leading-4 text-slate-600">
                          {[resume.personal.linkedin, resume.personal.portfolio]
                            .filter(Boolean)
                            .map((item, index) => (
                              <span key={`${item}-${index}`}>{item}</span>
                            ))}
                        </div>
                      )}
                    </div>

                    {resume.summary.trim() && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Professional Summary
                        </h3>
                        <p className="mt-2 whitespace-pre-line text-[10.5px] leading-[1.5] text-slate-700">
                          {resume.summary}
                        </p>
                      </div>
                    )}

                    {resume.skills.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Technical Skills
                        </h3>
                        <p className="mt-2 text-[10.5px] leading-[1.5] text-slate-700">
                          {resume.skills.join(" • ")}
                        </p>
                      </div>
                    )}

                    {resume.experience.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Experience
                        </h3>
                        <div className="mt-3 space-y-3.5">
                          {resume.experience.map((item) => (
                            <div key={item.id}>
                              <div className="flex justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[11.5px] leading-4 font-bold">
                                    {item.jobTitle}
                                  </p>
                                  <p className="text-[10.5px] leading-4 font-medium text-slate-700">
                                    {item.company}{item.location ? ` • ${item.location}` : ""}
                                  </p>
                                </div>
                                <p className="whitespace-nowrap text-[9.5px] leading-4 text-slate-500">
                                  {item.startDate}
                                  {(item.startDate || item.endDate || item.current) && " – "}
                                  {item.current ? "Present" : item.endDate}
                                </p>
                              </div>
                              {item.description.trim() && (
                                <ul className="mt-1 space-y-0.5 text-[10px] leading-[1.45] text-slate-700">
                                  {item.description
                                    .split(/\n|•/)
                                    .map((line) => line.trim())
                                    .filter(Boolean)
                                    .map((line, index) => (
                                      <li key={`${item.id}-desc-${index}`} className="flex gap-2">
                                        <span>•</span>
                                        <span>{line}</span>
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.projects.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Projects
                        </h3>
                        <div className="mt-3 space-y-3.5">
                          {resume.projects.map((item) => (
                            <div key={item.id}>
                              <p className="text-[11.5px] leading-4 font-bold">{item.name}</p>
                              {item.link && <p className="text-[9.5px] leading-4 text-slate-500 break-all">{item.link}</p>}
                              {item.description.trim() && (
                                <ul className="mt-1 space-y-0.5 text-[10px] leading-[1.45] text-slate-700">
                                  {item.description
                                    .split(/\n|•/)
                                    .map((line) => line.trim())
                                    .filter(Boolean)
                                    .map((line, index) => (
                                      <li key={`${item.id}-project-${index}`} className="flex gap-2">
                                        <span>•</span>
                                        <span>{line}</span>
                                      </li>
                                    ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.education.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Education
                        </h3>
                        <div className="mt-3 space-y-3">
                          {resume.education.map((item) => (
                            <div key={item.id} className="flex justify-between gap-3">
                              <div>
                                <p className="text-[11.5px] leading-4 font-bold">{item.degree}</p>
                                <p className="text-[11px] leading-4 text-slate-700">
                                  {item.institution}{item.location ? ` • ${item.location}` : ""}
                                </p>
                              </div>
                              <p className="whitespace-nowrap text-[9.5px] leading-4 text-slate-500">
                                {item.startDate}{(item.startDate || item.endDate) && " – "}{item.endDate}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {resume.certifications.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Certifications
                        </h3>
                        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] leading-[1.45] text-slate-700">
                          {resume.certifications.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                        </ul>
                      </div>
                    )}

                    {resume.achievements.length > 0 && (
                      <div className="mt-6">
                        <h3 className="border-b border-slate-400 pb-1 text-[11px] font-bold uppercase tracking-[0.12em]">
                          Achievements
                        </h3>
                        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-[10px] leading-[1.45] text-slate-700">
                          {resume.achievements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </aside>

        </div>
      </div>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          body * {
            visibility: hidden !important;
          }

          #resume-print-root,
          #resume-print-root * {
            visibility: visible !important;
          }

          #resume-print-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          #resume-print-root .resume-a4-page {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 16mm 15mm !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
          }

          #resume-print-root a {
            color: inherit !important;
            text-decoration: none !important;
          }

          #resume-print-root [data-resume-section] {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}



export default function ResumeEditorPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#080b16] text-white">
          <p className="text-sm text-slate-400">
            Loading Resume Editor...
          </p>
        </main>
      }
    >
      <ResumeEditorContent />
    </Suspense>
  );
}