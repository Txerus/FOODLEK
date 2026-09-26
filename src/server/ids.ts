/** Prefixed random identifiers ("mem_…", "plan_…") — readable in logs, unguessable. */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}
