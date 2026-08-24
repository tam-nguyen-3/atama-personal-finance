export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function getPlaidErrorDetails(error: unknown): unknown {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return getErrorMessage(error);
  }

  const response = error.response;
  if (!response || typeof response !== "object" || !("data" in response)) {
    return getErrorMessage(error);
  }

  return response.data;
}
