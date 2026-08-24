import { eq } from "drizzle-orm";
import { apiError, ApiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { plaidWebhooks } from "@/lib/db/schema";
import { getErrorMessage } from "@/lib/errors";
import { syncItem } from "@/lib/plaid-sync";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";
import { plaidWebhookSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const bodyHash = await verifyPlaidWebhook(
      request.headers.get("Plaid-Verification"),
      rawBody,
    );
    let payload: unknown;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw new ApiError(400, "BAD_REQUEST", "The webhook body is not valid JSON.");
    }
    const webhook = plaidWebhookSchema.parse(payload);

    const db = getDb();
    const [createdReceipt] = await db
      .insert(plaidWebhooks)
      .values({
        bodySha256: bodyHash,
        itemId: webhook.item_id ?? null,
        webhookType: webhook.webhook_type,
        webhookCode: webhook.webhook_code,
        payload: webhook,
      })
      .onConflictDoNothing({ target: plaidWebhooks.bodySha256 })
      .returning({ id: plaidWebhooks.id });
    let receipt = createdReceipt;
    if (!receipt) {
      const [existingReceipt] = await db
        .select({
          id: plaidWebhooks.id,
          processedAt: plaidWebhooks.processedAt,
          processingError: plaidWebhooks.processingError,
        })
        .from(plaidWebhooks)
        .where(eq(plaidWebhooks.bodySha256, bodyHash))
        .limit(1);
      if (!existingReceipt) {
        throw new Error("The webhook receipt could not be read after a conflict.");
      }
      if (
        existingReceipt.processedAt === null ||
        existingReceipt.processingError === null
      ) {
        return Response.json({ received: true, duplicate: true });
      }
      receipt = { id: existingReceipt.id };
    }

    let processingError: string | null = null;
    if (
      webhook.webhook_type === "TRANSACTIONS" &&
      webhook.webhook_code === "SYNC_UPDATES_AVAILABLE" &&
      webhook.item_id
    ) {
      try {
        await syncItem(webhook.item_id, "webhook");
      } catch (error) {
        processingError = getErrorMessage(error);
      }
    }
    await db
      .update(plaidWebhooks)
      .set({ processedAt: new Date(), processingError })
      .where(eq(plaidWebhooks.id, receipt.id));

    return Response.json({ received: true });
  } catch (error) {
    return apiError(error);
  }
}
