"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Language = {
  name: string;
  icon: string;
  description: string;
};

const languages: Language[] = [
  {
    name: "Python",
    icon: "🐍",
    description: "Beginner friendly · AI, Data & DSA",
  },
  {
    name: "JavaScript",
    icon: "🟨",
    description: "Web development · Logic & DSA",
  },
  {
    name: "Java",
    icon: "☕",
    description: "Backend · OOP & DSA",
  },
  {
    name: "C++",
    icon: "⚡",
    description: "DSA · Competitive programming",
  },
  {
    name: "C",
    icon: "🔷",
    description: "Programming fundamentals",
  },
];

const topics = [
  "Basics",
  "Arrays",
  "Strings",
  "Functions",
  "OOP",
  "Searching",
  "Sorting",
  "Linked List",
  "Stack & Queue",
  "Trees",
  "Graphs",
  "Dynamic Programming",
];

const difficulties = ["Easy", "Medium", "Hard"];

type TestCase = {
  input: string;
  expectedOutput: string;
};

type RunTestCase = TestCase;

type CodingProblem = {
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  exampleInput: string;
  exampleOutput: string;
  constraints: string[];
  testCases: TestCase[];
  starterCode?: string;
};

type CodingSession = {
  id: string;
  title: string;
  language: string;
  topic: string;
  difficulty: string;
  code: string;
  stdin: string;
  output: string;
  status: string;
  createdAt: string;
};

type InterviewCodingQuestion = {
  id?: string;
  question: string;
  role?: string;
  practiceGoal?: string;
  difficulty?: string;
  experience?: string;
  createdAt?: string;
  conversationHistory?: any[];
  previousLiveMessages?: {
    role: "user" | "assistant";
    text: string;
  }[];
};

type InterviewCodingHandoff = {
  id: string;
  question: string;
  role: string;
  practiceGoal: string;
  difficulty: string;
  experience: string;
  language: string;
  code: string;
  stdin: string;
  output: string;
  runStatus: string;
  submissionStatus: "not_submitted" | "accepted" | "wrong_answer";
  submissionSummary: string;
  createdAt: string;
  returnedAt: string;
  conversationHistory?: any[];
  previousLiveMessages?: {
    role: "user" | "assistant";
    text: string;
  }[];
};


function Icon({
  name,
  size = 20,
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
          <path d="m19 15-.7 2.3L16 18l2.3.7L19 21l.7-2.3L19 15Z" />
        </svg>
      );

    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      );

    case "play":
      return (
        <svg
          {...common}
          fill="currentColor"
          stroke="none"
        >
          <path d="M8 5v14l11-7L8 5Z" />
        </svg>
      );

    case "send":
      return (
        <svg {...common}>
          <path d="m22 2-7 20-4-9-9-4Z" />
          <path d="M22 2 11 13" />
        </svg>
      );

    case "lightbulb":
      return (
        <svg {...common}>
          <path d="M9 18h6" />
          <path d="M10 22h4" />
          <path d="M8.5 14.5C7.5 13.6 7 12.3 7 11a5 5 0 0 1 10 0c0 1.3-.5 2.6-1.5 3.5-.8.7-1.3 1.3-1.5 2.5h-4c-.2-1.2-.7-1.8-1.5-2.5Z" />
        </svg>
      );

    case "book":
      return (
        <svg {...common}>
          <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5v-17Z" />
          <path d="M4 19V4.5M8 6h8M8 10h8M8 14h5" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "rotate":
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
      );

    case "code":
      return (
        <svg {...common}>
          <path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      );

    default:
      return null;
  }
}

