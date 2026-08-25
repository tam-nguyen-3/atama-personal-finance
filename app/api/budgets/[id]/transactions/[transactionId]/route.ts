import { apiError } from "@/lib/api";
import { unassignTransaction } from "@/lib/db/queries";
import { requireUserId } from "@/lib/auth";

type Context = {
  params: Promise<{ id: string; transactionId: string }>;
};

export async function DELETE(request: Request, context: Context) {
  try {
    const { id, transactionId } = await context.params;
    return Response.json(await unassignTransaction(await requireUserId(request), id, transactionId));
  } catch (error) {
    return apiError(error);
  }
}
