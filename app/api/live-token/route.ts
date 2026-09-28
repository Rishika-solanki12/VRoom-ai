import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from "next/server";

const LIVE_MODEL = "gemini-3.8-live";

export async function POST() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing");

      return NextResponse.json(
        {
          error: "GEMINI_API_KEY is not configured on the server.",
        },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const expireTime = new Date(
      Date.now() + 30 * 60 * 1000
    ).toISOString();

    const newSessionExpireTime = new Date(
      Date.now() + 60 * 1000
    ).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,

        liveConnectConstraints: {
          model: LIVE_MODEL,

          config: {
            responseModalities: [Modality.AUDIO],
            sessionResumption: {},
          },
        },
      },
    });

    if (!token.name) {
      console.error("Gemini did not return an ephemeral token");

      return NextResponse.json(
        {
          error: "Failed to create Gemini Live token.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token: token.name,
      model: LIVE_MODEL,
    });
  } catch (error) {
    console.error("Gemini Live token error:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown Gemini Live token error";

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}