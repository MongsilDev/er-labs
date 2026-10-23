import type { MetadataRoute } from "next";
import { KEL_SCREENS } from "@/er/lib/kel";
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
  ...Object.values(KEL_SCREENS)
    .filter((s) => s.public)
    .map((s) => s.path),
  `${KEL_SCREENS.characters.path}?view=build`,
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PATHS.map((path) => ({ url: `${BASE_URL}${path}` }));
}
