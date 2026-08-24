import { apiError } from "@/lib/api";
import { syncAllItems } from "@/lib/plaid-sync";

export async function POST() {
  try {
    const result = await syncAllItems("manual");
    return Response.json(result, {
      status: result.failures.length > 0 ? 207 : 200,
    });
  } catch (error) {
    return apiError(error);
  }
}
