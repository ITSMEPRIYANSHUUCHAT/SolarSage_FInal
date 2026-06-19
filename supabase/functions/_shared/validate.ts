// Input validation for edge functions using Zod (server-side schema validation).
// Zod is imported from esm.sh in the Deno runtime — the same library used on the
// client, so schemas stay consistent. See docs security/input-validation notes.
import { z } from "https://esm.sh/zod@3.23.8";
import { HttpError } from "./http.ts";

export { z };

/** Parse `data` against `schema`, throwing a 400 with the first issue on failure. */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue?.path?.join(".") || "body";
    throw new HttpError(400, `Invalid request: ${path} ${issue?.message ?? "is invalid"}`);
  }
  return result.data;
}

// --- process-pdf request body ---
export const ProcessPdfBody = z.object({
  // Bound the size to prevent oversized payloads / cost amplification.
  pdfText: z.string().min(1, "must not be empty").max(50_000, "is too large"),
  fileName: z.string().max(255).optional(),
});
export type ProcessPdfBody = z.infer<typeof ProcessPdfBody>;
