import type { MetadataRoute } from "next";
import { BASE_URL } from "@/server/auth";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/score", "/example/a", "/privacy"].map((path) => ({ url: `${BASE_URL}${path}` }));
}
