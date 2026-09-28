import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type ResumeData = {
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    portfolio?: string;
  };
  summary?: string;
  skills?: string[];
  experience?: Array<{
    jobTitle?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    description?: string;
  }>;
  education?: Array<{
    degree?: string;
    institution?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects?: Array<{
    name?: string;
    link?: string;
    description?: string;
  }>;
  certifications?: string[];
  achievements?: string[];
};

function cleanJsonResponse(text: string) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function safeString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();

    const mode = body.mode || "build";

    const targetRole = safeString(body.targetRole).trim();

    const jobDescription = safeString(body.jobDescription).trim();

    const instruction = safeString(body.instruction).trim();

    const resumeData: ResumeData =
      body.resumeData && typeof body.resumeData === "object"
        ? body.resumeData
        : {};

    if (!targetRole) {
      return NextResponse.json(
        {
          error: "Target job role required hai.",
        },
        { status: 400 }
      );
    }

    if (!["build", "improve", "tailor"].includes(mode)) {
      return NextResponse.json(
        {
          error: "Invalid resume builder mode.",
        },
        { status: 400 }
      );
    }

    const modelName =
      process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    });

    const resumeJson = JSON.stringify(resumeData, null, 2);

    let taskInstructions = "";

    // ============================================================
    // BUILD
    // ============================================================

    if (mode === "build") {
      taskInstructions = `
Create a professional ATS-friendly resume for the target job role.

TARGET JOB ROLE:
${targetRole}

JOB DESCRIPTION:
${jobDescription || "Not provided."}

USER / EXISTING RESUME DATA:
${resumeJson}

USER INSTRUCTION:
${instruction || "Create the strongest truthful resume possible from the provided information."}

BUILD RULES:

1. Use the user's actual information as the source of truth.

2. Improve grammar, spelling, sentence structure and professional wording.

3. Do NOT copy obvious spelling mistakes into the final resume.

4. Do NOT invent:
   - companies
   - job titles
   - degrees
   - dates
   - certifications
   - projects
   - achievements
   - technologies
   - skills
   - responsibilities
   - metrics
   - awards

5. Never assume that a skill mentioned in the job description is a skill
   possessed by the candidate.

6. If a job description contains a skill that is not present in the user's
   information, do NOT add it to the candidate's resume.

7. Missing skills should instead be returned in "skillSuggestions".

8. You may rewrite an existing experience description professionally,
   but the underlying facts must remain consistent.

9. Do not change company names, degree names or dates unless the user
   explicitly provided corrected information.

10. Do not create fake numerical achievements.

11. Keep the resume concise and ATS-friendly.

12. Prioritize information relevant to the target role.

13. If there is not enough information for a section, leave that section
   empty instead of inventing content.

14. The professional summary must only contain facts supported by the
   candidate information.

15. Skills must contain only skills actually supported by the candidate data.

Return ONLY valid JSON.
`;
    }

    // ============================================================
    // IMPROVE
    // ============================================================

    if (mode === "improve") {
      taskInstructions = `
Improve the candidate's existing resume content.

TARGET JOB ROLE:
${targetRole}

CURRENT RESUME DATA:
${resumeJson}

USER REQUEST:
${instruction || "Improve the resume professionally."}

RULES:

1. Preserve all factual information.

2. Improve grammar, spelling, clarity and professional wording.

3. Do NOT invent experience.

4. Do NOT invent skills.

5. Do NOT invent technologies.

6. Do NOT invent metrics.

7. Do NOT invent responsibilities.

8. Do NOT invent dates or companies.

9. Do not change factual information simply to make the resume sound better.

10. If the existing information is insufficient, keep it concise rather
    than fabricating details.

11. If the user asks to improve one section, do not unnecessarily rewrite
    unrelated sections.

12. Keep wording ATS-friendly and professional.

13. Do not copy obvious spelling or grammar mistakes into the final result.

Return ONLY valid JSON.
`;
    }

    // ============================================================
    // TAILOR
    // ============================================================

    if (mode === "tailor") {
      taskInstructions = `
Tailor the candidate's existing resume toward the target job.

TARGET JOB ROLE:
${targetRole}

JOB DESCRIPTION:
${jobDescription || "Not provided."}

CURRENT RESUME:
${resumeJson}

USER REQUEST:
${instruction || "Tailor my resume for this job."}

RULES:

1. Use the existing candidate information as the factual source of truth.

2. Identify relevant information already present in the resume.

3. Rewrite existing content professionally when useful.

4. Prioritize relevant experience and projects.

5. Organize existing skills based on relevance.

6. Identify important job-description keywords.

7. Do NOT claim that the candidate has a skill merely because it appears
   in the job description.

8. Do NOT add technologies the candidate has not provided.

9. Do NOT invent experience, qualifications, projects, certifications,
   achievements or metrics.

10. Missing job requirements must appear in "skillSuggestions" or
    "missingRequirements", not inside the candidate's actual resume.

11. Keep the final resume truthful and ATS-friendly.

Return ONLY valid JSON.
`;
    }

    const prompt = `
You are VRoom AI Resume Builder.

You are helping a candidate create or improve a professional resume.

Your highest priority is factual accuracy.

A resume is a career document. Never fabricate candidate information.

${taskInstructions}

============================================================
OUTPUT FORMAT
============================================================

Return exactly this JSON structure:

{
  "resume": {
    "personal": {
      "fullName": "",
      "email": "",
      "phone": "",
      "location": "",
      "linkedin": "",
      "portfolio": ""
    },

    "summary": "",

    "skills": [],

    "experience": [
      {
        "jobTitle": "",
        "company": "",
        "location": "",
        "startDate": "",
        "endDate": "",
        "current": false,
        "description": ""
      }
    ],

    "education": [
      {
        "degree": "",
        "institution": "",
        "location": "",
        "startDate": "",
        "endDate": ""
      }
    ],

    "projects": [
      {
        "name": "",
        "link": "",
        "description": ""
      }
    ],

    "certifications": [],

    "achievements": []
  },

  "skillSuggestions": [],

  "missingRequirements": [],

  "improvementsMade": [],

  "warnings": []
}

IMPORTANT:

- "resume" contains ONLY information that can be supported by the
  candidate's supplied information.
- "skillSuggestions" contains skills that may be useful for the target
  role but were NOT confirmed as candidate skills.
- "missingRequirements" contains job requirements that could not be
  matched to the candidate's provided information.
- "improvementsMade" briefly describes wording/structure improvements.
- "warnings" must mention important limitations or missing information.
- Never put invented facts into "resume".
- Return valid JSON only.
`;

    const result = await model.generateContent(prompt);

    const responseText = result.response.text();

    const cleanedText = cleanJsonResponse(responseText);

    let data: unknown;

    try {
      data = JSON.parse(cleanedText);
    } catch (jsonError) {
      console.error(
        "Resume Builder Gemini JSON parse error:",
        jsonError
      );

      console.error(
        "Resume Builder Gemini raw response:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Gemini ne valid JSON response nahi diya. Dobara try karo.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error("Resume Builder AI error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown Resume Builder AI error";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}