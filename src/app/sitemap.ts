import type { MetadataRoute } from "next";
import { BASE_URL } from "@/er/server/auth";

export const dynamic = "force-dynamic";

const PATHS = [
  "",
  "/privacy",
  "/er",
  "/er/score",
  "/er/example/a",
  "/tarkov",
  "/tarkov/players",
  "/tarkov/kord-breach",
  "/tarkov/criteria",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${BASE_URL}${path}` }));
}
