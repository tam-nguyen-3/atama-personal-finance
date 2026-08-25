import { apiError } from "@/lib/api";
import { listAccounts } from "@/lib/db/queries";
import { requireUserId } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    return Response.json(await listAccounts(await requireUserId(request)));
  } catch (error) {
    return apiError(error);
  }
}
