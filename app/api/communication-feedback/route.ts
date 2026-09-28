import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Message = {
  role: "user" | "assistant" | "interviewer";
  text?: string;
  content?: string;
};

type RequestBody = {
  mode?: string;
  practiceGoal?: string;
  level?: string;
  difficulty?: string;
  topic?: string;
  messages?: Message[];
  conversation?: Message[];
};

const PRIMARY_MODEL =
  process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";

const FALLBACK_MODEL =
  process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-3.5-flash-lite";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isTemporaryGeminiError(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    message.includes("503") ||
    message.includes("429") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("resource exhausted") ||
    message.includes("service unavailable") ||
    message.includes("temporarily unavailable") ||
    message.includes("quota")
  );
}

function stripCodeFence(value: string) {
  return value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function clampScore(value: unknown) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  return Math.max(1, Math.min(10, Math.round(numeric * 10) / 10));
}

function stringArray(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

function normalizeCorrections(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const original =
        typeof record.original === "string" ? record.original.trim() : "";
      const corrected =
        typeof record.corrected === "string" ? record.corrected.trim() : "";
      const explanation =
        typeof record.explanation === "string"
          ? record.explanation.trim()
          : "";

      if (!original || !corrected) return null;

      return {
        original,
        corrected,
        explanation:
          explanation || "This version is clearer and more natural.",
      };
    })
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeBetterResponses(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const original =
        typeof record.original === "string" ? record.original.trim() : "";
      const improved =
        typeof record.improved === "string" ? record.improved.trim() : "";

      if (!original || !improved) return null;
      return { original, improved };
    })
    .filter(Boolean)
    .slice(0, 5);
}

