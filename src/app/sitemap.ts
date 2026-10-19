import type { MetadataRoute } from "next";
import { BASE_URL } from "@/er/server/auth";

export const dynamic = "force-dynamic";

const PATHS = [
  "",
  "/er",
  "/er/score",
  "/er/example/a",
  "/er/privacy",
  "/tarkov",
  "/tarkov/players",
  "/tarkov/kord-breach",
  "/tarkov/criteria",
  "/tarkov/privacy",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${BASE_URL}${path}` }));
}
