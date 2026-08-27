import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  disconnectPlaidItem: vi.fn(),
  requireUserId: vi.fn(),
}));

vi.mock("@/lib/plaid-items-service", () => ({
  disconnectPlaidItem: mocks.disconnectPlaidItem,
}));
vi.mock("@/lib/auth", () => ({ requireUserId: mocks.requireUserId }));

import { DELETE } from "@/app/api/plaid/items/[id]/route";

describe("DELETE /api/plaid/items/[id]", () => {
  beforeEach(() => {
    mocks.disconnectPlaidItem.mockReset();
    mocks.requireUserId.mockReset();
  });

  it("uses the authenticated user and returns no content", async () => {
    mocks.requireUserId.mockResolvedValue("user-1");
    mocks.disconnectPlaidItem.mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/plaid/items/item-1"), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(204);
    expect(mocks.disconnectPlaidItem).toHaveBeenCalledWith("user-1", "item-1");
  });

  it("returns 401 before invoking the service when the session is missing", async () => {
    mocks.requireUserId.mockRejectedValue(
      new ApiError(401, "UNAUTHORIZED", "Authentication required."),
    );

    const response = await DELETE(new Request("http://localhost/api/plaid/items/item-1"), {
      params: Promise.resolve({ id: "item-1" }),
    });

    expect(response.status).toBe(401);
    expect(mocks.disconnectPlaidItem).not.toHaveBeenCalled();
  });
});
