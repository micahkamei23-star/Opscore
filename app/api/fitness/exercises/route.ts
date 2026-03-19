import { NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";

export async function GET() {
  const exercises = fitnessRepository.getExercises();
  return NextResponse.json({ exercises });
}
