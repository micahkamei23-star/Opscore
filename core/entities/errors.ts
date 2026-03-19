// Centralized error types for the entire system
export type ErrorSeverity = "info" | "warn" | "error" | "fatal";
export type ErrorDomain =
  | "fitness"
  | "tasks"
  | "habits"
  | "skills"
  | "sessions"
  | "dashboard"
  | "database"
  | "validation"
  | "auth"
  | "unknown";

export class OpsError extends Error {
  public readonly code: string;
  public readonly domain: ErrorDomain;
  public readonly severity: ErrorSeverity;
  public readonly context: Record<string, unknown>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string,
    domain: ErrorDomain = "unknown",
    severity: ErrorSeverity = "error",
    context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "OpsError";
    this.code = code;
    this.domain = domain;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      domain: this.domain,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

export class ValidationError extends OpsError {
  public readonly fields: Record<string, string[]>;
  constructor(message: string, fields: Record<string, string[]> = {}) {
    super(message, "VALIDATION_ERROR", "validation", "warn", { fields });
    this.name = "ValidationError";
    this.fields = fields;
  }
}

export class NotFoundError extends OpsError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, "NOT_FOUND", "unknown", "warn", { resource, id });
    this.name = "NotFoundError";
  }
}

export class DatabaseError extends OpsError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, "DATABASE_ERROR", "database", "error", context);
    this.name = "DatabaseError";
  }
}

// ─── Result type for explicit error handling ──────────────────────────────────

export type Result<T, E extends Error = OpsError> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<E extends Error = OpsError>(error: E): Result<never, E> {
  return { ok: false, error };
}

export function isResult<T>(v: unknown): v is Result<T> {
  return typeof v === "object" && v !== null && "ok" in v;
}
