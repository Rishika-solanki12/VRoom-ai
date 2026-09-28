import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JUDGE0_URL = "https://ce.judge0.com";

const LANGUAGE_IDS: Record<string, number> = {
  C: 50,
  "C++": 54,
  Java: 62,
  JavaScript: 63,
  Python: 71,
};

type TestCase = {
  input: string;
  expectedOutput?: string;
  output?: string;
};

type RunRequest = {
  language?: string;
  code?: string;
  stdin?: string;
  mode?: "run" | "submit";
  testCases?: TestCase[];
};

function normalizeOutput(value: string | null | undefined) {
  return (value ?? "")
    .replace(/\r\n/g, "\n")
    .trim();
}

function getLanguageId(language: string) {
  return LANGUAGE_IDS[language] ?? null;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

async function submitToJudge0(
  languageId: number,
  sourceCode: string,
  stdin = ""
) {
  let response: Response;

  try {
    response = await fetchWithTimeout(
      `${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          language_id: languageId,
          source_code: sourceCode,
          stdin,
        }),
      },
      30000
    );
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Judge0 submission request timed out after 30 seconds."
        : "Could not connect to Judge0 while submitting code.";

    throw new Error(message);
  }

  const text = await response.text();

  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        data?.message ||
        `Judge0 submission failed with status ${response.status}.`
    );
  }

  if (!data?.token) {
    throw new Error("Judge0 did not return a submission token.");
  }

  return data.token as string;
}

async function getJudge0Result(token: string) {
  try {
    const response = await fetchWithTimeout(
      `${JUDGE0_URL}/submissions/${token}?base64_encoded=false`,
      { method: "GET" },
      30000
    );

    const text = await response.text();

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.error ||
          data?.message ||
          `Judge0 result request failed with status ${response.status}.`
      );
    }

    return data;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error("Could not read the Judge0 result.");
  }
}

async function waitForResult(token: string, maxWaitMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const result = await getJudge0Result(token);
    const statusId = result?.status?.id;

    // Judge0: 1 = In Queue, 2 = Processing
    if (statusId !== 1 && statusId !== 2) {
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "Judge0 took too long to finish this execution. Please try Run again."
  );
}

function formatResult(result: any) {
  return {
    stdout: result?.stdout ?? "",
    stderr: result?.stderr ?? "",
    compile_output: result?.compile_output ?? "",
    message: result?.message ?? "",
    status: result?.status?.description ?? "Unknown",
    statusId: result?.status?.id ?? 0,
    time: result?.time ?? null,
    memory: result?.memory ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RunRequest;

    const language = body.language?.trim();
    const code = body.code ?? "";
    const mode = body.mode ?? "run";
    const stdin = body.stdin ?? "";

    if (!language) {
      return NextResponse.json(
        { error: "Programming language is required." },
        { status: 400 }
      );
    }

    if (!code.trim()) {
      return NextResponse.json(
        { error: "Please write some code before running it." },
        { status: 400 }
      );
    }

    const languageId = getLanguageId(language);

    if (!languageId) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}.` },
        { status: 400 }
      );
    }

    if (mode !== "submit") {
      const token = await submitToJudge0(languageId, code, stdin);
      const result = await waitForResult(token, 60000);

      return NextResponse.json({
        success: true,
        mode: "run",
        ...formatResult(result),
      });
    }

    const testCases = Array.isArray(body.testCases)
      ? body.testCases
      : [];

    if (testCases.length === 0) {
      return NextResponse.json(
        { error: "No test cases are available for this problem." },
        { status: 400 }
      );
    }

    const results = [];

    for (let index = 0; index < testCases.length; index++) {
      const testCase = testCases[index];

      // The VRoom AI problem schema uses `expectedOutput`.
      // `output` is also accepted for backward compatibility.
      const expectedOutput = normalizeOutput(
        testCase?.expectedOutput ?? testCase?.output ?? ""
      );

      const token = await submitToJudge0(
        languageId,
        code,
        testCase?.input ?? ""
      );

      const result = await waitForResult(token, 60000);
      const formatted = formatResult(result);

      const actualOutput = normalizeOutput(formatted.stdout);

      const statusId = formatted.statusId;
      const accepted = statusId === 3;
      const outputMatches = actualOutput === expectedOutput;

      results.push({
        testCase: index + 1,
        input: testCase?.input ?? "",
        expectedOutput,
        actualOutput,
        passed: accepted && outputMatches,
        status: formatted.status,
        stderr: formatted.stderr,
        compile_output: formatted.compile_output,
        message: formatted.message,
        time: formatted.time,
        memory: formatted.memory,
      });
    }

    const passedCount = results.filter((item) => item.passed).length;
    const correct = passedCount === results.length;

    return NextResponse.json({
      success: true,
      mode: "submit",
      correct,
      passedCount,
      totalTests: results.length,
      results,
    });
  } catch (error) {
    console.error("coding-run error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong while running the code.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
