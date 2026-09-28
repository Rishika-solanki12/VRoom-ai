import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

type InterviewMessage = {
  role: string;
  content: string;
};

function createConversation(history: InterviewMessage[]) {
  return history
    .map((message) => {
      const speaker =
        message.role === "user" || message.role === "candidate"
          ? "Candidate"
          : "Interviewer";

      return `${speaker}: ${message.content}`;
    })
    .join("\n");
}

function cleanJsonResponse(text: string) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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

    const mode = body.mode || "start";
    const role = body.role || "Software Developer";
    const interviewType = body.interviewType || "General";
    const difficulty = body.difficulty || "Medium";
    const experience = body.experience || "Fresher";

    const history: InterviewMessage[] = Array.isArray(body.history)
      ? body.history
      : [];

    const primaryModelName =
      process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    const fallbackModelName =
      process.env.GEMINI_FALLBACK_MODEL || "gemini-3.5-flash-lite";

    const genAI = new GoogleGenerativeAI(apiKey);

    const generationConfig = {
      temperature: 0.7,
      responseMimeType: "application/json" as const,
    };

    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const isRetryableGeminiError = (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message.toLowerCase()
          : String(error).toLowerCase();

      return (
        message.includes("503") ||
        message.includes("429") ||
        message.includes("service unavailable") ||
        message.includes("high demand") ||
        message.includes("resource exhausted") ||
        message.includes("resource_exhausted") ||
        message.includes("too many requests") ||
        message.includes("temporarily unavailable")
      );
    };

    const generateWithRetryAndFallback = async (promptText: string) => {
      const modelNames = Array.from(
        new Set([primaryModelName, fallbackModelName].filter(Boolean))
      );

      let lastError: unknown;

      for (const currentModelName of modelNames) {
        const currentModel = genAI.getGenerativeModel({
          model: currentModelName,
          generationConfig,
        });

        for (let attempt = 0; attempt < 2; attempt += 1) {
          try {
            return await currentModel.generateContent(promptText);
          } catch (error: unknown) {
            lastError = error;

            if (!isRetryableGeminiError(error)) {
              throw error;
            }

            console.warn(
              `Gemini temporary error on ${currentModelName} (attempt ${attempt + 1}/2).`
            );

            if (attempt === 0) {
              await sleep(1200);
            }
          }
        }
      }

      throw lastError instanceof Error
        ? lastError
        : new Error("Gemini service is temporarily unavailable.");
    };

    let prompt = "";

    // ============================================================
    // START MODE
    // ============================================================

    if (mode === "start") {
      const conversation = createConversation(history);

      prompt = `
You are VRoom AI, a realistic professional AI interview assistant.

Your goal is to conduct a natural mock interview that feels like a
real conversation with a human interviewer.

Interview details:

Role: ${role}
Interview type: ${interviewType}
Difficulty: ${difficulty}
Experience level: ${experience}

Previous conversation:
${conversation}

LANGUAGE RULES:

- Understand English.
- Understand Hindi.
- Understand Hinglish.
- The candidate may freely mix Hindi and English.
- Detect the natural language/style of the candidate.
- Reply naturally in the same language or style.
- Do not force English if the candidate is speaking Hindi or Hinglish.
- Do not translate unnecessarily.
- Keep the conversation natural.

START RULES:

- Start the interview naturally.
- Ask exactly ONE interview question.
- Do not ask multiple questions.
- Do not give feedback.
- Do not repeat a previous question.
- Keep the question appropriate for the role and experience.
- Sound like a real human interviewer, not a questionnaire.

Return ONLY valid JSON.

Use exactly this structure:

{
  "interviewerMessage": "Short natural opening message",
  "nextQuestion": "Exactly one natural interview question",
  "questionType": "opening",
  "intent": "start_interview",
  "language": "en",
  "shouldEnd": false
}

Allowed language values:
"en"
"hi"
"hinglish"

Do not return Markdown.
Do not return text outside JSON.
`;
    }

    // ============================================================
    // ANSWER MODE
    // ============================================================

    else if (mode === "answer") {
      const question = body.question || "";
      const answer = body.answer || "";
      const conversation = createConversation(history);

      prompt = `
You are VRoom AI, a realistic professional AI interview assistant.

You are having a natural voice-style conversation with a candidate.

Interview details:

Role: ${role}
Interview type: ${interviewType}
Difficulty: ${difficulty}
Experience level: ${experience}

Previous conversation:
${conversation}

Current interview question:
${question}

Latest candidate response:
${answer}

============================================================
IMPORTANT
============================================================

The candidate may not always be answering the question.

The candidate may say things such as:

"Mujhe ye question samajh nahi aaya."

"Can you explain this?"

"Question dobara bolo."

"Easy question pucho."

"Make it harder."

"Topic change karo."

"Mujhe kuch poochna hai."

"Give me feedback."

"Ruko."

"Stop the interview."

You must understand the candidate's intention.

Do NOT treat every message as an interview answer.

============================================================
LANGUAGE
============================================================

Understand:

- English
- Hindi
- Hinglish
- Mixed Hindi-English

Reply naturally in the candidate's language/style.

If the candidate speaks English, respond in English.

If the candidate speaks Hindi, respond in Hindi.

If the candidate speaks Hinglish, natural Hinglish is acceptable.

If the candidate explicitly asks for Hindi, use Hindi.

If the candidate explicitly asks for English, use English.

Do not unnecessarily translate everything.

============================================================
INTENT
============================================================

Determine the primary intent.

Allowed intent values:

"answer"
"ask_question"
"explain"
"repeat"
"easier_question"
"harder_question"
"change_topic"
"feedback"
"pause"
"stop"
"continue_interview"

============================================================
IF THE CANDIDATE IS ANSWERING
============================================================

Analyze the latest answer.

Check whether the answer is:

- correct
- mostly_correct
- incomplete
- incorrect
- unclear

Check English grammar, sentence structure, word choice and naturalness.

Do NOT invent grammar mistakes.

If there is no grammar mistake:

correctedSentence = ""

grammarExplanation = ""

If grammar mistakes exist:

- Give the corrected sentence.
- Explain the actual mistake briefly.
- Do not unnecessarily rewrite the answer.

If the answer is weak, incomplete, unclear or unprofessional:

- Explain what is missing.
- Give a better professional answer in improvedAnswer.

If the answer is already good:

improvedAnswer = ""

If the technical answer is incorrect:

- Explain the incorrect part.
- Give the technically correct explanation in improvedAnswer.

Do not give generic feedback.

============================================================
NEXT QUESTION
============================================================

When the candidate has answered the interview question:

Ask exactly ONE next interview question.

The next question should:

- be relevant to the conversation
- be appropriate for the role
- match the candidate's experience
- match the difficulty
- not repeat previous questions
- sound natural

Do not ask two questions inside nextQuestion.

Do not endlessly continue on the exact same topic.

After exploring a topic sufficiently, move to another relevant topic.

============================================================
IF THE CANDIDATE IS NOT ANSWERING
============================================================

Do NOT evaluate their message as an interview answer.

Instead, respond naturally.

If they ask for explanation:
Explain the current question.

If they ask to repeat:
Repeat the current question.

If they ask for an easier question:
Give exactly one easier question.

If they ask for a harder question:
Give exactly one harder question.

If they ask to change the topic:
Move to another relevant topic.

If they ask for feedback:
Give useful feedback based on the available conversation.

If they ask to pause:
Acknowledge the pause.

If they ask to stop:
Acknowledge that the interview can end.

For non-answer conversation:

correctedSentence = ""

grammarExplanation = ""

improvedAnswer = ""

============================================================
OUTPUT
============================================================

Return ONLY valid JSON.

Use exactly this structure:

{
  "status": "correct",
  "interviewerMessage": "Short natural response",
  "correctedSentence": "",
  "grammarExplanation": "",
  "improvedAnswer": "",
  "answerExplanation": "Specific explanation of the candidate response",
  "nextQuestion": "Exactly one question or empty string when not applicable",
  "questionType": "follow_up",
  "intent": "answer",
  "language": "en",
  "shouldEnd": false
}

Allowed status values:

"correct"
"mostly_correct"
"incomplete"
"incorrect"
"unclear"

Allowed questionType values:

"follow_up"
"technical"
"behavioral"
"situational"
"new_topic"
"explanation"
"conversation"
"none"

Allowed intent values:

"answer"
"ask_question"
"explain"
"repeat"
"easier_question"
"harder_question"
"change_topic"
"feedback"
"pause"
"stop"
"continue_interview"

Allowed language values:

"en"
"hi"
"hinglish"

RULES:

- No grammar mistake means correctedSentence = "".
- No grammar mistake means grammarExplanation = "".
- No improved answer needed means improvedAnswer = "".
- Never repeat previous questions.
- Never ask two questions in nextQuestion.
- Do not evaluate a question from the candidate as an interview answer.
- Keep interviewerMessage short and natural.
- Do not return Markdown.
- Do not return text outside JSON.
`;
    }

    // ============================================================
    // FINAL MODE
    // ============================================================

    else if (mode === "final") {
      const conversation = createConversation(history);

      prompt = `
You are an expert professional interview evaluator for VRoom AI.

Evaluate the complete mock interview.

Role:
${role}

Interview type:
${interviewType}

Difficulty:
${difficulty}

Experience:
${experience}

Complete conversation:

${conversation}

Evaluate ONLY what is actually visible in the conversation.

Do not invent strengths or weaknesses.

Do not ask another question.

The candidate may have spoken English, Hindi or Hinglish.
Understand all of these.

Evaluate:

- Overall performance
- Communication
- English grammar
- Answer clarity
- Answer relevance
- Confidence based only on available evidence
- Technical knowledge, if tested
- Problem-solving, if tested
- Specific strengths
- Specific weaknesses
- Repeated mistakes
- Practical improvements
- Final recommendation

============================================================
OVERALL SCORE — STRICT 1 TO 10
============================================================

Give the candidate an overall interview performance score named
"overallScore".

Rules for overallScore:

- It MUST be a whole number from 1 through 10.
- Any integer from 1 to 10 is valid.
- Do NOT use a fixed default such as 5 or 6.
- Choose the score from the candidate's actual complete interview performance.
- A very weak interview may receive 1–3.
- A weak/below-average interview may receive 4.
- An average interview may receive 5–6.
- A good interview may receive 7–8.
- An excellent interview may receive 9–10.
- Do not give a high score merely because the candidate was confident or spoke at length.
- Do not give a low score merely because the candidate made one mistake.
- Consider the overall evidence across the interview: correctness, relevance,
  communication, technical knowledge when tested, problem-solving when tested,
  clarity, consistency and ability to respond to follow-ups.
- If an area was not tested, do not penalize the candidate for that missing evidence.
- The score must be consistent with the written overall evaluation.

If the interview is short, incomplete, or contains too little evidence for a
reliable evaluation, explain that limitation in the overall text rather than
inventing evidence. You may still provide a 1–10 score based only on the
evidence that actually exists.

If technical knowledge was not tested,
clearly say that it was not tested.

Return ONLY valid JSON.

Use exactly this structure. The number 7 below is ONLY an example; replace it with the actual evidence-based score from 1 to 10.

{
  "feedback": {
    "overallScore": 7,
    "overall": "Detailed evaluation",
    "communication": "Specific communication evaluation",
    "englishGrammar": "Specific English grammar evaluation",
    "answerClarity": "Specific answer clarity evaluation",
    "answerRelevance": "Specific answer relevance evaluation",
    "confidence": "Confidence evaluation based only on evidence",
    "technicalKnowledge": "Technical knowledge evaluation or say it was not tested",
    "problemSolving": "Problem-solving evaluation or say it was not tested",
    "strengths": [
      "Specific strength from the interview"
    ],
    "weaknesses": [
      "Specific weakness from the interview"
    ],
    "grammarCorrections": [
      {
        "original": "Actual original sentence",
        "corrected": "Corrected sentence",
        "explanation": "Short grammar explanation"
      }
    ],
    "improvedAnswers": [
      {
        "question": "Actual interview question",
        "candidateAnswer": "Original candidate answer",
        "betterAnswer": "Improved professional answer"
      }
    ],
    "improvements": [
      "Specific improvement based on the interview"
    ],
    "actionPlan": [
      "Practical action step"
    ],
    "recommendation": "Final recommendation"
  }
}

If there are no grammar corrections:

"grammarCorrections": []

If no improved answers are necessary:

"improvedAnswers": []

Do not return Markdown.
Do not return text outside JSON.
`;
    }

    // ============================================================
    // INVALID MODE
    // ============================================================

    else {
      return NextResponse.json(
        {
          error: "Invalid interview mode.",
        },
        { status: 400 }
      );
    }

    // ============================================================
    // GEMINI REQUEST
    // ============================================================

    const result = await generateWithRetryAndFallback(prompt);

    const responseText = result.response.text();
    const cleanedText = cleanJsonResponse(responseText);

    let data: unknown;

    try {
      data = JSON.parse(cleanedText);
    } catch (jsonError) {
      console.error("Gemini JSON parse error:", jsonError);
      console.error("Gemini raw response:", responseText);

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
    console.error("Gemini API error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown Gemini API error";

    const normalizedError = errorMessage.toLowerCase();
    const isTemporaryGeminiFailure =
      normalizedError.includes("503") ||
      normalizedError.includes("429") ||
      normalizedError.includes("service unavailable") ||
      normalizedError.includes("high demand") ||
      normalizedError.includes("resource exhausted") ||
      normalizedError.includes("resource_exhausted") ||
      normalizedError.includes("too many requests") ||
      normalizedError.includes("temporarily unavailable");

    if (isTemporaryGeminiFailure) {
      return NextResponse.json(
        {
          error:
            "Interview feedback service is temporarily busy. Please try Generate Feedback again in a moment.",
          retryable: true,
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}