"use client";

import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { selectStoreAction, syncObservedPricesAction, type ObservedSyncSummary } from "@/server/actions/stores";

const RADII = [10, 20, 30, 50];

export function ObservedPricesForm({ retailers, defaultCity }: { retailers: { slug: string; name: string }[]; defaultCity: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [retailerSlug, setRetailerSlug] = useState("carrefour");
  const [city, setCity] = useState(defaultCity);
  const [radius, setRadius] = useState("30");
  const [result, setResult] = useState<ObservedSyncSummary | null>(null);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setResult(null);
        start(async () => {
          const res = await syncObservedPricesAction({ retailerSlug, city, radiusKm: Number(radius) });
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          setResult(res.data);
          toast.success(res.message ?? "Prix mis à jour.");
          router.refresh();
        });
      }}
    >
      <FieldGroup className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
        <Field>
          <FieldLabel htmlFor="retailer">Enseigne</FieldLabel>
          <Select value={retailerSlug} onValueChange={setRetailerSlug}>
            <SelectTrigger id="retailer" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {retailers.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor="city">Ville</FieldLabel>
          <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Annecy" autoComplete="address-level2" required minLength={2} />
        </Field>
        <Field>
          <FieldLabel htmlFor="radius">Rayon</FieldLabel>
          <Select value={radius} onValueChange={setRadius}>
            <SelectTrigger id="radius" className="w-full sm:w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {RADII.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} km
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
      <FieldDescription>
        Sans prix relevé près de chez vous, FOODLEK prend le prix le plus récent vu dans un autre magasin de l'enseigne, et l'indique.
      </FieldDescription>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner data-icon="inline-start" /> : null}
          {pending ? "Récupération des prix…" : "Récupérer les prix réels"}
        </Button>
        {pending ? <p className="text-sm text-muted-foreground" aria-live="polite">Environ 1 à 2 minutes : chaque ingrédient est recherché.</p> : null}
      </div>
      {result ? (
        <div className="flex flex-col gap-2 rounded-lg bg-basil-soft p-4 text-sm" aria-live="polite">
          <p className="font-medium">{result.storeName}</p>
          <p>
            {result.pricedCount} ingrédients avec un prix réel ({result.priceCount} produits), {result.nearbyStoreCount} magasin(s) de l'enseigne dans le rayon. Ce magasin est maintenant celui de votre foyer.
          </p>
          {result.missing.length > 0 ? (
            <p className="text-muted-foreground">Sans prix relevé pour l'instant : {result.missing.join(", ")}.</p>
          ) : null}
          <Button asChild size="sm" className="self-start">
            <Link href="/planning">Recalculer la semaine avec ces prix</Link>
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export function UseStoreButton({ storeId, current }: { storeId: string; current: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (current) {
    return (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
        <CheckIcon aria-hidden className="size-4" />
        Magasin actuel
      </span>
    );
  }
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await selectStoreAction({ storeId });
          if (!res.ok) toast.error(res.error);
          else {
            toast.success(res.message ?? "Magasin choisi.");
            router.refresh();
          }
        })
      }
    >
      {pending ? <Spinner data-icon="inline-start" /> : null}
      Utiliser ce magasin
    </Button>
  );
}
