import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/planning", "/recipes", "/shopping", "/pantry", "/household", "/nutrition", "/stores", "/settings", "/onboarding", "/admin", "/login", "/signup"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
