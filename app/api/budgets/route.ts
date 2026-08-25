import { apiError, readJson } from "@/lib/api";
import { createBudget, listBudgets } from "@/lib/db/queries";
import { requireUserId } from "@/lib/auth";
import { createBudgetSchema } from "@/lib/validation";

export async function GET(request: Request) {
  try {
    return Response.json(await listBudgets(await requireUserId(request)));
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createBudgetSchema.parse(await readJson(request));
    return Response.json(await createBudget(await requireUserId(request), input), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
