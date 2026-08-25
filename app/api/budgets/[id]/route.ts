import { apiError, readJson } from "@/lib/api";
import {
  deleteBudget,
  getBudget,
  updateBudget,
} from "@/lib/db/queries";
import { updateBudgetSchema } from "@/lib/validation";
import { requireUserId } from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json(await getBudget(await requireUserId(request), id));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const updates = updateBudgetSchema.parse(await readJson(request));
    return Response.json(await updateBudget(await requireUserId(request), id, updates));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await deleteBudget(await requireUserId(request), id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
