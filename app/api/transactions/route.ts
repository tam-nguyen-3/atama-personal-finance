import { apiError, ApiError } from "@/lib/api";
import { listTransactions } from "@/lib/db/queries";
import { requireUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = searchParams.get("limit") ?? "100";
    const limit = Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
      throw new ApiError(
        400,
        "BAD_REQUEST",
        "limit must be an integer between 1 and 500.",
      );
    }

    return Response.json(
      await listTransactions(await requireUserId(request), {
        limit,
        cursor: searchParams.get("cursor") ?? undefined,
        query: searchParams.get("query") ?? undefined,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
