import { ZodError } from "zod";
import { getErrorMessage } from "./errors";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "CONFLICT"
  | "NOT_CONFIGURED"
  | "PLAID_ERROR"
  | "UNAUTHORIZED"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: {
          code: "BAD_REQUEST",
          message: error.issues[0]?.message ?? "The request is invalid.",
        },
      },
      { status: 400 },
    );
  }

  if (error && typeof error === "object" && "response" in error) {
    return Response.json(
      {
        error: {
          code: "PLAID_ERROR",
          message: "Plaid could not complete the request.",
        },
      },
      { status: 502 },
    );
  }

  console.error("Unhandled API error:", getErrorMessage(error));
  return Response.json(
    {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected server error occurred.",
      },
    },
    { status: 500 },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "A valid JSON body is required.");
  }
}
