import { NextRequest, NextResponse } from "next/server";
import { buildLog, deleteSession } from "@/lib/session";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { sessionId, state } = await req.json() as { sessionId: string; state?: string };
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const log = buildLog(sessionId, state ?? "");
    if (!log) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Mask any Aadhaar/mobile numbers that may appear in transcripts
    const safeLog = JSON.parse(
      JSON.stringify(log).replace(/\b\d{12}\b/g, "XXXXXXXXXXXX").replace(/\b[6-9]\d{9}\b/g, "XXXXXXXXXX")
    );

    // Log to stdout — Vercel captures this in its Log Viewer (Dashboard → Logs).
    // Replace with a database write for production use.
    console.log("[session-log]", JSON.stringify(safeLog));

    deleteSession(sessionId);
    return NextResponse.json({ ok: true, session_id: sessionId });
  } catch (err) {
    console.error("Session log error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Logging failed" },
      { status: 500 }
    );
  }
}
