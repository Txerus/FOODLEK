import { BrandMark } from "@/components/foodlek/brand";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,var(--basil-soft),transparent_60%)]">
      <header className="mx-auto flex w-full max-w-5xl items-center px-5 py-5">
        <BrandMark />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-16">
        <div className="w-full max-w-sm animate-rise">{children}</div>
      </main>
    </div>
  );
}
