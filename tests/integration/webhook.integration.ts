import { beforeEach, describe, expect, it, vi } from "vitest";

const webhookMocks = vi.hoisted(() => ({
  syncItem: vi.fn(),
  verify: vi.fn(),
}));

vi.mock("@/lib/plaid-sync", () => ({ syncItem: webhookMocks.syncItem }));
vi.mock("@/lib/plaid-webhook", () => ({
  verifyPlaidWebhook: webhookMocks.verify,
}));

import { POST } from "@/app/api/plaid/webhook/route";
import { getDb } from "@/lib/db";
import { plaidWebhooks } from "@/lib/db/schema";

const payload = JSON.stringify({
  webhook_type: "TRANSACTIONS",
  webhook_code: "SYNC_UPDATES_AVAILABLE",
  item_id: "item-1",
});

function webhookRequest() {
  return new Request("http://localhost/api/plaid/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Plaid-Verification": "signed-token",
    },
    body: payload,
  });
}

beforeEach(() => {
  webhookMocks.syncItem.mockReset();
  webhookMocks.verify.mockReset();
  webhookMocks.verify.mockResolvedValue("body-sha256");
  webhookMocks.syncItem.mockResolvedValue({
    itemId: "item-1",
    added: 0,
    modified: 0,
    removed: 0,
  });
});

describe("Plaid webhook persistence", () => {
  it("stores and processes a verified webhook only once", async () => {
    const first = await POST(webhookRequest());
    const duplicate = await POST(webhookRequest());

    expect(first.status).toBe(200);
    expect(await duplicate.json()).toEqual({ received: true, duplicate: true });
    expect(webhookMocks.syncItem).toHaveBeenCalledTimes(1);
    expect(await getDb().select().from(plaidWebhooks)).toHaveLength(1);
  });

  it("retries a duplicate webhook whose earlier processing failed", async () => {
    webhookMocks.syncItem
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        itemId: "item-1",
        added: 1,
        modified: 0,
        removed: 0,
      });

    await POST(webhookRequest());
    await POST(webhookRequest());

    const [receipt] = await getDb().select().from(plaidWebhooks);
    expect(webhookMocks.syncItem).toHaveBeenCalledTimes(2);
    expect(receipt?.processedAt).toBeInstanceOf(Date);
    expect(receipt?.processingError).toBeNull();
  });
});
