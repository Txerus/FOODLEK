import { AppNav } from "@/components/app/app-nav";
import { requireHousehold } from "@/server/auth/access";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireHousehold();
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow-lift">
        Aller au contenu
      </a>
      <AppNav userName={user.name} />
      <main id="contenu" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 sm:px-6 md:pt-10 md:pb-16">
        {children}
      </main>
    </div>
  );
}
