import type { MetadataRoute } from "next";
import { BASE_URL } from "@/server/auth";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/t/", "/i/", "/api/", "/auth/"] },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
