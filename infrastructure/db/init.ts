import { runMigrations } from "./schema";
import { seedDatabase } from "./seed";
import { logger } from "@/lib/logger";

let initialized = false;

export function initDatabase(): void {
  if (initialized) return;
  initialized = true;
  runMigrations();
  seedDatabase();
  logger.info("Database initialized and seeded");
}
