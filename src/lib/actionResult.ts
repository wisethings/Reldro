/**
 * Server actions and expected failures.
 *
 * In a production build, Next.js replaces the message of any error *thrown* out of a server action with a generic,
 * meaningless one (it only reads properly in development). An expected problem such as "3 corrective actions are not
 * verified yet" must reach the person as written, so actions return it with `fail()` and the client turns it back into
 * an error with `unwrap()` (the `useAct` hook does this automatically).
 *
 * `fail()` is typed `never` so an action keeps its normal return type.
 */
export type ActionFail = { __actionError: string };

export const fail = (message: string): never => ({ __actionError: message }) as never;

export const isFail = (value: unknown): value is ActionFail =>
  typeof value === "object" && value !== null && typeof (value as ActionFail).__actionError === "string";

/** Throws the returned failure as an Error (for client code that already uses try/catch); otherwise returns the value. */
export function unwrap<T>(value: T): T {
  if (isFail(value)) throw new Error(value.__actionError);
  return value;
}
