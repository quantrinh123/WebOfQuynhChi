export type ActionResult = { ok: boolean; message: string } | null;

export function success(message: string): ActionResult {
  return { ok: true, message };
}

export function failure(message: string): ActionResult {
  return { ok: false, message };
}

export function errorMessage(error: unknown, fallback = "Có lỗi xảy ra, vui lòng thử lại.") {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string" && error.message) return error.message;
  return fallback;
}
