export interface WizardCatalog {
  ingredients: { id: string; name: string; isStaple: boolean }[];
  stores: { id: string; name: string; city: string | null; retailerName: string; isDemo: boolean }[];
  retailers: { name: string; status: string; notes: string | null }[];
}
