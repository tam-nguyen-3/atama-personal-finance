import { z } from "zod";

const budgetName = z.string().trim().min(1).max(80);
const budgetLimit = z.number().finite().positive().max(999_999_999.99);

export const createBudgetSchema = z.object({
  name: budgetName,
  limit: budgetLimit,
});

export const updateBudgetSchema = z
  .object({
    name: budgetName.optional(),
    limit: budgetLimit.optional(),
  })
  .refine((value) => value.name !== undefined || value.limit !== undefined, {
    message: "At least one budget field is required.",
  });

export const budgetTransactionSchema = z.object({
  transactionId: z.string().min(1).max(256),
});

export const exchangeTokenSchema = z.object({
  public_token: z.string().min(1),
  institution_name: z.string().trim().min(1).max(200),
  institution_id: z.string().trim().min(1).max(100).nullable().optional(),
});

export const plaidWebhookSchema = z
  .object({
    webhook_type: z.string().min(1),
    webhook_code: z.string().min(1),
    item_id: z.string().min(1).optional(),
  })
  .passthrough();
