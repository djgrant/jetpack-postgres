export function late<T>(fn: () => T): T {
  return fn();
}
