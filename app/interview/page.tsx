"use client";

import { useEffect, useRef, useState } from "react";

type VoiceStyle =
  | "softFemale"
  | "professionalFemale"
  | "softMale"
  | "professionalMale";

const questions = [
  "Please tell me about yourself.",
  "Why are you interested in this role?",
  "What are your greatest strengths?",
  "What is one weakness you are working on?",
  "Describe a challenging situation and how you handled it.",
  "Tell me about a project or achievement you are proud of.",
  "How do you handle pressure and deadlines?",
  "How do you work with a team?",
  "Where do you see yourself in the next five years?",
  "Why should we hire you?",
];

export default function InterviewPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  const [voiceStyle, setVoiceStyle] =
    useState<VoiceStyle>("softFemale");

  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef("");

  const currentQuestion = questions[currentQuestionIndex];

  const speakQuestion = (question: string) => {
    if (typeof window === "undefined") return;

    if (!("speechSynthesis" in window)) {
      alert("Your browser does not support voice playback.");
      return;
    }

    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();

    let selectedVoice: SpeechSynthesisVoice | undefined;

    if (voiceStyle === "softFemale") {
      selectedVoice = voices.find((voice) =>
        /female|zira|samantha|karen|susan|google uk english female/i.test(
          voice.name
        )
      );
    }

    if (voiceStyle === "professionalFemale") {
      selectedVoice = voices.find((voice) =>
        /female|zira|samantha|google us english/i.test(voice.name)
      );
    }

    if (voiceStyle === "softMale") {
      selectedVoice = voices.find((voice) =>
        /male|david|daniel|alex|google uk english male/i.test(
          voice.name
        )
      );
    }

    if (voiceStyle === "professionalMale") {
      selectedVoice = voices.find((voice) =>
        /male|mark|daniel|google us english male/i.test(
          voice.name
        )
      );
    }

    if (!selectedVoice) {
      selectedVoice = voices.find((voice) =>
        voice.lang.toLowerCase().startsWith("en")
      );
    }

    const speech = new SpeechSynthesisUtterance(question);

    speech.voice = selectedVoice || null;
    speech.lang = "en-IN";

    if (
      voiceStyle === "softFemale" ||
      voiceStyle === "softMale"
    ) {
      speech.rate = 0.82;
      speech.pitch = 1.1;
      speech.volume = 0.9;
    } else {
      speech.rate = 0.95;
      speech.pitch = 1;
      speech.volume = 1;
    }

    speech.onstart = () => {
      setIsSpeaking(true);
    };

    speech.onend = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(speech);
  };

  const startInterview = () => {
    setIsStarted(true);
    setIsCompleted(false);
    setCurrentQuestionIndex(0);
    setTranscript("");
    setFeedback("");
    finalTranscriptRef.current = "";

    setTimeout(() => {
      speakQuestion(questions[0]);
    }, 300);
  };

  const startListening = () => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Speech recognition is not supported in this browser. Please use Google Chrome or type your answer."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;

    // Preserve text that the user has already typed.
    finalTranscriptRef.current = transcript;
    setFeedback("");

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscriptRef.current += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      setTranscript(
        finalTranscriptRef.current + interimTranscript
      );
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsListening(false);
  };

  const submitAnswer = () => {
    stopListening();

    const answer = transcript.trim();

    if (!answer) {
      alert("Please type or speak your answer first.");
      return;
    }

    const answerLength = answer.split(/\s+/).length;

    if (answerLength < 15) {
      setFeedback(
        `Overall Feedback:
Your answer is understandable, but it is too short.

Strengths:
• You started answering the question directly.
• Your main point is visible.

Areas to Improve:
• Explain your answer in more detail.
• Add one practical example.
• Explain what you personally did.
• Mention the result or outcome.

Suggestion:
Try to structure your answer using:
Situation → Action → Result.`
      );
    } else if (answerLength < 35) {
      setFeedback(
        `Overall Feedback:
Your answer is relevant and understandable, but it can be more detailed.

Strengths:
• Your answer is connected to the question.
• Your main idea is clear.
• Your tone is professional.

Areas to Improve:
• Add a specific example.
• Explain your personal contribution.
• Use more structured sentences.
• Mention the final result clearly.

Suggestion:
Explain what happened, what action you took, and what you learned from the experience.`
      );
    } else {
      setFeedback(
        `Overall Feedback:
Good attempt! Your answer has enough detail and shows clear communication.

Strengths:
• Your answer is detailed.
• Your response is relevant.
• You have explained your thoughts clearly.
• Your communication sounds professional.

Areas to Improve:
• Avoid unnecessary repetition.
• Keep your answer structured.
• Highlight the most important points first.
• Add measurable results whenever possible.

Suggestion:
Continue using examples and organize your answer with a clear beginning, action, and result.`
      );
    }
  };

  const nextQuestion = () => {
    if (currentQuestionIndex === questions.length - 1) {
      setIsCompleted(true);

      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }

      return;
    }

    const nextIndex = currentQuestionIndex + 1;

    setCurrentQuestionIndex(nextIndex);
    setTranscript("");
    setFeedback("");
    finalTranscriptRef.current = "";

    setTimeout(() => {
      speakQuestion(questions[nextIndex]);
    }, 300);
  };

  const replayQuestion = () => {
    speakQuestion(currentQuestion);
  };

  const restartInterview = () => {
    setIsCompleted(false);
    setIsStarted(true);
    setCurrentQuestionIndex(0);
    setTranscript("");
    setFeedback("");
    finalTranscriptRef.current = "";

    setTimeout(() => {
      speakQuestion(questions[0]);
    }, 300);
  };

  const exitInterview = () => {
    stopListening();

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }

    setIsStarted(false);
    setIsCompleted(false);
    setTranscript("");
    setFeedback("");
    finalTranscriptRef.current = "";
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  if (isCompleted) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center shadow-2xl">
          <div className="mb-5 text-6xl">🎉</div>

          <h1 className="mb-4 text-3xl font-bold">
            Interview Completed
          </h1>

          <p className="mb-8 text-slate-300">
            Great job! You completed all {questions.length} questions.
            Keep practicing to improve your confidence and communication.
          </p>

          <button
            onClick={restartInterview}
            className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500"
          >
            Start Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-indigo-400">
              VRoom AI
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Voice Mock Interview
            </h1>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Question {currentQuestionIndex + 1} of {questions.length}
          </div>
        </div>

        {!isStarted ? (
          /* Start Screen */
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl sm:p-12">
            <div className="mb-6 text-6xl">🎙️</div>

            <h2 className="mb-4 text-2xl font-bold">
              Ready for your interview?
            </h2>

            <p className="mx-auto mb-8 max-w-xl text-slate-300">
              Select your preferred interviewer voice. You can answer
              using your microphone or type your answer manually.
            </p>

            {/* Voice Selection */}
            <div className="mx-auto mb-6 max-w-xl text-left">
              <label className="mb-3 block text-sm font-semibold text-slate-300">
                Choose Interviewer Voice
              </label>

              <select
                value={voiceStyle}
                onChange={(event) =>
                  setVoiceStyle(
                    event.target.value as VoiceStyle
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-indigo-500"
              >
                <option value="softFemale">
                  Soft Female — Calm and Friendly
                </option>

                <option value="professionalFemale">
                  Professional Female — Clear and Formal
                </option>

                <option value="softMale">
                  Soft Male — Calm and Friendly
                </option>

                <option value="professionalMale">
                  Professional Male — Confident and Formal
                </option>
              </select>
            </div>

            <button
              onClick={startInterview}
              className="rounded-xl bg-indigo-600 px-8 py-3 font-semibold transition hover:bg-indigo-500"
            >
              Start Voice Interview
            </button>
          </section>
        ) : (
          <div className="space-y-6">
            {/* Question Section */}
            <section className="rounded-3xl border border-indigo-500/30 bg-slate-900 p-6 shadow-xl sm:p-8">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-indigo-400">
                    AI Interviewer
                  </p>

                  <h2 className="mt-2 text-xl font-semibold leading-relaxed sm:text-2xl">
                    {currentQuestion}
                  </h2>
                </div>

                <div className="text-3xl">
                  {isSpeaking ? "🔊" : "🤖"}
                </div>
              </div>

              <button
                onClick={replayQuestion}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
              >
                🔁 Replay Question
              </button>
            </section>

            {/* Answer Section */}
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl sm:p-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  Your Answer
                </h2>

                {isListening && (
                  <span className="flex items-center gap-2 text-sm text-red-400">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    Listening...
                  </span>
                )}
              </div>

              <textarea
                value={transcript}
                onChange={(event) => {
                  setTranscript(event.target.value);
                  finalTranscriptRef.current =
                    event.target.value;
                }}
                placeholder="Type your answer here or start speaking..."
                className="min-h-36 w-full resize-y rounded-2xl border border-slate-700 bg-slate-950 p-5 text-slate-200 outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={startListening}
                  className={`rounded-xl px-5 py-3 font-semibold transition ${
                    isListening
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {isListening
                    ? "⏹️ Stop Speaking"
                    : "🎙️ Start Speaking"}
                </button>

                <button
                  onClick={submitAnswer}
                  className="rounded-xl bg-indigo-600 px-5 py-3 font-semibold transition hover:bg-indigo-500"
                >
                  Submit Answer
                </button>
              </div>

              {/* Feedback Section */}
              {feedback && (
                <div className="mt-8 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="text-2xl">🧠</span>

                    <h2 className="text-xl font-bold text-white">
                      AI Feedback
                    </h2>
                  </div>

                  <div className="whitespace-pre-line leading-7 text-slate-300">
                    {feedback}
                  </div>

                  <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950 p-5">
                    <h3 className="mb-3 font-semibold text-indigo-300">
                      Your answer will be evaluated for:
                    </h3>

                    <ul className="space-y-2 text-slate-300">
                      <li>• Meaning and understanding</li>
                      <li>• Relevance to the question</li>
                      <li>• Grammar and sentence structure</li>
                      <li>• Clarity and confidence</li>
                      <li>• Professional communication</li>
                    </ul>
                  </div>

                  {/* Only one Next Question button */}
                  <button
                    onClick={nextQuestion}
                    className="mt-6 rounded-xl bg-indigo-600 px-6 py-3 font-semibold transition hover:bg-indigo-500"
                  >
                    {currentQuestionIndex === questions.length - 1
                      ? "Finish Interview"
                      : "Next Question"}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}