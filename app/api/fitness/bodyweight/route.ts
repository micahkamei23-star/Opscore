import { NextRequest, NextResponse } from "next/server";
import { fitnessRepository } from "@/infrastructure/repositories/fitnessRepository";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const BWSchema = z.object({
  userId: z.string().default("user_seed_001"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weight: z.number().positive(),
  bodyFatPercent: z.number().min(0).max(100).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId") ?? "user_seed_001";
  const entries = fitnessRepository.getBodyweightEntries(userId);
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = BWSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }
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
  return NextResponse.json({ entry }, { status: 201 });
}
