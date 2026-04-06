import { z, ZodSchema } from "https://deno.land/x/zod@v3.23.8/mod.ts";

/**
 * Validates a request body against a Zod schema.
 * Returns the typed, parsed data or throws an error with status 400.
 */
export async function validateBody<T>(
  req: Request,
  schema: ZodSchema<T>,
  corsHeaders: Record<string, string>
): Promise<T> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    throw new ValidationError("Invalid JSON body", corsHeaders);
  }

  const result = schema.safeParse(rawBody);
  if (!result.success) {
    const errors = result.error.flatten();
    throw new ValidationError(
      JSON.stringify({
        error: "Validation failed",
        fieldErrors: errors.fieldErrors,
        formErrors: errors.formErrors,
      }),
      corsHeaders,
      true
    );
  }

  return result.data;
}

export class ValidationError extends Error {
  public response: Response;

  constructor(
    message: string,
    corsHeaders: Record<string, string>,
    isJson = false
  ) {
    super(message);
    this.response = new Response(
      isJson ? message : JSON.stringify({ error: message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
}

// Re-export zod for convenience
export { z };
