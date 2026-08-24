import { apiError } from "@/lib/api";
import { unassignTransaction } from "@/lib/db/queries";

type Context = {
  params: Promise<{ id: string; transactionId: string }>;
};

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id, transactionId } = await context.params;
    return Response.json(await unassignTransaction(id, transactionId));
  } catch (error) {
    return apiError(error);
  }
}
