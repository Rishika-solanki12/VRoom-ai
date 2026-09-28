"use client";

import { useEffect, useMemo, useState } from "react";

type VoiceMode =
  | "soft-female"
  | "professional-female"
  | "soft-male"
  | "professional-male";

const TEST_TEXT =
  "Hello, welcome to VRoom AI. I will be your interviewer today. Please introduce yourself and tell me about your experience.";

function voiceScore(voice: SpeechSynthesisVoice, mode: VoiceMode) {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith("en")) score += 20;
  if (lang.includes("in")) score += 5;

  const malePriority = [
    "david",
    "mark",
    "daniel",
    "alex",
    "google uk english male",
    "google us english male",
    "microsoft david",
    "microsoft mark",
  ];

  const femalePriority = [
    "zira",
    "samantha",
    "victoria",
    "karen",
    "google uk english female",
    "google us english female",
    "microsoft zira",
  ];

  const wanted = mode.includes("male") ? malePriority : femalePriority;
  wanted.forEach((key, index) => {
    if (name.includes(key)) score += 100 - index * 5;
  });

  if (mode.includes("male") && /(female|zira|samantha|victoria|karen)/.test(name))
    score -= 80;
  if (mode.includes("female") && /(male|david|mark|daniel|alex)/.test(name))
    score -= 80;

  if (voice.localService) score += 5;
  return score;
}

export default function VoiceTestPage() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [activeMode, setActiveMode] = useState<VoiceMode | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [status, setStatus] = useState("Loading browser voices...");

  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      if (all.length) {
        setVoices(all);
        setStatus(`${all.length} browser/system voices found.`);
      }
    };

    load();
    window.speechSynthesis.onvoiceschanged = load;

    return () => {
      window.speechSynthesis.cancel();
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const englishVoices = useMemo(
    () => voices.filter((v) => v.lang.toLowerCase().startsWith("en")),
    [voices]
  );

  function pickVoice(mode: VoiceMode) {
    const pool = englishVoices.length ? englishVoices : voices;
    return [...pool].sort(
      (a, b) => voiceScore(b, mode) - voiceScore(a, mode)
    )[0];
  }

  function play(mode: VoiceMode) {
    window.speechSynthesis.cancel();

    const voice = pickVoice(mode);
    if (!voice) {
      setStatus("No browser voice found. Try Chrome or Edge on Windows.");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(TEST_TEXT);
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-US";

    if (mode === "soft-female") {
      utterance.rate = 0.92;
      utterance.pitch = 1.08;
    } else if (mode === "professional-female") {
      utterance.rate = 0.96;
      utterance.pitch = 1.0;
    } else if (mode === "soft-male") {
      utterance.rate = 0.9;
      utterance.pitch = 0.82;
    } else {
      utterance.rate = 0.94;
      utterance.pitch = 0.72;
    }

    setActiveMode(mode);
    setSelectedName(`${voice.name} (${voice.lang})`);
    setStatus("Playing...");

    utterance.onend = () => setStatus("Finished. Try the other voices.");
    utterance.onerror = () => setStatus("Voice playback failed.");

    window.speechSynthesis.speak(utterance);
  }

  const cards: { mode: VoiceMode; title: string; subtitle: string }[] = [
    { mode: "soft-female", title: "Vira — Soft Female", subtitle: "Warm and natural" },
    { mode: "professional-female", title: "Vira — Professional Female", subtitle: "Clear interview tone" },
    { mode: "soft-male", title: "Rivan — Soft Male", subtitle: "Natural male voice" },
    { mode: "professional-male", title: "Rivan — Professional Male", subtitle: "Deeper professional male" },
  ];

  return (
    <main className="min-h-screen bg-[#080b16] px-5 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-2 text-sm font-medium text-violet-300">VRoom AI</p>
        <h1 className="text-3xl font-bold">Interviewer Voice Test</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Pehle yahan voices suno. Jo Rivan ki real male voice best lage,
          uska exact system voice name neeche show hoga.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cards.map((card) => (
            <button
              key={card.mode}
              type="button"
              onClick={() => play(card.mode)}
              className={`rounded-2xl border p-5 text-left transition ${
                activeMode === card.mode
                  ? "border-violet-400 bg-violet-500/15"
                  : "border-white/10 bg-white/[0.035] hover:border-violet-400/50"
              }`}
            >
              <div className="text-lg font-semibold">{card.title}</div>
              <div className="mt-1 text-sm text-slate-400">{card.subtitle}</div>
              <div className="mt-4 text-xs font-semibold uppercase tracking-wider text-violet-300">
                ▶ Play voice
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Actual voice selected by your browser
          </p>
          <p className="mt-2 break-words font-semibold text-violet-200">
            {selectedName || "Play a voice first"}
          </p>
          <p className="mt-2 text-sm text-slate-400">{status}</p>
        </div>

        <button
          type="button"
          onClick={() => {
            window.speechSynthesis.cancel();
            setActiveMode(null);
            setStatus("Stopped.");
          }}
          className="mt-5 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Stop Voice
        </button>
      </div>
    </main>
  );
}
