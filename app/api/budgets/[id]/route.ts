import { apiError, readJson } from "@/lib/api";
import {
  deleteBudget,
  getBudget,
  updateBudget,
} from "@/lib/db/queries";
import { updateBudgetSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return Response.json(await getBudget(id));
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const { id } = await context.params;
    const updates = updateBudgetSchema.parse(await readJson(request));
    return Response.json(await updateBudget(id, updates));
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    await deleteBudget(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    return apiError(error);
  }
}
