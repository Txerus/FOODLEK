import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FOODLEK — repas, nutrition et courses",
    short_name: "FOODLEK",
    description: "Planifiez les repas du foyer, les portions de chacun et les courses.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f9f7f2",
    theme_color: "#f9f7f2",
    lang: "fr",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
