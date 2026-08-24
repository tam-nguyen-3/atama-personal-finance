import { apiError, readJson } from "@/lib/api";
import { createBudget, listBudgets } from "@/lib/db/queries";
import { createBudgetSchema } from "@/lib/validation";

export async function GET() {
  try {
    return Response.json(await listBudgets());
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = createBudgetSchema.parse(await readJson(request));
    return Response.json(await createBudget(input), { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
