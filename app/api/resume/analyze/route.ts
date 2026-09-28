import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFParser from "pdf2json";
import mammoth from "mammoth";

export const runtime = "nodejs";

// ============================================================
// CLEAN GEMINI JSON RESPONSE
// ============================================================

function cleanJsonResponse(text: string) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");

  if (firstBrace === -1) {
    throw new Error("Gemini response did not contain a JSON object.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = firstBrace; i < cleaned.length; i++) {
    const char = cleaned[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth++;
    } else if (char === "}") {
      depth--;

      if (depth === 0) {
        return cleaned.slice(firstBrace, i + 1);
      }
    }
  }

  throw new Error("Gemini response contained incomplete JSON.");
}

// ============================================================
// EXTRACT PDF TEXT USING PDF2JSON
// ============================================================

async function extractPdfText(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", (error: any) => {
      reject(
        new Error(
          error?.parserError?.message ||
            error?.message ||
            "PDF parsing failed."
        )
      );
    });

    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        const pages = pdfData?.Pages || [];

        const text = pages
          .map((page: any) => {
            const texts = page?.Texts || [];

            return texts
              .map((item: any) => {
                try {
                  return decodeURIComponent(
                    item?.R?.map((r: any) => r?.T || "").join("") || ""
                  );
                } catch {
                  return (
                    item?.R
                      ?.map((r: any) => r?.T || "")
                      .join("") || ""
                  );
                }
              })
              .join(" ");
          })
          .join("\n");

        resolve(text.trim());
      } catch (error) {
        reject(
          error instanceof Error
            ? error
            : new Error("Unable to extract PDF text.")
        );
      }
    });

    pdfParser.parseBuffer(buffer);
  });
}

// ============================================================
// EXTRACT RESUME TEXT
// ============================================================

async function extractResumeText(
  file: File
): Promise<{ text: string; fileType: string }> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = file.name.toLowerCase();

  // ==========================================================
  // PDF
  // ==========================================================

  if (fileName.endsWith(".pdf")) {
    const text = await extractPdfText(buffer);

    return {
      text,
      fileType: "PDF",
    };
  }

  // ==========================================================
  // DOCX
  // ==========================================================

  if (fileName.endsWith(".docx")) {
    const result = await mammoth.extractRawText({
      buffer,
    });

    return {
      text: result.value.trim(),
      fileType: "DOCX",
    };
  }

  // ==========================================================
  // OLD DOC
  // ==========================================================

  if (fileName.endsWith(".doc")) {
    throw new Error(
      "Old .doc format is not supported yet. Please upload the resume as PDF or DOCX."
    );
  }

  // ==========================================================
  // UNSUPPORTED FILE
  // ==========================================================

  throw new Error(
    "Unsupported file format. Please upload a PDF or DOCX resume."
  );
}

// ============================================================
// POST
// ============================================================

