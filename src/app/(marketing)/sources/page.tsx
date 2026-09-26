import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sources des données", alternates: { canonical: "/sources" } };

export default function SourcesPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Sources des données</h1>
      <p className="text-lg text-muted-foreground">FOODLEK n'invente ni prix, ni valeur nutritionnelle, ni produit. Voici d'où viennent les chiffres.</p>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold">Composition des aliments</h2>
        <p className="leading-relaxed">
          Les valeurs nutritionnelles des ingrédients proviennent aujourd'hui de <strong>USDA FoodData Central</strong> (SR Legacy et Foundation Foods, domaine public), chaque ingrédient étant relié à un identifiant FDC. La table française <strong>ANSES-Ciqual 2025</strong> (Licence Ouverte Etalab 2.0) est la référence visée : un import dédié est prévu et chaque valeur conserve sa source et sa version.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Les valeurs d'une recette sont recalculées à partir de ses ingrédients. Aucune intelligence artificielle ne sert de source pour les calories, les macronutriments ou les allergènes.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold">Produits et prix</h2>
        <p className="leading-relaxed">
          Chaque prix est rattaché à une enseigne, un magasin, un produit, un conditionnement et une date de relevé. Les grandes enseignes françaises ne proposent pas d'accès public à leur catalogue : elles apparaissent comme « pas d'accès autorisé » tant qu'un accès officiel ou partenaire n'existe pas. FOODLEK ne pratique pas de scraping.
        </p>
        <p className="leading-relaxed">
          <strong>Open Prices</strong> (Open Food Facts, ODbL) fournit des prix observés en magasin par la communauté, datés et localisés : ils peuvent être utilisés avec leur date. <strong>Open Food Facts</strong> (ODbL) identifie les produits par code-barres.
        </p>
        <p className="leading-relaxed text-muted-foreground">
          Le magasin de démonstration utilise des produits et des prix fictifs, étiquetés « Démo » partout, pour essayer le service.
        </p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="font-display text-2xl font-semibold">Recettes</h2>
        <p className="leading-relaxed">
          Les recettes sont des recettes maison originales, rédigées pour FOODLEK avec l'aide d'une IA, puis converties en données structurées et validées automatiquement (ingrédients connus, quantités convertibles, source de protéines) avant d'être proposées.
        </p>
      </section>
    </article>
  );
}
