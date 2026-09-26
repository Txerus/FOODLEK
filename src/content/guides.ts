export interface Guide {
  slug: string;
  title: string;
  description: string;
  sections: { heading: string; paragraphs: string[] }[];
}

export const GUIDES: Guide[] = [
  {
    slug: "budget-courses",
    title: "Tenir un budget courses sans sacrifier les repas",
    description: "Méthode simple pour fixer un budget alimentaire hebdomadaire réaliste et s'y tenir, en raisonnant en paquets plutôt qu'en grammes.",
    sections: [
      {
        heading: "Partir d'un budget par repas",
        paragraphs: [
          "Un budget hebdomadaire se comprend mieux ramené au repas : divisez-le par le nombre de repas à préparer et par le nombre de personnes. C'est ce chiffre qui dit si un plat au saumon est raisonnable cette semaine ou s'il vaut mieux le garder pour la suivante.",
          "Comptez uniquement les repas que vous cuisinez vraiment : un déjeuner à la cantine ou au restaurant ne doit pas peser sur ce calcul.",
        ],
      },
      {
        heading: "Raisonner en paquets, pas en grammes",
        paragraphs: [
          "Une recette demande 200 g de crème, le magasin vend des pots de 500 g : le coût réel est celui du pot. Le moyen le plus efficace de faire baisser le panier est donc de choisir des recettes qui partagent les mêmes produits, pour que chaque paquet ouvert soit terminé dans la semaine.",
          "Les féculents secs (riz, pâtes, lentilles) se conservent : acheter le grand format est rarement du gaspillage. Les produits frais (viande, poisson, herbes, crème) sont ceux dont il faut surveiller les restes.",
        ],
      },
      {
        heading: "Choisir le bon mode de budget",
        paragraphs: [
          "Un budget strict convient quand chaque euro compte : on ne le dépasse qu'après une décision consciente. Un budget cible laisse quelques pourcents de marge si le menu y gagne vraiment. Quand la nutrition passe avant tout (reprise sportive, convalescence avec un suivi), le budget devient un repère secondaire.",
        ],
      },
      {
        heading: "Se méfier des prix « exacts »",
        paragraphs: [
          "Un prix n'est vrai que pour un magasin et un moment donnés : les prix varient d'un drive à l'autre et d'une semaine à l'autre. Un outil sérieux doit toujours dire d'où vient un prix et quand il a été relevé.",
        ],
      },
    ],
  },
  {
    slug: "meal-prep",
    title: "Cuisiner à l'avance : le « cuisiner une fois, manger deux fois »",
    description: "Comment organiser la semaine pour cuisiner moins souvent sans manger toujours la même chose.",
    sections: [
      {
        heading: "Le dîner qui devient le déjeuner du lendemain",
        paragraphs: [
          "La forme la plus simple de préparation à l'avance consiste à cuisiner un dîner en plus grande quantité et à en garder une part pour le déjeuner du lendemain. Une session de cuisine en moins, sans aucune organisation supplémentaire.",
          "Curry, chili, dahl, gratins et salades de céréales s'y prêtent très bien. Les poissons cuits minute et les omelettes, beaucoup moins.",
        ],
      },
      {
        heading: "Varier sans multiplier les courses",
        paragraphs: [
          "Deux recettes différentes qui partagent une base (riz, légumes du même filet, un pot de crème) donnent de la variété dans l'assiette et un panier plus court. C'est plus efficace que de cuisiner cinq fois la même grande marmite.",
        ],
      },
      {
        heading: "Conservation",
        paragraphs: [
          "Laissez refroidir rapidement, couvrez et placez au réfrigérateur dans les deux heures. Consommez les plats cuisinés dans un délai court et réchauffez-les à cœur. En cas de doute sur un aliment, référez-vous aux recommandations des autorités sanitaires.",
        ],
      },
    ],
  },
];
