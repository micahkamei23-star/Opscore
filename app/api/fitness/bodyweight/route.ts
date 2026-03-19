import { NextRequest, NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { logger } from "@/lib/logger";

const BWSchema = z.object({
  userId: z.string().min(1).default("user_seed_001"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive().max(1000),
  bodyFatPercent: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
    const entries = fitnessRepository.getBodyweightEntries(userId);
    return NextResponse.json({ entries });
  } catch (e) {
    logger.error("GET /api/fitness/bodyweight failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BWSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = parsed.data;
    const entry = fitnessRepository.createBodyweightEntry({
      id: uuidv4(),
      userId: data.userId,
      date: data.date,
      weight: data.weight,
      bodyFatPercent: data.bodyFatPercent ?? null,
      notes: data.notes ?? null,
      createdAt: Date.now(),
    });
    logger.info("Bodyweight entry logged", { userId: data.userId, date: data.date, weight: data.weight });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (e) {
    logger.error("POST /api/fitness/bodyweight failed", { error: String(e) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
