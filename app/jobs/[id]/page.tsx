"use client";
import { useEffect,useState } from "react";
import { useParams,useRouter } from "next/navigation";
type Job={id:string;source:string;company:string;title:string;location:string;workplaceType:string;employmentType:string;description:string;postedAt:string;applyUrl:string;jobUrl:string};
export default function JobDetails(){
 const router=useRouter(),params=useParams(); const [job,setJob]=useState<Job|null>(null);
 useEffect(()=>{const id=decodeURIComponent(String(params.id||""));try{const x=localStorage.getItem(`vroom-job:${id}`);if(x)setJob(JSON.parse(x))}catch{}},[params.id]);
 function practice(){if(!job)return;localStorage.setItem("vroom-selected-job",JSON.stringify(job));router.push("/mock-interview")}
 if(!job)return <main className="flex min-h-screen items-center justify-center bg-[#080b16] px-5 text-white"><div className="text-center"><h1 className="text-2xl font-bold">Job details unavailable</h1><p className="mt-2 text-sm text-slate-400">Open this job again from the VRoom AI Jobs page.</p><button onClick={()=>router.push("/jobs")} className="mt-5 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#101426]">Back to Jobs</button></div></main>;
 return <main className="min-h-screen bg-[#080b16] text-white"><header className="border-b border-white/[.07]"><div className="mx-auto flex h-16 max-w-5xl items-center px-5 sm:px-8"><button onClick={()=>router.push("/jobs")} className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">← All Jobs</button></div></header>
 <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8"><section className="rounded-3xl border border-white/[.08] bg-white/[.025] p-6 sm:p-8"><span className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-300">{job.company}</span><h1 className="mt-2 text-3xl font-bold">{job.title}</h1><p className="mt-2 text-sm text-slate-400">{job.location||"Location not listed"} {job.workplaceType?`· ${job.workplaceType}`:""} {job.employmentType?`· ${job.employmentType}`:""}</p>
 <div className="mt-6 flex flex-wrap gap-3"><a href={job.applyUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#07110d]">Apply on Company Application ↗</a><button onClick={practice} className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-300">Practice for this Job</button><button onClick={()=>router.push("/resume-analyzer")} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-300">Check Resume</button></div></section>
 <section className="mt-5 rounded-3xl border border-white/[.08] bg-white/[.025] p-6 sm:p-8"><h2 className="text-xl font-bold">Job Description</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-300">{job.description}</p></section>
 <p className="mt-4 text-xs text-slate-600">Application destination is the employer's ATS-hosted application form supplied with the active posting.</p></div></main>
}

