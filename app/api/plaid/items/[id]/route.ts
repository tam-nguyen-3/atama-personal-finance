import { apiError } from "@/lib/api";
import { disconnectPlaidItem } from "@/lib/plaid-items-service";
import { requireUserId } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await disconnectPlaidItem(await requireUserId(_request), id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
