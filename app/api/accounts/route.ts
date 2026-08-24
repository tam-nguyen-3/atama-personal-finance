import { apiError } from "@/lib/api";
import { listAccounts } from "@/lib/db/queries";

export async function GET() {
  try {
    return Response.json(await listAccounts());
  } catch (error) {
    return apiError(error);
  }
}