export default function CodingPracticePage() {
  const router = useRouter();

  const [fromInterview, setFromInterview] = useState(false);
  const [interviewQuestion, setInterviewQuestion] =
    useState<InterviewCodingQuestion | null>(null);

  const [selectedLanguage, setSelectedLanguage] =
    useState("Python");

  const [selectedTopic, setSelectedTopic] =
    useState("Arrays");

  const [selectedDifficulty, setSelectedDifficulty] =
    useState("Easy");

  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [runTestCases, setRunTestCases] = useState<RunTestCase[]>([]);
  const [codingSessions, setCodingSessions] =
    useState<CodingSession[]>(() => {
      if (typeof window === "undefined") {
        return [];
      }

      try {
        const savedSessions = localStorage.getItem(
          "vroom-coding-sessions"
        );

        if (!savedSessions) {
          return [];
        }

        const parsed = JSON.parse(savedSessions);

        return Array.isArray(parsed)
          ? parsed.slice(0, 20)
          : [];
      } catch (error) {
        console.error(
          "Failed to restore coding session history:",
          error
        );
        return [];
      }
    });

  const [showSessionHistory, setShowSessionHistory] =
    useState(false);

  const [currentProblem, setCurrentProblem] =
    useState<CodingProblem | null>(null);

  const [output, setOutput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const [runResult, setRunResult] = useState<{
    status: string;
    output: string;
    error: string;
  } | null>(null);

  const [submissionResult, setSubmissionResult] = useState<{
    correct: boolean;
    passedCount: number;
    totalTests: number;
    results: {
      testCase: number;
      passed: boolean;
      input: string;
      expectedOutput: string;
      actualOutput: string;
      status: string;
    }[];
    message: string;
  } | null>(null);

  const [askText, setAskText] = useState("");

  const [showLanguageMenu, setShowLanguageMenu] =
    useState(false);

  const [activePanel, setActivePanel] = useState<
    "problem" | "editor"
  >("problem");

  const [codeScrollTop, setCodeScrollTop] = useState(0);

  const [isRunning, setIsRunning] =
    useState(false);

  const [isSubmitted, setIsSubmitted] =
    useState(false);

  const [isAiLoading, setIsAiLoading] =
    useState(false);

  const [aiTitle, setAiTitle] =
    useState("");

  const [aiResult, setAiResult] =
    useState("");

  // Keep the latest 20 sessions saved permanently.
  // New session = position 1, oldest session is automatically removed.
  useEffect(() => {
    try {
      localStorage.setItem(
        "vroom-coding-sessions",
        JSON.stringify(
          codingSessions.slice(0, 20)
        )
      );
    } catch (error) {
      console.error(
        "Failed to save coding session history:",
        error
      );
    }
  }, [codingSessions]);

  const changeLanguage = (language: string) => {
    setSelectedLanguage(language);
    setCode("");
    setStdin("");
    setRunTestCases([]);
    setOutput("");
    setRunResult(null);
    setCodeScrollTop(0);
    setIsSubmitted(false);
    setSubmissionResult(null);
    setAiTitle("");
    setAiResult("");
    setShowLanguageMenu(false);
  };

  const resetCode = () => {
    setCode("");
    setOutput("");
    setRunResult(null);
    setCodeScrollTop(0);
    setIsSubmitted(false);
    setSubmissionResult(null);
    setAiTitle("");
    setAiResult("");
  };

  const runCode = async () => {
    if (!code.trim()) {
      setOutput(
        "Please write some code before running it."
      );
      return;
    }

    setIsRunning(true);
    setIsSubmitted(false);
    setRunResult(null);
    setOutput("");

    try {
      const response = await fetch(
        "/api/coding-run",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            stdin,
          }),
        }
      );

      const text = await response.text();

      let data: any = null;

      try {
        data = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          "The code execution server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Code execution failed."
        );
      }

      const stdout = typeof data?.stdout === "string"
        ? data.stdout.trimEnd()
        : "";

    const status =
    typeof data?.status === "string"
        ? data.status
        : "";

      const stderr = typeof data?.stderr === "string"
        ? data.stderr.trim()
        : "";

      const compileOutput =
        typeof data?.compile_output === "string"
          ? data.compile_output.trim()
          : "";

      let resultStatus = "Completed";
      let resultError = "";

      if (compileOutput) {
        resultStatus = "Compilation Error";
        resultError = compileOutput;
      } else if (stderr) {
        resultStatus = "Runtime Error";
        resultError = stderr;
      } else if (status === "Accepted") {
        resultStatus = "Executed Successfully";
      } else if (status) {
        resultStatus = status;
      }

      setRunResult({
        status: resultStatus,
        output: stdout,
        error: resultError,
      });
    saveCodingSession(
      resultStatus,
      stdout || resultError || "No output"
    );

      if (
        currentProblem &&
        stdin.trim() &&
        status === "Accepted"
      ) {
        try {
          const expectedResponse = await fetch("/api/coding", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              action: "expected_output",
              language: selectedLanguage,
              topic: selectedTopic,
              difficulty: selectedDifficulty,
              userRequest: stdin,
              problem: currentProblem,
            }),
          });

          const expectedData = await expectedResponse.json();

          if (!expectedResponse.ok || typeof expectedData?.expectedOutput !== "string") {
            throw new Error(
              expectedData?.error ||
                "Could not calculate the expected output for this test input."
            );
          }

          const normalizedInput = stdin.trim();
          const newTestCase: RunTestCase = {
            input: normalizedInput,
            expectedOutput: expectedData.expectedOutput.trim(),
          };

          setRunTestCases((previous) => {
            const existingIndex = previous.findIndex(
              (testCase) => testCase.input.trim() === normalizedInput
            );

            if (existingIndex === -1) {
              return [...previous, newTestCase];
            }

            const updated = [...previous];
            updated[existingIndex] = newTestCase;
            return updated;
          });
        } catch (expectedError) {
          console.error("Expected output error:", expectedError);
          setOutput(
            stdout +
              "\n\n⚠️ Output was generated, but this input could not be added to Submit tests. Please try Run again."
          );
        }
      }

      if (stdout) {
        setOutput(stdout);
      } else if (compileOutput) {
        setOutput(`Compile Error\\n\\n${compileOutput}`);
      } else if (stderr) {
        setOutput(`Runtime Error\\n\\n${stderr}`);
      } else if (status && status !== "Accepted") {
        setOutput(status);
      } else {
        setOutput("Program finished without output.");
      }
    } catch (error) {
      console.error(
        "Run code error:",
        error
      );

      setOutput(
        error instanceof Error
          ? error.message
          : "Something went wrong while running the code."
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Save every practice result in FIFO order: newest first, maximum 20 sessions.
  const saveCodingSession = (status: string, resultOutput: string) => {
    const session: CodingSession = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: currentProblem?.title || "Coding Practice",
      language: selectedLanguage,
      topic: selectedTopic,
      difficulty: selectedDifficulty,
      code,
      stdin,
      output: resultOutput,
      status,
      createdAt: new Date().toISOString(),
    };

    setCodingSessions((previous) => {
      const updatedSessions = [session, ...previous];

      // Newest session is #1. Keep only the newest 20.
      // When #21 is added, the old #20 is removed automatically.
      return updatedSessions.slice(0, 20);
    });
  };

  const submitCode = async () => {
    if (!code.trim()) {
      setOutput("Please write some code before submitting it.");
      return;
    }

    if (!currentProblem) {
      setOutput("No coding problem is loaded yet.");
      return;
    }

    if (runTestCases.length === 0) {
      setOutput(
        "Run your code with at least one input first. Each successful Run becomes a test case for Submit."
      );
      return;
    }

    setIsSubmitted(true);
    setRunResult(null);
    setSubmissionResult(null);
    setOutput("Checking your solution against test cases...");

    try {
      const response = await fetch(
        "/api/coding-run",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            language: selectedLanguage,
            code,
            mode: "submit",
            testCases: runTestCases,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Submission failed."
        );
      }

      setSubmissionResult(data);

      saveCodingSession(
        data.correct ? "Accepted" : "Wrong Answer",
        data.correct
          ? `All ${data.totalTests ?? runTestCases.length} test cases passed.`
          : data.results?.[0]?.actualOutput || "Some test cases failed."
      );

      if (data.correct) {
        setOutput(
          `✅ Correct! All ${data.totalTests} test cases passed.`
        );

        // Daily goal: count only Accepted unique problems, never repeated submits.
        try {
          const { data: authData } = await supabase.auth.getUser();
          if (authData.user && currentProblem) {
            const problemTitle = currentProblem.title || "Coding Practice";
            const problemId = `${selectedLanguage}|${selectedTopic}|${selectedDifficulty}|${problemTitle}`
              .toLowerCase()
              .replace(/\s+/g, "-")
              .slice(0, 240);

            const dayStart = new Date();
            dayStart.setHours(0, 0, 0, 0);

            const { data: existing } = await supabase
              .from("user_activities")
              .select("id")
              .eq("user_id", authData.user.id)
              .eq("activity_type", "coding_practice")
              .gte("created_at", dayStart.toISOString())
              .contains("metadata", { problem_id: problemId })
              .limit(1);

            if (!existing?.length) {
              const { error: activityError } = await supabase.from("user_activities").insert({
                user_id: authData.user.id,
                activity_type: "coding_practice",
                title: problemTitle,
                description: `${selectedLanguage} · ${selectedTopic} · ${selectedDifficulty} · Accepted`,
                score: 100,
                duration_minutes: 0,
                metadata: {
                  problem_id: problemId,
                  problem_title: problemTitle,
                  language: selectedLanguage,
                  topic: selectedTopic,
                  difficulty: selectedDifficulty,
                  accepted: true,
                },
              });
              if (activityError) console.warn("Coding activity was not saved:", activityError);
            }
          }
        } catch (activityError) {
          console.warn("Coding activity was not saved:", activityError);
        }
      } else {
        const firstFailed = data.results?.find(
          (item: any) => !item.passed
        );

        if (
          firstFailed &&
          firstFailed.status !== "Accepted"
        ) {
          setOutput(
            `❌ Test case ${firstFailed.testCase} failed.\n\n${firstFailed.status}\n\nExpected:\n${firstFailed.expectedOutput}\n\nYour output:\n${firstFailed.actualOutput || "(no output)"}`
          );
        } else if (firstFailed) {
          setOutput(
            `❌ Wrong Answer on test case ${firstFailed.testCase}.\n\nExpected:\n${firstFailed.expectedOutput}\n\nYour output:\n${firstFailed.actualOutput || "(no output)"}`
          );
        } else {
          setOutput(
            "❌ Some test cases failed. Please review your code."
          );
        }
      }
    } catch (error) {
      console.error("Submit code error:", error);

      setOutput(
        error instanceof Error
          ? error.message
          : "Something went wrong while checking your solution."
      );
    }
  };

  const loadInterviewCodingQuestion = () => {
    if (typeof window === "undefined") return false;

    try {
      const rawQuestion = sessionStorage.getItem(
        "vroom-interview-coding-question"
      );

      if (!rawQuestion) {
        setOutput(
          "The interview coding question could not be found. Please return to the interview and open the coding workspace again."
        );
        return false;
      }

      let transferred: InterviewCodingQuestion;

      try {
        const parsed = JSON.parse(rawQuestion);
        transferred =
          typeof parsed === "string"
            ? { question: parsed }
            : parsed;
      } catch {
        transferred = { question: rawQuestion };
      }

      const question = String(transferred?.question || "").trim();

      if (!question) {
        setOutput(
          "The interview coding question is empty. Please return to the interview and open the coding workspace again."
        );
        return false;
      }

      setInterviewQuestion(transferred);
      setFromInterview(true);

      if (transferred.difficulty) {
        setSelectedDifficulty(transferred.difficulty);
      }

      setSelectedLanguage("Python");
      setSelectedTopic("Arrays");
      setCode("");
      setStdin("");
      setRunTestCases([]);
      setOutput("");
      setRunResult(null);
      setSubmissionResult(null);
      setIsSubmitted(false);
      setAiTitle("");
      setAiResult("");
      setActivePanel("problem");

      setCurrentProblem({
        title: "Interview Coding Question",
        statement: question,
        inputFormat:
          "Use the Test Input box to provide the input your program should read from stdin.",
        outputFormat:
          "Print the result required by the interviewer question.",
        exampleInput: "",
        exampleOutput: "",
        constraints: [],
        testCases: [],
        starterCode: "",
      });

      return true;
    } catch (error) {
      console.error("Failed to load interview coding question:", error);
      setOutput(
        "The interview coding question could not be loaded. Please return to the interview and try again."
      );
      return false;
    }
  };

  const continueInterview = () => {
    if (!fromInterview || !currentProblem || typeof window === "undefined") {
      return;
    }

    if (!code.trim()) {
      setOutput(
        "Please write your solution first. Then use Continue Interview to send your code back to the interview."
      );
      return;
    }

    const submissionStatus: InterviewCodingHandoff["submissionStatus"] =
      submissionResult
        ? submissionResult.correct
          ? "accepted"
          : "wrong_answer"
        : "not_submitted";

    const submissionSummary = submissionResult
      ? submissionResult.correct
        ? `Accepted: ${submissionResult.passedCount ?? 0}/${submissionResult.totalTests ?? 0} test cases passed.`
        : `Wrong answer: ${submissionResult.passedCount ?? 0}/${submissionResult.totalTests ?? 0} test cases passed.`
      : "The candidate did not submit against official test cases.";

    const handoff: InterviewCodingHandoff = {
      id:
        interviewQuestion?.id ||
        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      question: currentProblem.statement,
      role: interviewQuestion?.role || "",
      practiceGoal:
        interviewQuestion?.practiceGoal || "Coding & Problem Solving",
      difficulty:
        interviewQuestion?.difficulty || selectedDifficulty || "Intermediate",
      experience: interviewQuestion?.experience || "Fresher",
      language: selectedLanguage,
      code,
      stdin,
      output:
        runResult?.output ||
        output ||
        "No execution output was recorded.",
      runStatus: runResult?.status || "Not run",
      submissionStatus,
      submissionSummary,
      createdAt:
        interviewQuestion?.createdAt || new Date().toISOString(),
      returnedAt: new Date().toISOString(),
      conversationHistory:
        interviewQuestion?.conversationHistory || [],
      previousLiveMessages:
        interviewQuestion?.previousLiveMessages || [],
    };

    try {
      sessionStorage.setItem(
        "vroom-interview-coding-session",
        JSON.stringify(handoff)
      );
      sessionStorage.setItem(
        "vroom-interview-coding-question",
        JSON.stringify({
          ...interviewQuestion,
          question: currentProblem.statement,
        })
      );
    } catch (error) {
      console.error("Failed to save interview coding handoff:", error);
      setOutput(
        "The coding result could not be saved. Please try Continue Interview again."
      );
      return;
    }

    router.push("/mock-interview?resumeCoding=1");
  };

  const generateProblem = async (
    nextProblem = false
  ) => {
    setIsGenerating(true);
    setSubmissionResult(null);
    setIsSubmitted(false);
    setRunResult(null);
    setOutput("");
    setAiTitle("");
    setAiResult("");
    setCode("");
    setRunTestCases([]);

    try {
      const response = await fetch(
        "/api/coding",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: nextProblem ? "next_problem" : "generate",
            language: selectedLanguage,
            topic: selectedTopic,
            difficulty: selectedDifficulty,
            previousProblem: nextProblem
              ? currentProblem?.statement ?? ""
              : "",
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Could not generate a problem."
        );
      }

      if (!data?.problem) {
        throw new Error("AI returned no coding problem.");
      }

      setCurrentProblem({
        ...data.problem,
        starterCode: "",
      });
      setCode("");
      setStdin(data.problem.exampleInput || "");
      setActivePanel("problem");
      setOutput("");
    } catch (error) {
      console.error("Generate problem error:", error);

      setOutput(
        error instanceof Error
          ? error.message
          : "Something went wrong while generating the problem."
      );
    } finally {
      // Never carry code from the previous problem/page into the new one.
      setCode("");
      setIsGenerating(false);
    }
  };

  // Normal Coding Practice gets a fresh AI problem.
  // When opened from Mock Interview, load the exact transferred question.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const interviewSource = params.get("from") === "mock-interview";

    setCode("");
    setOutput("");
    setRunResult(null);
    setSubmissionResult(null);
    setIsSubmitted(false);
    setRunTestCases([]);
    setAiTitle("");
    setAiResult("");

    if (interviewSource) {
      const loaded = loadInterviewCodingQuestion();

      if (!loaded) {
        setFromInterview(false);
        void generateProblem(false);
      }
    } else {
      setFromInterview(false);
      setInterviewQuestion(null);
      void generateProblem(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const askAI = async () => {
    const request = askText.trim();

    if (!request) {
      setAiTitle("AI Ask");
      setAiResult("Type a coding question first.");
      return;
    }

    setAskText("");
    setAiTitle("AI Ask");
    setAiResult("");
    setIsAiLoading(true);

    try {
      const response = await fetch(
        "/api/coding",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "ask",
            language: selectedLanguage,
            topic: selectedTopic,
            difficulty: selectedDifficulty,
            userRequest: request,
            problem: currentProblem,
            code,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "AI request failed."
        );
      }

      const result =
        data?.result ||
        data?.answer ||
        data?.message ||
        data?.text;

      setAiResult(
        typeof result === "string"
          ? result
          : JSON.stringify(result, null, 2)
      );
    } catch (error) {
      console.error("AI Ask error:", error);

      setAiResult(
        error instanceof Error
          ? error.message
          : "Something went wrong while connecting to the AI."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const useAiTool = async (
    action: string,
    title: string
  ) => {
    setIsAiLoading(true);
    setAiTitle(title);
    setAiResult("");

    try {
      const response = await fetch(
        "/api/coding",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            action,
            language: selectedLanguage,
            topic: selectedTopic,
            difficulty:
              selectedDifficulty,

            problem: currentProblem,

            code,
          }),
        }
      );

      const text = await response.text();

      let data: any = null;

      try {
        data = text
          ? JSON.parse(text)
          : null;
      } catch {
        throw new Error(
          "The AI server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "AI request failed. Please try again."
        );
      }

      const result =
        data?.result ||
        data?.answer ||
        data?.message ||
        data?.text;

      if (!result) {
        throw new Error(
          "AI returned an empty response."
        );
      }

      setAiResult(
        typeof result === "string"
          ? result
          : JSON.stringify(
              result,
              null,
              2
            )
      );
    } catch (error) {
      console.error(
        "Coding AI error:",
        error
      );

      setAiResult(
        error instanceof Error
          ? error.message
          : "Something went wrong while connecting to the AI."
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const aiTools = [
    {
      icon: "lightbulb",
      title: "Get Hint",
      text: "Get a small clue without revealing the solution.",
      action: "hint",
    },
    {
      icon: "sparkles",
      title: "Explain",
      text: "Ask AI to explain the problem or your approach.",
      action: "explain",
    },
    {
      icon: "code",
      title: "Review Code",
      text: "Find bugs, edge cases and cleaner approaches.",
      action: "review",
    },
    {
      icon: "check",
      title: "Complexity",
      text: "Understand time and space complexity.",
      action: "complexity",
    },
  ];

  if (!currentProblem) {
    return (
      <main className="min-h-screen bg-[#080b16] text-white">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080b16]/95 backdrop-blur-xl">
          <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
<button
              onClick={() => router.push("/dashboard")}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
              aria-label="Back to dashboard"
            >
              <Icon name="back" size={18} />
            </button>

            <div className="ml-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Icon name="code" size={19} />
              </div>
              <div>
                <h1 className="text-sm font-bold sm:text-base">
                  Coding Practice
                </h1>
                <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                  Learn · Practice · Improve
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="flex min-h-[70vh] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />
            <p className="mt-4 text-sm font-semibold text-slate-300">
              {isGenerating
                ? "VRoom AI is creating your problem..."
                : "Loading Coding Practice..."}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please wait a moment.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#080b16] text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#080b16]/95 backdrop-blur-xl">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
              aria-label="Back to dashboard"
            >
              <Icon
                name="back"
                size={18}
              />
            </button>

            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Icon
                  name="code"
                  size={19}
                />
              </div>

              <div>
                <h1 className="text-sm font-bold sm:text-base">
                  Coding Practice
                </h1>

                <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
                  Learn · Practice · Improve
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <div className="rounded-full border border-emerald-400/15 bg-emerald-400/5 px-3 py-1.5 text-[11px] text-emerald-300">
              Practice Mode
            </div>

            <button
              onClick={() =>
                router.push("/dashboard")
              }
              className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-white/[0.05] hover:text-white"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-cyan-300">
            <Icon
              name="sparkles"
              size={15}
            />
            AI-powered coding workspace
          </div>

          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Practice coding with your AI coach
            <span className="text-cyan-400">
              .
            </span>
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Choose a language, select a topic
            and difficulty, solve problems, and
            use AI to understand your mistakes
            and improve your approach.
          </p>

          {fromInterview && (
            <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.05] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-bold text-cyan-200">
                    🎤 Interview Coding Task
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    This is the exact coding question given by your Mock Interview.
                    Write and test your solution here, then continue the interview.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={continueInterview}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-[#06101a] transition hover:bg-cyan-400"
                >
                  Save Code & Continue →
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            {!fromInterview && (
              <button
                onClick={() => generateProblem(true)}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-xs font-bold text-[#06101a] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="rotate" size={15} />
                {isGenerating ? "Loading..." : "Next Problem"}
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowSessionHistory((previous) => !previous)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:bg-white/[0.06]"
            >
              <Icon name="clock" size={15} />
              {showSessionHistory ? "Hide History" : "Code History"}
            </button>

            {fromInterview && (
              <button
                type="button"
                onClick={continueInterview}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/25 bg-cyan-400/[0.08] px-4 py-2.5 text-xs font-bold text-cyan-200 transition hover:border-cyan-300/40 hover:bg-cyan-400/[0.14]"
              >
                🎤 Continue Interview
              </button>
            )}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Programming Language
              </label>

              <button
                onClick={() =>
                  setShowLanguageMenu(
                    (value) => !value
                  )
                }
                className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#0d1221] px-4 py-3 text-left transition hover:border-cyan-400/20"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {
                      languages.find(
                        (language) =>
                          language.name ===
                          selectedLanguage
                      )?.icon
                    }
                  </span>

                  <div>
                    <p className="text-sm font-semibold">
                      {selectedLanguage}
                    </p>

                    <p className="text-[10px] text-slate-500">
                      {
                        languages.find(
                          (language) =>
                            language.name ===
                            selectedLanguage
                        )?.description
                      }
                    </p>
                  </div>
                </div>

                <span className="text-slate-500">
                  ⌄
                </span>
              </button>

              {showLanguageMenu && (
                <div className="absolute left-0 right-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-white/[0.1] bg-[#101625] p-1.5 shadow-2xl">
                  {languages.map(
                    (language) => (
                      <button
                        key={
                          language.name
                        }
                        onClick={() =>
                          changeLanguage(
                            language.name
                          )
                        }
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                          selectedLanguage ===
                          language.name
                            ? "bg-cyan-500/10 text-cyan-200"
                            : "text-slate-300 hover:bg-white/[0.05]"
                        }`}
                      >
                        <span className="text-lg">
                          {language.icon}
                        </span>

                        <div>
                          <p className="text-sm font-medium">
                            {language.name}
                          </p>

                          <p className="text-[10px] text-slate-500">
                            {
                              language.description
                            }
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Topic
              </label>

              <select
                value={selectedTopic}
                onChange={(event) =>
                  setSelectedTopic(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-white/[0.08] bg-[#0d1221] px-4 py-3 text-sm font-medium text-white outline-none focus:border-cyan-400/30"
              >
                {topics.map(
                  (topic) => (
                    <option
                      key={topic}
                    >
                      {topic}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">
                Difficulty
              </label>

              <div className="grid grid-cols-3 gap-2">
                {difficulties.map(
                  (difficulty) => (
                    <button
                      key={difficulty}
                      onClick={() => {
                        setSelectedDifficulty(difficulty);
                        setSubmissionResult(null);
                        setRunResult(null);
                        setIsSubmitted(false);
                      }}
                      className={`rounded-xl border px-3 py-3 text-xs font-semibold transition ${
                        selectedDifficulty ===
                        difficulty
                          ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
                          : "border-white/[0.08] bg-[#0d1221] text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {difficulty}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

      {showSessionHistory && (
        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Code Session History</h2>
              <p className="text-sm text-slate-400">
                Your last 20 Run/Submit sessions are saved on this browser.
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
              {codingSessions.length}/20 saved
            </span>
          </div>

          {codingSessions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
              No coding sessions saved yet. Run or Submit your code to create history.
            </div>
          ) : (
            <div className="space-y-3">
              {codingSessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-white">
                        {session.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span>{session.language}</span>
                        <span>•</span>
                        <span>{session.topic}</span>
                        <span>•</span>
                        <span>{session.difficulty}</span>
                        <span>•</span>
                        <span>{new Date(session.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${
                        session.status === "Accepted" ||
                        session.status === "Executed Successfully"
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-red-500/15 text-red-400"
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-blue-400 hover:text-blue-300">
                      View code & result
                    </summary>

                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Code
                        </p>
                        <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                          {session.code || "// No code"}
                        </pre>
                      </div>

                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Input
                        </p>
                        <pre className="max-h-32 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                          {session.stdin || "No input"}
                        </pre>

                        <p className="mb-2 mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Output
                        </p>
                        <pre className="max-h-40 overflow-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-300">
                          {session.output || "No output"}
                        </pre>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(session.language);
                        setSelectedTopic(session.topic);
                        setSelectedDifficulty(session.difficulty);
                        setCode(session.code);
                        setStdin(session.stdin);
                        setOutput(session.output);
                        setShowSessionHistory(false);
                      }}
                      className="mt-3 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20"
                    >
                      Restore This Session
                    </button>
                  </details>
                </div>
              ))}
            </div>
          )}
        </section>
      )}


        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
          <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025]">
            <div className="flex border-b border-white/[0.07] xl:hidden">
              <button
                onClick={() =>
                  setActivePanel(
                    "problem"
                  )
                }
                className={`flex-1 px-4 py-3 text-xs font-semibold ${
                  activePanel ===
                  "problem"
                    ? "border-b-2 border-cyan-400 text-cyan-300"
                    : "text-slate-500"
                }`}
              >
                Problem
              </button>

              <button
                onClick={() =>
                  setActivePanel(
                    "editor"
                  )
                }
                className={`flex-1 px-4 py-3 text-xs font-semibold ${
                  activePanel ===
                  "editor"
                    ? "border-b-2 border-cyan-400 text-cyan-300"
                    : "text-slate-500"
                }`}
              >
                Code Editor
              </button>
            </div>

            <div
              className={`${
                activePanel ===
                "problem"
                  ? "block"
                  : "hidden xl:block"
              } p-5 sm:p-6`}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <div className="mb-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300">
                      {selectedTopic}
                    </span>

                    <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                      {selectedDifficulty}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold">
                    {currentProblem.title}
                  </h3>
                </div>

                <div className="hidden rounded-xl bg-white/[0.04] p-2.5 text-cyan-300 sm:block">
                  <Icon
                    name="book"
                    size={19}
                  />
                </div>
              </div>

              <div className="space-y-5 text-sm leading-6 text-slate-300">
                <p>
                  {currentProblem.statement}
                </p>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Input Format
                  </h4>

                  <div className="rounded-xl border border-white/[0.06] bg-[#090d18] p-4 font-mono text-xs text-slate-300">
                    <p className="whitespace-pre-wrap">
                      {currentProblem.inputFormat}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Output Format
                  </h4>

                  <div className="rounded-xl border border-white/[0.06] bg-[#090d18] p-4 font-mono text-xs text-slate-300">
                    <p className="whitespace-pre-wrap">
                      {currentProblem.outputFormat}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Example
                  </h4>

                  <div className="rounded-xl border border-white/[0.06] bg-[#090d18] p-4 font-mono text-xs">
                    <p className="text-slate-500">
                      Input
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-cyan-200">
                      {currentProblem.exampleInput}
                    </p>

                    <p className="mt-3 text-slate-500">
                      Output
                    </p>

                    <p className="mt-1 whitespace-pre-wrap text-emerald-300">
                      {currentProblem.exampleOutput}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
                    Constraints
                  </h4>

                  <ul className="space-y-2 text-xs text-slate-400">
                    {(currentProblem.constraints || []).map(
                      (constraint, index) => (
                        <li key={index}>
                          • {constraint}
                        </li>
                      )
                    )}
                  </ul>
                </div>

                <div className="rounded-xl border border-violet-400/10 bg-violet-500/5 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-violet-300">
                      <Icon
                        name="sparkles"
                        size={17}
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-violet-200">
                        AI Coach
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        Need help? Get Hint will show the complete correct solution.
                      </p>

                      <button
                        onClick={() =>
                          useAiTool(
                            "hint",
                            "AI Hint"
                          )
                        }
                        disabled={
                          isAiLoading
                        }
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/15 bg-violet-400/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:bg-violet-400/15 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Icon
                          name="lightbulb"
                          size={14}
                        />

                        {isAiLoading &&
                        aiTitle ===
                          "AI Hint"
                          ? "Thinking..."
                          : "Get a Hint"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0e19] ${
              activePanel ===
              "editor"
                ? "block"
                : "hidden xl:block"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-cyan-400/10 px-2.5 py-1.5 text-xs font-semibold text-cyan-300">
                  {selectedLanguage}
                </div>

                <span className="text-xs text-slate-600">
                  main
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={
                    resetCode
                  }
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
                >
                  <Icon
                    name="rotate"
                    size={14}
                  />

                  <span className="hidden sm:inline">
                    Reset
                  </span>
                </button>

                <button
                  onClick={
                    runCode
                  }
                  disabled={
                    isRunning
                  }
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <Icon
                    name="play"
                    size={13}
                  />

                  {isRunning
                    ? "Running..."
                    : "Run"}
                </button>

                <button
                  onClick={
                    submitCode
                  }
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-[#06101a] transition hover:bg-cyan-400"
                >
                  <Icon
                    name="send"
                    size={13}
                  />

                  Submit
                </button>

                {fromInterview && (
                  <button
                    type="button"
                    onClick={continueInterview}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-400/25 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-400/15"
                  >
                    🎤 Continue Interview
                  </button>
                )}
              </div>
            </div>

            <div className="border-b border-white/[0.07] bg-[#090d17] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-semibold text-slate-300">Test Input</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Enter the input your program should read from stdin.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setStdin(currentProblem?.exampleInput || "")}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                >
                  Use Example Input
                </button>
              </div>

              <div className="mb-2 flex items-center justify-between rounded-lg border border-cyan-400/10 bg-cyan-400/[0.04] px-3 py-2">
                <span className="text-[11px] text-slate-500">
                  Every successful Run is added to Submit tests.
                </span>
                <span className="text-[11px] font-semibold text-cyan-300">
                  {runTestCases.length} test{runTestCases.length === 1 ? "" : "s"} recorded
                </span>
              </div>

              <textarea
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
                spellCheck={false}
                placeholder={currentProblem?.exampleInput || "Enter test input here..."}
                className="min-h-[82px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#0d1221] px-3 py-2.5 font-mono text-xs leading-5 text-slate-200 outline-none placeholder:text-slate-700 focus:border-cyan-400/30"
                aria-label="Program input"
              />
            </div>

            <div className="relative h-[430px] overflow-hidden bg-[#080c15]">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-11 overflow-hidden border-r border-white/[0.04] bg-[#080b12] pt-4 text-center font-mono text-[11px] leading-6 text-slate-700 select-none">
                <div style={{ transform: `translateY(-${codeScrollTop}px)` }}>
                  {code.split("\n").map((_, index) => (
                    <div key={index} className="h-6">
                      {index + 1}
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                value={code}
                onChange={(event) => setCode(event.target.value)}
                onScroll={(event) => setCodeScrollTop(event.currentTarget.scrollTop)}
                spellCheck={false}
                placeholder={`# Write your complete ${selectedLanguage} solution here...`}
                className="h-full w-full max-w-full resize-none overflow-y-auto overflow-x-auto bg-transparent py-4 pl-14 pr-4 font-mono text-[13px] leading-6 text-slate-200 outline-none placeholder:text-slate-700"
                aria-label="Code editor"
              />
            </div>

            <div className="border-t border-white/[0.07]">
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />

                  <span className="text-xs font-semibold text-slate-300">
                    {isSubmitted
                      ? "Submission"
                      : "Output"}
                  </span>
                </div>
              </div>

              <div className="min-h-[150px] border-t border-white/[0.04] bg-[#070a11] p-4">
                {isSubmitted ? (
                  <div className="flex min-h-[110px] items-center justify-center text-center">
                    <div>
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                        <Icon name="send" size={18} />
                      </div>

                      <p className="mt-3 text-sm font-semibold text-slate-200">
                        Submission checking...
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Your code is being checked against the recorded test cases.
                      </p>
                    </div>
                  </div>
                ) : runResult ? (
                  <div className="space-y-4">
                    <div
                      className={`rounded-xl border p-4 ${
                        runResult.status === "Executed Successfully"
                          ? "border-emerald-400/15 bg-emerald-400/[0.05]"
                          : "border-rose-400/15 bg-rose-400/[0.05]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full ${
                            runResult.status === "Executed Successfully"
                              ? "bg-emerald-400/10 text-emerald-300"
                              : "bg-rose-400/10 text-rose-300"
                          }`}
                        >
                          {runResult.status === "Executed Successfully" ? (
                            <Icon name="check" size={17} />
                          ) : (
                            <Icon name="close" size={17} />
                          )}
                        </div>

                        <div>
                          <p
                            className={`text-sm font-bold ${
                              runResult.status === "Executed Successfully"
                                ? "text-emerald-300"
                                : "text-rose-300"
                            }`}
                          >
                            {runResult.status}
                          </p>

                          <p className="mt-0.5 text-[11px] text-slate-500">
                            Run result
                          </p>
                        </div>
                      </div>
                    </div>

                    {runResult.output && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-600">
                          Output
                        </p>

                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-white/[0.06] bg-[#0b101c] p-3 font-mono text-xs leading-5 text-slate-300">
                          {runResult.output}
                        </pre>
                      </div>
                    )}

                    {runResult.error && (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-400/70">
                          Error
                        </p>

                        <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl border border-rose-400/10 bg-rose-400/[0.04] p-3 font-mono text-xs leading-5 text-rose-300">
                          {runResult.error}
                        </pre>
                      </div>
                    )}

                    {!runResult.output && !runResult.error && (
                      <p className="text-xs text-slate-500">
                        Program finished without output.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[110px] items-center justify-center text-center">
                    <div>
                      <Icon name="play" size={18} />

                      <p className="mt-2 text-xs text-slate-600">
                        Run your code to see the output here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <section className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
              <Icon name="sparkles" size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Ask VRoom AI</h3>
              <p className="text-[11px] text-slate-500">
                Ask anything about this problem, code, or concept.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={askText}
              onChange={(event) => setAskText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  askAI();
                }
              }}
              placeholder="e.g. Why should I use a loop here?"
              className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#0d1221] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/30"
            />

            <button
              onClick={askAI}
              disabled={isAiLoading || !askText.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 text-xs font-bold text-[#06101a] transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" size={14} />
              {isAiLoading && aiTitle === "AI Ask"
                ? "Thinking..."
                : "Ask AI"}
            </button>
          </div>
        </section>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {aiTools.map(
            (tool) => (
              <button
                key={tool.title}
                onClick={() =>
                  useAiTool(
                    tool.action,
                    tool.title
                  )
                }
                disabled={
                  isAiLoading
                }
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 text-left transition hover:-translate-y-0.5 hover:border-cyan-400/15 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <Icon
                    name={
                      tool.icon
                    }
                    size={19}
                  />
                </div>

                <h4 className="text-sm font-semibold">
                  {isAiLoading &&
                  aiTitle ===
                    tool.title
                    ? "Thinking..."
                    : tool.title}
                </h4>

                <p className="mt-1.5 text-xs leading-5 text-slate-500">
                  {tool.text}
                </p>
              </button>
            )
          )}
        </section>

        {submissionResult && (
          <section
            className={`mt-5 overflow-hidden rounded-2xl border p-5 ${
              submissionResult.correct
                ? "border-emerald-400/15 bg-emerald-400/[0.04]"
                : "border-rose-400/15 bg-rose-400/[0.04]"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p
                  className={`text-sm font-bold ${
                    submissionResult.correct
                      ? "text-emerald-300"
                      : "text-rose-300"
                  }`}
                >
                  {submissionResult.correct
                    ? "✓ Correct Solution"
                    : "✕ Solution Needs Changes"}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  {submissionResult.passedCount} /{" "}
                  {submissionResult.totalTests} test cases passed
                </p>
              </div>

              {submissionResult.correct && (
                <button
                  onClick={() => generateProblem(true)}
                  disabled={isGenerating}
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-[#06101a] transition hover:bg-cyan-400 disabled:opacity-50"
                >
                  Next Problem →
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {submissionResult.results.map((result) => (
                <div
                  key={result.testCase}
                  className="rounded-xl border border-white/[0.06] bg-black/10 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold text-slate-300">
                      Test Case {result.testCase}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        result.passed
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }`}
                    >
                      {result.passed ? "Passed" : "Failed"}
                    </span>
                  </div>

                  {!result.passed && (
                    <div className="mt-2 grid min-w-0 gap-3 text-[11px] sm:grid-cols-2">
                      <div>
                        <p className="text-slate-600">Expected</p>
                        <pre className="mt-1 whitespace-pre-wrap text-slate-300">
                          {result.expectedOutput}
                        </pre>
                      </div>
                      <div>
                        <p className="text-slate-600">Your output</p>
                        <pre className="mt-1 whitespace-pre-wrap text-slate-300">
                          {result.actualOutput || "(no output)"}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {aiTitle && (
          <section className="mt-5 overflow-hidden rounded-2xl border border-cyan-400/10 bg-cyan-500/[0.03]">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-cyan-300">
                  <Icon
                    name="sparkles"
                    size={16}
                  />
                </div>

                <h3 className="text-sm font-semibold">
                  {aiTitle}
                </h3>
              </div>

              <button
                onClick={() => {
                  setAiTitle("");
                  setAiResult("");
                }}
                className="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Close AI response"
              >
                <Icon
                  name="close"
                  size={16}
                />
              </button>
            </div>

            <div className="p-5">
              {isAiLoading ? (
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-400/20 border-t-cyan-400" />

                  VRoom AI is thinking...
                </div>
              ) : (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-300">
                  {aiResult}
                </pre>
              )}
            </div>
          </section>
        )}

        {fromInterview && (
          <section className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-400/[0.04] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-cyan-200">
                  Ready to discuss your solution?
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  VRoom AI will reconnect to the interview and continue from this
                  exact coding task using your latest code and execution result.
                </p>
              </div>
              <button
                type="button"
                onClick={continueInterview}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-bold text-[#06111d] shadow-lg shadow-cyan-500/20 transition hover:scale-[1.01]"
              >
                🎤 Save Code & Continue Interview →
              </button>
            </div>
          </section>
        )}

        <section className="mt-5 rounded-2xl border border-white/[0.07] bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-cyan-300">
                <Icon
                  name="book"
                  size={15}
                />

                Learn while you practice
              </div>

              <h3 className="text-base font-semibold">
                Don&apos;t just solve it — understand why it works.
              </h3>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                VRoom AI will explain your approach, suggest improvements, and help you build stronger problem-solving skills.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                {selectedLanguage}
              </span>

              <span>•</span>

              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                {selectedTopic}
              </span>

              <span>•</span>

              <span className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                {selectedDifficulty}
              </span>
            </div>
          </div>
        </section>

        <div className="py-7 text-center text-[11px] text-slate-600">
          VRoom AI · Practice. Improve. Get hired.
        </div>
      </div>
    

      </main>
  );
}