export async function POST(request: Request) {
  try {
    // ========================================================
    // GEMINI API KEY
    // ========================================================

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "GEMINI_API_KEY missing hai. .env.local file check karo.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // READ FORM DATA
    // ========================================================

    const formData = await request.formData();

    const resumeFile = formData.get("resume");

    const jobRole = String(
      formData.get("jobRole") || ""
    ).trim();

    const jobDescription = String(
      formData.get("jobDescription") || ""
    ).trim();

    // ========================================================
    // RESUME VALIDATION
    // ========================================================

    if (!(resumeFile instanceof File)) {
      return NextResponse.json(
        {
          error: "Resume file nahi mila.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // JOB ROLE VALIDATION
    // ========================================================

    if (!jobRole) {
      return NextResponse.json(
        {
          error: "Job role required hai.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FILE SIZE VALIDATION
    // Maximum 5 MB
    // ========================================================

    const maxFileSize = 5 * 1024 * 1024;

    if (resumeFile.size === 0) {
      return NextResponse.json(
        {
          error: "Uploaded resume file empty hai.",
        },
        { status: 400 }
      );
    }

    if (resumeFile.size > maxFileSize) {
      return NextResponse.json(
        {
          error: "Resume file maximum 5 MB ka hona chahiye.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // FILE TYPE VALIDATION
    // ========================================================

    const fileName = resumeFile.name.toLowerCase();

    const isPDF = fileName.endsWith(".pdf");
    const isDOCX = fileName.endsWith(".docx");
    const isDOC = fileName.endsWith(".doc");

    if (!isPDF && !isDOCX && !isDOC) {
      return NextResponse.json(
        {
          error:
            "Please upload a PDF, DOC or DOCX resume.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // EXTRACT RESUME TEXT
    // ========================================================

    let extracted;

    try {
      extracted = await extractResumeText(resumeFile);
    } catch (error: unknown) {
      console.error(
        "Resume text extraction error:",
        error
      );

      const extractionError =
        error instanceof Error
          ? error.message
          : "Resume text extraction failed.";

      return NextResponse.json(
        {
          error: extractionError,
        },
        { status: 400 }
      );
    }

    const resumeText = extracted.text;
    const fileType = extracted.fileType;

    // ========================================================
    // CHECK EXTRACTED TEXT
    // ========================================================

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json(
        {
          error:
            "Resume se enough text extract nahi ho paya. Please check that the resume contains readable text.",
        },
        { status: 400 }
      );
    }

    // ========================================================
    // GEMINI MODEL
    // ========================================================

    const genAI = new GoogleGenerativeAI(apiKey);

    // Primary model can still be controlled from .env.local.
    // Temporary 503/429 errors are retried, then a fallback model is tried.
    const primaryModelName =
      process.env.GEMINI_MODEL ||
      "gemini-3.1-flash-lite";

    const fallbackModelName =
      process.env.GEMINI_FALLBACK_MODEL ||
      "gemini-3.5-flash-lite";

    const modelNames = Array.from(
      new Set([primaryModelName, fallbackModelName])
    );

    const createModel = (modelName: string) =>
      genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      });

    const wait = (milliseconds: number) =>
      new Promise((resolve) => setTimeout(resolve, milliseconds));

    const isRetryableGeminiError = (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase();

      return (
        message.includes("503") ||
        message.includes("service unavailable") ||
        message.includes("high demand") ||
        message.includes("429") ||
        message.includes("too many requests") ||
        message.includes("resource exhausted")
      );
    };

    // ========================================================
    // RESUME ANALYSIS PROMPT
    // ========================================================

    const prompt = `
You are VRoom AI, a professional resume analyzer and career assistant.

Your task is to analyze the candidate's ACTUAL resume text.

============================================================
IMPORTANT ACCURACY RULES
============================================================

- Use ONLY information present in the resume.
- Never invent skills.
- Never invent experience.
- Never invent projects.
- Never invent education.
- Never invent certifications.
- Never invent achievements.
- Never assume a technology is known by the candidate.
- If information is missing, explicitly mention that it is missing.
- Do not use information from previous conversations.
- Do not create fictional candidate information.
- Job role should be used only to determine relevance.
- Job description is optional.
- If no job description is provided, analyze the resume against the target job role.
- Return ONLY valid JSON.
- Do not return Markdown.
- Do not return text outside the JSON.

============================================================
TARGET JOB ROLE
============================================================

${jobRole}

============================================================
JOB DESCRIPTION
============================================================

${
  jobDescription ||
  "No job description provided."
}

============================================================
ACTUAL RESUME TEXT
============================================================

${resumeText}

============================================================
RETURN EXACTLY THIS JSON STRUCTURE
============================================================

{
  "candidateSummary": "",

  "skills": {
    "technical": [],
    "soft": [],
    "other": []
  },

  "experience": [],

  "education": [],

  "projects": [],

  "certifications": [],

  "achievements": [],

  "strengths": [],

  "weaknesses": [],

  "missingInformation": [],

  "resumeImprovements": [],

  "atsAnalysis": {
    "atsFriendly": true,
    "atsScore": 0,
    "keywordStrength": "",
    "formattingIssues": [],
    "missingKeywords": [],
    "sectionCompleteness": []
  },

  "jobMatching": {
    "matchSummary": "",
    "matchingSkills": [],
    "missingSkills": [],
    "relevantExperience": [],
    "jobRequirements": [],
    "resumeGaps": [],
    "suggestions": []
  }
}

============================================================
ATS ANALYSIS
============================================================

Give an ATS score from 0 to 100.

Consider:

- Resume structure
- Section organization
- Readability
- Relevant keywords
- Job-role relevance
- Section completeness
- Formatting problems
- Missing important information

Do not give a high score simply because the resume is long.

Only use evidence from the actual resume.

============================================================
JOB MATCHING
============================================================

Compare the resume against:

1. Target job role
2. Job description, if provided

Identify:

- Matching skills
- Missing skills
- Relevant experience
- Job requirements
- Resume gaps
- Improvement suggestions

IMPORTANT:

Do not say the candidate has a skill unless that skill is actually present in the resume.

============================================================
MISSING INFORMATION
============================================================

Identify important information that appears to be missing from the resume.

Examples may include:

- Missing contact information
- Missing LinkedIn/GitHub
- Missing measurable achievements
- Missing project details
- Missing dates
- Missing education details
- Missing technical skills

Only mention something as missing when the resume actually lacks it.

============================================================
RESUME IMPROVEMENTS
============================================================

Give practical improvements based on the actual resume.

Do not rewrite the entire resume.

Focus on:

- Better bullet points
- Stronger wording
- Missing details
- Keyword improvements
- Better structure
- Better job relevance
- ATS improvements

============================================================
FINAL RULE
============================================================

Return ONLY the JSON object.

No Markdown.
No explanation outside JSON.
`;


    // ========================================================
    // SEND TO GEMINI
    // ========================================================

    let responseText = "";
    let lastGeminiError: unknown = null;
    let usedModelName = "";

    for (const modelName of modelNames) {
      const model = createModel(modelName);

      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const result = await model.generateContent(prompt);

          responseText = result.response.text();
          usedModelName = modelName;
          lastGeminiError = null;
          break;
        } catch (error: unknown) {
          lastGeminiError = error;

          console.error(
            `Resume Gemini request failed. Model: ${modelName}, attempt: ${attempt}`,
            error
          );

          if (!isRetryableGeminiError(error)) {
            throw error;
          }

          if (attempt < 2) {
            await wait(1200);
          }
        }
      }

      if (responseText) {
        break;
      }
    }

    if (!responseText) {
      const lastMessage =
        lastGeminiError instanceof Error
          ? lastGeminiError.message
          : "Gemini is temporarily unavailable.";

      console.error(
        "All resume analysis Gemini attempts failed:",
        lastMessage
      );

      return NextResponse.json(
        {
          error:
            "Resume analysis service is temporarily busy. Please try again in a moment.",
          retryable: true,
        },
        { status: 503 }
      );
    }

    console.log(
      `Resume analysis completed with Gemini model: ${usedModelName}`
    );

    const cleanedText = cleanJsonResponse(responseText);

    // ========================================================
    // PARSE GEMINI JSON
    // ========================================================

    let analysis: unknown;

    try {
      analysis = JSON.parse(cleanedText);
    } catch (jsonError) {
      console.error(
        "Resume Gemini JSON parse error:",
        jsonError
      );

      console.error(
        "Resume Gemini raw response:",
        responseText
      );

      console.error(
        "Resume Gemini cleaned JSON:",
        (() => {
          try {
            return cleanJsonResponse(responseText);
          } catch {
            return "Could not extract a JSON object.";
          }
        })()
      );

      return NextResponse.json(
        {
          error:
            "Gemini ne valid resume analysis JSON nahi diya. Dobara try karo.",
        },
        { status: 500 }
      );
    }

    // ========================================================
    // FINAL RESPONSE
    // ========================================================

    return NextResponse.json({
      success: true,

      fileName: resumeFile.name,

      fileType,

      extractedText: resumeText,

      jobRole,

      jobDescription,

      analysis,
    });
  } catch (error: unknown) {
    // ========================================================
    // GENERAL ERROR
    // ========================================================

    console.error(
      "Resume analysis API error:",
      error
    );

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown resume analysis error";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}