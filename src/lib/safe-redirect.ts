/** Only allows same-site relative paths, to avoid open redirects after sign-in. */
export function safeRedirect(target: string | null | undefined, fallback: string): string {
  if (!target || !target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback;
  return target;
}
