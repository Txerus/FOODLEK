"use client";

import {
  BeefIcon,
  ChevronDownIcon,
  CopyIcon,
  CroissantIcon,
  CupSodaIcon,
  ExternalLinkIcon,
  FishIcon,
  MilkIcon,
  PackageIcon,
  PencilIcon,
  RefreshCcwIcon,
  RotateCcwIcon,
  SaladIcon,
  SnowflakeIcon,
  WheatIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { QualityBadge } from "@/components/foodlek/quality-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { DataQuality, Freshness } from "@/domain/common/data-quality";
import { FRESHNESS_LABELS } from "@/domain/common/data-quality";
import { formatEuros } from "@/lib/format";
import { RETAILER_LINKS, type RetailerLink, retailerLink, searchQueryFor } from "@/lib/retailer-links";
import { cn } from "@/lib/utils";
import { toggleShoppingItemAction, uncheckAllShoppingAction } from "@/server/actions/plan";
import { setManualPriceAction } from "@/server/actions/prices";

const RETAILER_KEY = "foodlek.retailer";
const retailerListeners = new Set<() => void>();

function subscribeRetailer(listener: () => void) {
  retailerListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    retailerListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function readRetailer(): string {
  try {
    const saved = window.localStorage.getItem(RETAILER_KEY);
    return saved && retailerLink(saved) ? saved : "none";
  } catch {
    // Storage can be unavailable (private mode).
    return "none";
  }
}

export interface PurchaseView {
  count: number;
  packLabel: string;
  productName: string;
  brand: string | null;
  priceCents: number;
  unitPriceLabel: string | null;
  quality: DataQuality;
  freshness: Freshness;
  fetchedAtLabel: string | null;
  provider: string;
  storeName: string | null;
  sourceUrl: string | null;
  isOrganic: boolean;
  promotion: string | null;
  substitution: string | null;
  imageUrl: string | null;
  manual: boolean;
  /** The chosen store has no price: this one comes from elsewhere (see RetailOffer.fallback). */
  fallback: "other_store" | "demo" | null;
}

export interface IngredientPhotoView {
  url: string;
  credit: string | null;
  sourceUrl: string | null;
}

export interface ShoppingLineView {
  ingredientId: string;
  name: string;
  aisle: string;
  /** Generic photo of the ingredient, used when the product has none. */
  photo: IngredientPhotoView | null;
  neededLabel: string;
  fromPantryLabel: string | null;
  leftoverLabel: string | null;
  leftoverIsWaste: boolean;
  purchases: PurchaseView[];
  costCents: number | null;
  quality: DataQuality;
  priceMissing: boolean;
  usedIn: string[];
  purchaseUnit: "g" | "ml" | "piece";
  /** Quantity still to buy, in the purchase unit (to prefill a price typed in by hand). */
  toBuy: number;
}

export interface AisleView {
  aisle: string;
  label: string;
  lines: ShoppingLineView[];
}

const PROVIDER_LABELS: Record<string, string> = {
  demo: "Catalogue de démonstration (fictif)",
  "open-prices": "Open Prices (prix payés en magasin, ODbL)",
  manual: "Prix saisi par vous",
};

const UNIT_LABEL = { g: "g", ml: "ml", piece: "pièce(s)" } as const;

/** "J'ai payé 2,35 € pour 200 g": fills a missing price for this household only. */
function ManualPrice({ line, existing }: { line: ShoppingLineView; existing: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState(
    String(line.purchaseUnit === "piece" ? Math.max(1, line.toBuy) : line.toBuy > 0 ? line.toBuy : ""),
  );
  const idBase = `manual-${line.ingredientId}`;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs">
          <PencilIcon aria-hidden className="size-3" />
          {existing ? "Corriger le prix" : "Indiquer le prix"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const priceEuros = Number.parseFloat(price.replace(",", "."));
            const packQuantity = Number.parseFloat(quantity.replace(",", "."));
            start(async () => {
              const res = await setManualPriceAction({
                ingredientId: line.ingredientId,
                priceEuros,
                packQuantity,
                packUnit: line.purchaseUnit,
              });
              if (!res.ok) toast.error(res.fieldErrors ? Object.values(res.fieldErrors)[0] : res.error);
              else {
                toast.success(res.message ?? "Prix enregistré.");
                setOpen(false);
              }
            });
          }}
        >
          <p className="text-sm font-medium">{line.name} : prix payé</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${idBase}-price`}>Prix (€)</Label>
              <Input
                id={`${idBase}-price`}
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="2,35"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${idBase}-qty`}>Pour ({UNIT_LABEL[line.purchaseUnit]})</Label>
              <Input
                id={`${idBase}-qty`}
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Visible uniquement par votre foyer, pour ce magasin.</p>
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Enregistrer
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

const AISLE_ICONS: Record<string, LucideIcon> = {
  fruits_legumes: SaladIcon,
  boucherie: BeefIcon,
  poissonnerie: FishIcon,
  frais: MilkIcon,
  epicerie: WheatIcon,
  surgeles: SnowflakeIcon,
  boulangerie: CroissantIcon,
  boissons: CupSodaIcon,
};

/**
 * Always a picture: the product's own photo (Open Food Facts), otherwise a
 * generic photo of the ingredient (Pexels, an illustration), otherwise an
 * icon of the aisle.
 */
function LineThumb({ line }: { line: ShoppingLineView }) {
  const product = line.purchases.find((p) => p.imageUrl);
  if (product?.imageUrl) {
    return (
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-white">
        <Image src={product.imageUrl} alt={product.productName} fill sizes="48px" className="object-contain p-0.5" />
      </div>
    );
  }
  if (line.photo) {
    return (
      <div
        className="relative size-12 shrink-0 overflow-hidden rounded-lg border bg-muted"
        title="Illustration de l'ingrédient, pas le produit exact"
      >
        <Image src={line.photo.url} alt={`${line.name} (illustration)`} fill sizes="48px" className="object-cover" />
      </div>
    );
  }
  const Icon = AISLE_ICONS[line.aisle] ?? PackageIcon;
  return (
    <div
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground"
      data-testid="line-icon"
    >
      <Icon className="size-6" />
    </div>
  );
}

const FALLBACK_TAGS = {
  other_store: { label: "autre magasin", className: "bg-saffron-soft text-saffron-ink" },
  demo: { label: "prix fictif", className: "bg-paprika-soft text-paprika-ink" },
} as const;

function Line({
  line,
  checked,
  onToggle,
  retailer,
}: {
  line: ShoppingLineView;
  checked: boolean;
  onToggle: (v: boolean) => void;
  retailer: RetailerLink | null;
}) {
  const id = `line-${line.ingredientId}`;
  const fallback = line.purchases.find((p) => p.fallback)?.fallback ?? null;
  return (
    <li className={cn("flex gap-3 px-4 py-3 transition-opacity", checked && "opacity-55")}>
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onToggle(v === true)} className="mt-0.5 size-6 rounded-md" />
      <LineThumb line={line} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <label htmlFor={id} className={cn("font-medium", checked && "line-through decoration-2")}>
            {line.name}
          </label>
          <span className="flex shrink-0 flex-col items-end gap-0.5">
            <span className="font-semibold tabular" data-testid="line-price">
              {line.costCents !== null ? (
                formatEuros(line.costCents)
              ) : (
                <span className="font-normal text-muted-foreground">Prix à indiquer</span>
              )}
            </span>
            {fallback ? (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", FALLBACK_TAGS[fallback].className)}>
                {FALLBACK_TAGS[fallback].label}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-col">
            <p className="text-sm">
              {line.purchases.length > 0
                ? line.purchases.map((p) => `${p.count} × ${p.packLabel}`).join(" + ")
                : line.priceMissing
                  ? `Besoin : ${line.neededLabel}`
                  : null}
            </p>
            {line.purchases.length > 0 && !line.purchases[0].manual ? (
              <p className="truncate text-xs text-muted-foreground">
                {line.purchases[0].productName}
                {line.purchases[0].brand ? ` · ${line.purchases[0].brand}` : ""}
              </p>
            ) : null}
          </div>
          {line.priceMissing || fallback || line.purchases.some((p) => p.manual) ? (
            <ManualPrice line={line} existing={line.purchases.some((p) => p.manual)} />
          ) : null}
          {retailer ? (
            <a
              href={retailer.search(searchQueryFor(line.name))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              Chercher sur {retailer.name}
              <ExternalLinkIcon aria-hidden className="size-3" />
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ) : null}
        </div>
        <Collapsible>
          <CollapsibleTrigger className="group inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            Besoin {line.neededLabel}
            {line.leftoverLabel ? ` · reste ${line.leftoverLabel}` : ""}
            <ChevronDownIcon aria-hidden className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
            <span className="sr-only">Afficher le détail</span>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 flex flex-col gap-2 rounded-lg bg-muted/60 p-3 text-xs">
            {line.purchases.map((p, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground">
                    {p.productName}
                    {p.brand ? ` · ${p.brand}` : ""}
                  </span>
                  <QualityBadge quality={p.quality} />
                  {p.isOrganic ? <span className="rounded-full bg-basil-soft px-2 py-0.5">Bio</span> : null}
                  {p.promotion ? <span className="rounded-full bg-paprika-soft px-2 py-0.5">{p.promotion}</span> : null}
                </div>
                <p className="text-muted-foreground">
                  {formatEuros(p.priceCents)} l'unité{p.unitPriceLabel ? ` · ${p.unitPriceLabel}` : ""}
                  {p.storeName ? ` · ${p.storeName}` : ""}
                </p>
                <p className="text-muted-foreground">
                  Source : {PROVIDER_LABELS[p.provider] ?? p.provider}
                  {p.fetchedAtLabel ? ` · relevé le ${p.fetchedAtLabel} (${FRESHNESS_LABELS[p.freshness].toLowerCase()})` : ""}
                  {p.sourceUrl ? (
                    <>
                      {" · "}
                      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        voir la source
                      </a>
                    </>
                  ) : null}
                </p>
                {p.substitution ? <p className="text-saffron-ink">Substitution : {p.substitution}</p> : null}
                {p.fallback === "other_store" ? (
                  <p className="text-saffron-ink">
                    Votre magasin n'a pas de prix pour cet ingrédient : prix relevé ailleurs, à titre indicatif.
                  </p>
                ) : null}
                {p.fallback === "demo" ? (
                  <p className="text-paprika-ink">
                    Aucun prix réel connu : prix fictif du catalogue de démonstration, en attendant le vôtre.
                  </p>
                ) : null}
                {p.imageUrl ? <p className="text-muted-foreground">Photo du produit : Open Food Facts (CC BY-SA)</p> : null}
              </div>
            ))}
            {!line.purchases.some((p) => p.imageUrl) && line.photo ? (
              <p className="text-muted-foreground">
                Illustration de l'ingrédient, pas le produit exact
                {line.photo.credit ? (
                  <>
                    {" · "}
                    {line.photo.sourceUrl ? (
                      <a href={line.photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
                        {line.photo.credit}
                      </a>
                    ) : (
                      line.photo.credit
                    )}
                  </>
                ) : null}
              </p>
            ) : null}
            {line.fromPantryLabel ? <p>Déjà dans votre placard : {line.fromPantryLabel}</p> : null}
            {line.leftoverLabel ? (
              <p className={line.leftoverIsWaste ? "text-saffron-ink" : ""}>
                Reste après la semaine : {line.leftoverLabel}
                {line.leftoverIsWaste ? " (produit frais : à utiliser rapidement)" : " (se conserve)"}
              </p>
            ) : null}
            <p className="text-muted-foreground">Utilisé dans : {line.usedIn.join(", ")}</p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </li>
  );
}

export function ShoppingList({
  planId,
  aisles,
  initiallyChecked,
  totalCents,
}: {
  planId: string;
  aisles: AisleView[];
  initiallyChecked: string[];
  /** Total of the list, shown in the sticky bar while scrolling. */
  totalCents?: number;
}) {
  const [checked, setChecked] = useState(() => new Set(initiallyChecked));
  const [optimistic, setOptimistic] = useOptimistic(checked, (state, { id, value }: { id: string; value: boolean }) => {
    const next = new Set(state);
    if (value) next.add(id);
    else next.delete(id);
    return next;
  });
  const [, start] = useTransition();
  const [hideChecked, setHideChecked] = useState(false);
  // The chosen retailer is a per-device convenience, kept in localStorage.
  const retailerSlug = useSyncExternalStore(subscribeRetailer, readRetailer, () => "none");
  const total = aisles.reduce((s, a) => s + a.lines.length, 0);
  const retailer = retailerLink(retailerSlug);

  function chooseRetailer(slug: string) {
    try {
      window.localStorage.setItem(RETAILER_KEY, slug);
    } catch {
      // Ignore: the choice simply won't be remembered.
    }
    retailerListeners.forEach((l) => l());
  }

  async function copyList() {
    const text = aisles
      .map((a) =>
        [
          `${a.label}`,
          ...a.lines.map(
            (l) => `- ${l.name} : ${l.purchases.map((p) => `${p.count} × ${p.packLabel}`).join(" + ") || l.neededLabel}`,
          ),
        ].join("\n"),
      )
      .join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Liste copiée", { description: "Collez-la dans l'appli ou le site de votre drive." });
    } catch {
      toast.error("La copie n'est pas autorisée par ce navigateur.");
    }
  }

  function uncheckAll() {
    start(async () => {
      const previous = checked;
      for (const id of previous) setOptimistic({ id, value: false });
      const res = await uncheckAllShoppingAction({ planId });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setChecked(new Set());
      toast.success(res.message ?? "Liste remise à zéro.");
    });
  }

  function toggle(id: string, value: boolean) {
    start(async () => {
      setOptimistic({ id, value });
      const res = await toggleShoppingItemAction({ planId, ingredientId: id, checked: value });
      if (!res.ok) {
        toast.error(res.error, { icon: <RefreshCcwIcon className="size-4" /> });
        return;
      }
      setChecked((prev) => {
        const next = new Set(prev);
        if (value) next.add(id);
        else next.delete(id);
        return next;
      });
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stays visible while scrolling the list in the shop. */}
      <div className="sticky top-14 z-20 -mx-4 flex flex-col gap-2 border-b bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4 md:top-16">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-sm" aria-live="polite">
            <strong className="tabular">{optimistic.size}</strong> / {total} dans le panier
            {totalCents !== undefined ? (
              <>
                {" · "}
                <strong className="tabular">{formatEuros(totalCents)}</strong>
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <Switch checked={hideChecked} onCheckedChange={setHideChecked} />
              Masquer les cochés
            </label>
            {optimistic.size > 0 ? (
              <Button type="button" variant="ghost" size="sm" onClick={uncheckAll}>
                <RotateCcwIcon data-icon="inline-start" />
                Tout décocher
              </Button>
            ) : null}
          </div>
        </div>
        <Progress value={total > 0 ? (optimistic.size / total) * 100 : 0} className="h-1.5" aria-label={`${optimistic.size} produit(s) sur ${total} dans le panier`} />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm font-medium">Commander en drive</p>
          <p className="text-xs text-muted-foreground">
            Ouvrez chaque produit dans la recherche de votre enseigne, ou copiez la liste. L'envoi direct du panier nécessite un
            partenariat avec l'enseigne.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={retailerSlug} onValueChange={chooseRetailer}>
            <SelectTrigger className="w-52" aria-label="Enseigne pour la recherche des produits">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="none">Choisir une enseigne</SelectItem>
                {RETAILER_LINKS.map((r) => (
                  <SelectItem key={r.slug} value={r.slug}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={copyList}>
            <CopyIcon data-icon="inline-start" />
            Copier la liste
          </Button>
        </div>
      </div>
      {aisles.map((a) => {
        const lines = hideChecked ? a.lines.filter((l) => !optimistic.has(l.ingredientId)) : a.lines;
        if (lines.length === 0) return null;
        return (
          <section key={a.aisle} aria-labelledby={`aisle-${a.aisle}`} className="flex flex-col gap-2">
            <h2 id={`aisle-${a.aisle}`} className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
              {a.label}
            </h2>
            <ul className="surface divide-y">
              {lines.map((l) => (
                <Line
                  key={l.ingredientId}
                  line={l}
                  checked={optimistic.has(l.ingredientId)}
                  onToggle={(v) => toggle(l.ingredientId, v)}
                  retailer={retailer}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
