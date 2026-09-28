"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

function Icon({
  name,
  size = 22,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "sparkles":
      return (
        <svg {...common}>
          <path d="m12 3-1.2 4.8L6 9l4.8 1.2L12 15l1.2-4.8L18 9l-4.8-1.2L12 3Z" />
          <path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L22 18l-2.3-.7L19 15Z" />
        </svg>
      );

    case "layout":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 9v12" />
        </svg>
      );

    case "mic":
      return (
        <svg {...common}>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6M8 13h8M8 17h6" />
        </svg>
      );

    case "message":
      return (
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 9.5 9.5 0 0 1-4-.9L3 21l1.9-4.3A8.4 8.4 0 0 1 3 11.5 8.5 8.5 0 0 1 12 3a8.5 8.5 0 0 1 9 8.5Z" />
        </svg>
      );

    case "code":
      return (
        <svg {...common}>
          <path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5M4 19h17" />
          <path d="m7 15 3-4 3 2 5-6" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5M15 12H3" />
          <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    default:
      return null;
  }
}

const practiceAreas = [
  {
    icon: "mic",
    title: "AI Mock Interview",
    description:
      "Practice realistic interviews for your selected job role with a natural AI interviewer.",
    tag: "Core Practice",
    gradient: "from-violet-500/20 to-indigo-500/5",
    iconBg: "bg-violet-500/15 text-violet-300",
    route: "/mock-interview",
  },
  {
    icon: "code",
    title: "Coding Practice",
    description:
      "Learn coding, solve problems, write code, get hints, and practice with an AI coding coach.",
    tag: "Learn + Practice",
    gradient: "from-cyan-500/20 to-blue-500/5",
    iconBg: "bg-cyan-500/15 text-cyan-300",
    route: "/coding-practice",
  },
  {
    icon: "message",
    title: "Communication Practice",
    description:
      "Improve English, speaking confidence, grammar, vocabulary, and professional communication.",
    tag: "Communication",
    gradient: "from-orange-500/20 to-amber-500/5",
    iconBg: "bg-orange-500/15 text-orange-300",
    route: "/communication-practice",
  },
];

type UserActivity = {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  score: number | null;
  duration_minutes: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
};