async function generateWithRetry(
  genAI: GoogleGenerativeAI,
  modelName: string,
  prompt: string
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.25,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text?.trim()) {
        throw new Error("Gemini returned an empty feedback response.");
      }

      return text;
    } catch (error) {
      lastError = error;

      if (!isTemporaryGeminiError(error) || attempt === 1) {
        throw error;
      }

      await sleep(1200);
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing in .env.local." },
        { status: 500 }
      );
    }

    let body: RequestBody;

    try {
      body = (await request.json()) as RequestBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const mode =
      body.mode?.trim() ||
      body.practiceGoal?.trim() ||
      "General Communication";

    const level =
      body.level?.trim() ||
      body.difficulty?.trim() ||
      "Intermediate";

    const topic = body.topic?.trim() || "No specific topic";

    const rawMessages = Array.isArray(body.messages)
      ? body.messages
      : Array.isArray(body.conversation)
      ? body.conversation
      : [];

    const messages = rawMessages
      .map((message) => {
        const role =
          message.role === "user"
            ? "USER"
            : message.role === "assistant" || message.role === "interviewer"
            ? "VROOM AI"
            : "UNKNOWN";

        const text =
          typeof message.text === "string"
            ? message.text.trim()
            : typeof message.content === "string"
            ? message.content.trim()
            : "";

        return { role, text };
      })
      .filter((message) => message.text);

    const userMessages = messages.filter(
      (message) => message.role === "USER"
    );

    if (userMessages.length === 0) {
      return NextResponse.json(
        {
          error:
            "There is not enough user conversation to generate communication feedback.",
        },
        { status: 400 }
      );
    }

    const transcript = messages
      .slice(-80)
      .map((message, index) => `${index + 1}. ${message.role}: ${message.text}`)
      .join("\n");

    const prompt = `
You are the final communication evaluator for VRoom AI.

Evaluate ONLY the communication evidence present in the transcript below.

PRACTICE SETTINGS
Mode: ${mode}
Level: ${level}
Topic/context: ${topic}

IMPORTANT EVALUATION RULES
- Judge communication, not the user's personality or intelligence.
- Do not invent pronunciation problems because you only have transcript text.
- Do not invent grammar mistakes, vocabulary, facts, answers, or sentences that are not present.
- If the transcript does not provide enough evidence for a dimension, explicitly say evidence was limited.
- Keep feedback appropriate to the selected level.
- Consider clarity, fluency as inferable from conversational flow, grammar, vocabulary, relevance, structure, and professional communication where applicable.
- "confidence" must be framed as communication delivery evidence from the responses, not a psychological judgment.
- Grammar corrections must quote the user's actual sentence or a faithful excerpt from it.
- Do not correct informal language merely because it is informal if it is appropriate for the selected mode.
- Do not penalize Hindi/Hinglish harshly. If the goal is English practice, explain how the user can express the same idea naturally in English.
- Strengths and improvements must be specific and supported by the transcript.
- overallScore must be a model-decided number from 1 to 10 based on this session. Do not impose a minimum score.
- A short session may have limited evidence; reflect that in the feedback.
- Never claim you heard pronunciation, tone, pace, volume, accent, or vocal confidence from this text transcript.

MODE EMPHASIS
- Daily Conversation: natural clarity, conversational flow, useful everyday English.
- Professional English: clear, concise and professional workplace communication.
- Interview Communication: answer structure, relevance, clarity and professional wording.
- Grammar & Sentence Practice: grammar accuracy and natural sentence construction.
- Vocabulary & Fluency: natural vocabulary, paraphrasing and smooth expression.
- Speaking Confidence: completeness and willingness to develop responses; do not make psychological claims.
- Custom Topic: communication quality relevant to the supplied topic.

Return ONLY valid JSON with exactly this general structure:
{
  "overall": "2-4 sentence evidence-based summary",
  "overallScore": 1,
  "fluency": "specific feedback",
  "clarity": "specific feedback",
  "grammar": "specific feedback",
  "vocabulary": "specific feedback",
  "confidence": "specific communication-delivery feedback",
  "strengths": ["specific strength"],
  "improvements": ["specific improvement"],
  "grammarCorrections": [
    {
      "original": "actual user wording",
      "corrected": "natural corrected version",
      "explanation": "brief explanation"
    }
  ],
  "betterResponses": [
    {
      "original": "actual user response or faithful excerpt",
      "improved": "a clearer or more natural version preserving the user's meaning"
    }
  ],
  "actionPlan": ["practical next practice step"]
}

If there are no genuine grammar corrections, return an empty grammarCorrections array.
If there is no useful response rewrite, return an empty betterResponses array.

TRANSCRIPT
${transcript}
`.trim();

    const genAI = new GoogleGenerativeAI(apiKey);

    const models = Array.from(
      new Set([PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean))
    );

    let generatedText = "";
    let lastError: unknown;

    for (const modelName of models) {
      try {
        generatedText = await generateWithRetry(genAI, modelName, prompt);
        break;
      } catch (error) {
        lastError = error;

        if (!isTemporaryGeminiError(error)) {
          throw error;
        }
      }
    }

    if (!generatedText) {
      if (isTemporaryGeminiError(lastError)) {
        return NextResponse.json(
          {
            error:
              "AI feedback service is temporarily busy. Please try ending the session again in a moment.",
          },
          { status: 503 }
        );
      }

      throw lastError || new Error("Could not generate feedback.");
    }

    let parsed: Record<string, unknown>;

    try {
      parsed = JSON.parse(stripCodeFence(generatedText)) as Record<
        string,
        unknown
      >;
    } catch (error) {
      console.error("Communication feedback JSON parse error:", {
        error,
        generatedText,
      });

      return NextResponse.json(
        {
          error:
            "AI returned feedback in an unexpected format. Please try again.",
        },
        { status: 502 }
      );
    }

    const feedback = {
      overall:
        typeof parsed.overall === "string"
          ? parsed.overall.trim()
          : "Communication feedback generated from the completed practice session.",
      overallScore: clampScore(parsed.overallScore),
      fluency:
        typeof parsed.fluency === "string" ? parsed.fluency.trim() : "",
      clarity:
        typeof parsed.clarity === "string" ? parsed.clarity.trim() : "",
      grammar:
        typeof parsed.grammar === "string" ? parsed.grammar.trim() : "",
      vocabulary:
        typeof parsed.vocabulary === "string"
          ? parsed.vocabulary.trim()
          : "",
      confidence:
        typeof parsed.confidence === "string"
          ? parsed.confidence.trim()
          : "",
      strengths: stringArray(parsed.strengths),
      improvements: stringArray(parsed.improvements),
      grammarCorrections: normalizeCorrections(parsed.grammarCorrections),
      betterResponses: normalizeBetterResponses(parsed.betterResponses),
      actionPlan: stringArray(parsed.actionPlan, 5),
    };

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Communication feedback API error:", error);

    if (isTemporaryGeminiError(error)) {
      return NextResponse.json(
        {
          error:
            "AI feedback service is temporarily unavailable. Please try again shortly.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not generate communication feedback.",
      },
      { status: 500 }
    );
  }
}
