import type { MetadataRoute } from "next";
import { BASE_URL } from "@/er/server/auth";

export const dynamic = "force-dynamic";

const PATHS = [
  "",
  "/privacy",
  "/terms",
  "/er/score",
  "/er/cut",
  "/er/example/a",
  "/tarkov/players",
  "/tarkov/kord-breach",
  "/tarkov/criteria",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${BASE_URL}${path}` }));
}