function formatActivityTime(value: string) {
  const date = new Date(value);
  const diff = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

function activityIcon(type: string) {
  if (type === "mock_interview") return "mic";
  if (type === "resume_analysis") return "file";
  if (type === "coding_practice") return "code";
  if (type === "communication_practice") return "message";
  return "chart";
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setEmail(user.email || "");

      const { data: activityData, error: activityError } = await supabase
        .from("user_activities")
        .select(
          "id, activity_type, title, description, score, duration_minutes, metadata, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (activityError) {
        console.error("Could not load dashboard activity:", activityError);
        setActivities([]);
      } else {
        setActivities((activityData || []) as UserActivity[]);
      }

      setActivityLoading(false);
      setLoading(false);
    }

    checkUser();
  }, [router]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - ((todayStart.getDay() + 6) % 7));

  const thisMonthActivities = activities.filter((a) => new Date(a.created_at) >= monthStart);
  const thisWeekActivities = activities.filter((a) => new Date(a.created_at) >= weekStart);
  const todayActivities = activities.filter((a) => new Date(a.created_at) >= todayStart);

  const interviewCount = thisMonthActivities.filter((a) => a.activity_type === "mock_interview").length;
  const totalPracticeMinutes = thisMonthActivities.reduce((n,a) => n + Math.max(0,a.duration_minutes || 0),0);
  const practiceHours = totalPracticeMinutes < 60 ? `${totalPracticeMinutes}m` : `${Math.floor(totalPracticeMinutes/60)}h ${totalPracticeMinutes%60}m`;

  const latestResumeAnalysis = activities.find((a) => a.activity_type === "resume_analysis" && typeof a.score === "number");
  const resumeScore = typeof latestResumeAnalysis?.score === "number" ? `${Math.round(latestResumeAnalysis.score)}` : "—";

  const mockWeekMinutes = thisWeekActivities.filter((a)=>a.activity_type==="mock_interview").reduce((n,a)=>n+Math.max(0,a.duration_minutes||0),0);
  const communicationByDay = Array.from({length:7},(_,i)=>{
    const day=new Date(weekStart); day.setDate(weekStart.getDate()+i);
    const next=new Date(day); next.setDate(day.getDate()+1);
    return thisWeekActivities.filter((a)=>a.activity_type==="communication_practice" && new Date(a.created_at)>=day && new Date(a.created_at)<next).reduce((n,a)=>n+Math.max(0,a.duration_minutes||0),0);
  });
  const communicationToday = todayActivities.filter((a)=>a.activity_type==="communication_practice").reduce((n,a)=>n+Math.max(0,a.duration_minutes||0),0);
  const communicationDays = communicationByDay.filter((n)=>n>=30).length;

  const uniqueCoding = (items: UserActivity[]) => new Set(items.map((a)=>String(a.metadata?.problem_id || a.metadata?.problem_title || a.title || a.id))).size;
  const codingToday = uniqueCoding(todayActivities.filter((a)=>a.activity_type==="coding_practice"));
  const codingWeek = uniqueCoding(thisWeekActivities.filter((a)=>a.activity_type==="coding_practice"));

  const resumeWeek = thisWeekActivities.filter((a)=>["resume_analysis","resume_build","resume_improvement"].includes(a.activity_type)).length;
  const goalsCompleted=[mockWeekMinutes>=240,communicationToday>=30,codingToday>=5,resumeWeek>=1].filter(Boolean).length;

  const fmt=(n:number)=>n<60?`${Math.max(0,Math.round(n))}m`:`${Math.floor(n/60)}h${n%60?` ${n%60}m`:""}`;
  const dayNames=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const goalCards=[
    {title:"Mock Interview",subtitle:"Minimum 4 hours every week",value:`${fmt(mockWeekMinutes)} / 4h`,detail:mockWeekMinutes>=240?`${fmt(mockWeekMinutes)} practiced this week · Goal complete`:`${fmt(240-mockWeekMinutes)} remaining this week`,progress:Math.min(100,(mockWeekMinutes/240)*100),icon:"mic",done:mockWeekMinutes>=240,route:"/mock-interview"},
    {title:"Communication Practice",subtitle:"30 minutes every day",value:`${fmt(communicationToday)} / 30m today`,detail:`${communicationDays}/7 days completed · ${communicationByDay.map((n,i)=>`${dayNames[i]} ${n}m`).join(" · ")}`,progress:Math.min(100,(communicationToday/30)*100),icon:"message",done:communicationToday>=30,route:"/communication-practice"},
    {title:"Coding Practice",subtitle:"5 accepted unique problems every day",value:`${codingToday} / 5 today`,detail:`${codingWeek} accepted unique problems this week`,progress:Math.min(100,(codingToday/5)*100),icon:"code",done:codingToday>=5,route:"/coding-practice"},
    {title:"Resume Progress",subtitle:"Analyze, build or improve 1 resume every week",value:`${Math.min(resumeWeek,1)} / 1 this week`,detail:resumeWeek?`${resumeWeek} meaningful resume action${resumeWeek===1?"":"s"} this week`:"No resume action completed this week",progress:resumeWeek?100:0,icon:"file",done:resumeWeek>=1,route:"/resume-analyzer"},
  ];

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b16] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Preparing your workspace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080b16] text-white">
      <div className="flex min-h-screen">

        {/* SIDEBAR — Desktop */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.07] bg-[#0b0f1d] px-5 py-6 lg:flex lg:flex-col">

          {/* Logo */}
          <div className="mb-10 flex items-center gap-3 px-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-lg shadow-violet-500/20">
              <Icon name="sparkles" size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">VRoom AI</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Career Studio
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Workspace
          </div>

          <nav className="space-y-1">
            <button className="flex w-full items-center gap-3 rounded-xl bg-violet-500/10 px-3 py-3 text-sm font-medium text-violet-300">
              <Icon name="layout" size={19} />
              Dashboard
            </button>

            <button
              type="button"
              onClick={() => router.push("/mock-interview")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon name="mic" size={19} />
              Mock Interviews
            </button>

            <button
              type="button"
              onClick={() => {
                document
                  .getElementById("resume-tools")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon name="file" size={19} />
              Resume Tools
            </button>
          </nav>

          <div className="mb-3 mt-10 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Account
          </div>

          <nav className="space-y-1">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon name="user" size={19} />
              Profile
            </button>
          </nav>

          {/* Bottom user */}
          <div className="mt-auto border-t border-white/[0.07] pt-5">
            <div className="mb-4 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 text-sm font-bold">
                {email.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-white">Your Account</p>
                <p className="truncate text-[11px] text-slate-500">{email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <Icon name="logout" size={19} />
              Logout
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <section className="min-w-0 flex-1">

          {/* Mobile Header */}
          <header className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600">
                <Icon name="sparkles" size={19} />
              </div>
              <span className="font-bold">VRoom AI</span>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/[0.05] hover:text-red-300"
              aria-label="Logout"
            >
              <Icon name="logout" size={20} />
            </button>
          </header>

          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 lg:px-10 lg:py-10">

            {/* Top Bar */}
            <div className="mb-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm text-violet-300">
                  <Icon name="sparkles" size={16} />
                  <span>AI-powered career preparation</span>
                </div>

                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Welcome back<span className="text-violet-400">.</span>
                </h2>

                <p className="mt-2 text-sm text-slate-400">
                  Ready to practice, improve and get hired?
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-right sm:block">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">
                    Signed in as
                  </p>
                  <p className="mt-0.5 max-w-[220px] truncate text-xs text-slate-300">
                    {email}
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/10 font-semibold text-violet-300">
                  {email.charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* HERO BANNER */}
            <div className="relative mb-8 overflow-hidden rounded-3xl border border-violet-400/15 bg-gradient-to-br from-violet-600/20 via-indigo-600/10 to-transparent p-6 sm:p-8">

              <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-600/15 blur-3xl" />
              <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-indigo-600/10 blur-3xl" />

              <div className="relative max-w-2xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-xs font-medium text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Your career journey starts here
                </div>

                <h3 className="max-w-xl text-2xl font-bold leading-tight sm:text-3xl">
                  Turn preparation into{" "}
                  <span className="text-violet-300">confidence.</span>
                </h3>

                <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300">
                  Practice real interview scenarios, build stronger resumes,
                  and get actionable AI feedback — all in one place.
                </p>

                <button
                  onClick={() => router.push("/mock-interview")}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#101426] shadow-lg shadow-white/10 transition hover:bg-violet-100"
                >
                  Start Mock Interview
                  <Icon name="arrow" size={17} />
                </button>
              </div>
            </div>

            {/* STATS */}
            <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              {[
                { label: "Interviews", value: String(interviewCount), icon: "mic", period: "This month" },
                { label: "Practice Hours", value: practiceHours, icon: "clock", period: "This month" },
                { label: "Resume Score", value: resumeScore, icon: "chart", period: "Latest" },
                { label: "Goals Completed", value: `${goalsCompleted}/4`, icon: "check", period: "Current goals" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <Icon name={stat.icon} size={18} />
                    <span className="text-[10px] uppercase tracking-wider text-slate-600">
                      {stat.period}
                    </span>
                  </div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* WEEKLY + DAILY GOALS */}
            <section className="mb-10">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-400">Your progress</p>
                  <h3 className="text-xl font-bold sm:text-2xl">Goals & consistency</h3>
                  <p className="mt-1 text-xs text-slate-500">Weekly progress runs Monday–Sunday. Daily goals reset each day.</p>
                </div>
                <div className="text-sm font-semibold text-violet-300">{goalsCompleted}/4 goals on track</div>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {goalCards.map((goal) => (
                  <button key={goal.title} type="button" onClick={() => router.push(goal.route)}
                    className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:border-violet-400/20 hover:bg-violet-500/[0.04]">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300"><Icon name={goal.icon} size={19}/></div>
                        <div><h4 className="font-semibold text-white">{goal.title}</h4><p className="mt-0.5 text-xs text-slate-500">{goal.subtitle}</p></div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${goal.done?"bg-emerald-500/10 text-emerald-300":"bg-white/[0.04] text-slate-500"}`}>{goal.done?"Completed":"In progress"}</span>
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-4"><p className="text-lg font-bold">{goal.value}</p><p className="text-[10px] text-slate-600">{Math.round(goal.progress)}%</p></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.05]"><div className="h-full rounded-full bg-violet-500 transition-all" style={{width:`${goal.progress}%`}}/></div>
                    <p className="mt-3 text-xs leading-5 text-slate-500">{goal.detail}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* PRACTICE AREAS */}
            <div className="mb-5 flex items-end justify-between">
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
                  Practice with VRoom AI
                </p>
                <h3 className="text-xl font-bold sm:text-2xl">
                  Choose how you want to practice
                </h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {practiceAreas.map((area) => (
                <button
                  key={area.title}
                  type="button"
                  onClick={() => router.push(area.route)}
                  className={`group relative min-h-[250px] overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${area.gradient} p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-xl hover:shadow-violet-950/20`}
                >
                  <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/[0.03] blur-2xl transition group-hover:bg-white/[0.06]" />

                  <div className="relative flex h-full flex-col">
                    <div className="mb-6 flex items-start justify-between">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-xl ${area.iconBg}`}
                      >
                        <Icon name={area.icon} size={23} />
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] transition group-hover:border-white/[0.16] group-hover:bg-white/[0.06]">
                        <Icon name="arrow" size={17} />
                      </div>
                    </div>

                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {area.tag}
                    </span>

                    <h4 className="mt-2 text-lg font-semibold text-white">
                      {area.title}
                    </h4>

                    <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                      {area.description}
                    </p>

                    <div className="mt-auto pt-6 text-xs font-medium text-violet-300">
                      Open practice
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* RESUME TOOLS */}
            <div
              id="resume-tools"
              className="mb-5 mt-10 scroll-mt-8 flex items-end justify-between"
            >
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-violet-400">
                  Resume Tools
                </p>
                <h3 className="text-xl font-bold sm:text-2xl">
                  Build a stronger resume
                </h3>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/resume-analyzer")}                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-cyan-500/20 to-blue-500/5 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-xl hover:shadow-cyan-950/20"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                    <Icon name="file" size={23} />
                  </div>
                  <Icon name="arrow" size={18} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Career Boost
                </span>
                <h4 className="mt-2 text-lg font-semibold text-white">
                  Resume Analyzer
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Analyze your resume against a job description and find gaps, missing skills, and improvement areas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => router.push("/resume-builder")}                className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-emerald-500/20 to-teal-500/5 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-white/[0.18] hover:shadow-xl hover:shadow-emerald-950/20"
              >
                <div className="mb-5 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                    <Icon name="chart" size={23} />
                  </div>
                  <Icon name="arrow" size={18} />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Smart Builder
                </span>
                <h4 className="mt-2 text-lg font-semibold text-white">
                  ATS Resume Builder
                </h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Create a professional, ATS-friendly resume tailored to your target role and job description.
                </p>
              </button>
            </div>

            {/* BOTTOM SECTION */}
            <div className="mt-10 grid gap-5 lg:grid-cols-2">

              {/* Getting Started */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Your next steps</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Build momentum with these actions
                    </p>
                  </div>
                  <Icon name="sparkles" size={20} />
                </div>

                <div className="space-y-3">
                  {[
                    {
                      label: "Choose your target job role",
                      route: "/mock-interview",
                    },
                    {
                      label: "Start your first mock interview",
                      route: "/mock-interview",
                    },
                    {
                      label: "Explore Coding or Communication Practice",
                      route: "/coding-practice",
                    },
                  ].map((item, index) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => router.push(item.route)}
                      className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 text-left transition hover:border-violet-400/20 hover:bg-violet-500/[0.06]"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-300">
                        {index + 1}
                      </div>
                      <span className="flex-1 text-sm text-slate-300 transition group-hover:text-white">
                        {item.label}
                      </span>
                      <Icon name="arrow" size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-6">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Recent activity</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      Your latest career progress
                    </p>
                  </div>
                  <Icon name="clock" size={20} />
                </div>

                {activityLoading ? (
                  <div className="flex min-h-[150px] items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
                  </div>
                ) : activities.length === 0 ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04]">
                      <Icon name="chart" size={22} />
                    </div>
                    <p className="text-sm font-medium text-slate-300">No activity yet</p>
                    <p className="mt-1 max-w-xs text-xs text-slate-500">
                      Complete an interview, resume analysis, coding practice, or
                      communication practice to see progress here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities.slice(0, 5).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300">
                          <Icon name={activityIcon(activity.activity_type)} size={17} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-medium text-slate-200">
                              {activity.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-slate-600">
                              {formatActivityTime(activity.created_at)}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {activity.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-10 border-t border-white/[0.06] pt-5 text-center text-xs text-slate-600">
              VRoom AI · Practice. Improve. Get hired.
            </div>

          </div>
        </section>
      </div>
    </main>
  );
}