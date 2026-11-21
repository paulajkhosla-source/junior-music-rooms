/** What a client-called server action reports back. Expected failures come back as data, because Next.js hides thrown messages in production (React error #441). */
export type ActionResult = { error?: string };
export const GENERIC_ERROR = 'Something went wrong. Please refresh the page and check your bookings.';
/** Messages we wrote ourselves (plain Error in the action, or RAISE EXCEPTION in the database) are safe to show; anything else is not. */
export function userMessage(reason: unknown): string {
  if (!(reason instanceof Error)) return GENERIC_ERROR;
  const code = (reason as { code?: unknown }).code;
  if (code === 'P0001' || (reason.constructor === Error && code === undefined)) return reason.message;
  return GENERIC_ERROR;
}
