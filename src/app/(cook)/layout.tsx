import { requireHousehold } from "@/server/auth/access";

/** Immersive layout for the cooking mode: no navigation chrome. */
export default async function CookLayout({ children }: LayoutProps<"/">) {
  await requireHousehold();
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
