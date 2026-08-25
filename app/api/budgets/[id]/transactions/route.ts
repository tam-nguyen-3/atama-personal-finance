import { apiError, readJson } from "@/lib/api";
import { assignTransaction } from "@/lib/db/queries";
import { budgetTransactionSchema } from "@/lib/validation";
import { requireUserId } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const { transactionId } = budgetTransactionSchema.parse(
      await readJson(request),
    );
    return Response.json(await assignTransaction(await requireUserId(request), id, transactionId), {
      status: 201,
    });
  } catch (error) {
    return apiError(error);
  }
}
