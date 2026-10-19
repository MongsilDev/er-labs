import type { MetadataRoute } from "next";
import { BASE_URL } from "@/server/http";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/players", "/kord-breach", "/criteria", "/privacy"].map((path) => ({ url: `${BASE_URL}${path}` }));
}
