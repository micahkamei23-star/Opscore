import { NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const exercises = fitnessRepository.getExercises();
    return NextResponse.json({ exercises });
  } catch (e) {
    logger.error("GET /api/fitness/exercises failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
