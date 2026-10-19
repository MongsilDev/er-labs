import data from "@/data/example.json";
import { presetRules } from "./rules";
import type { TournamentView } from "./view";

export function exampleView(): TournamentView {
  const rules = presetRules("masters");
  return { ...(data as unknown as Omit<TournamentView, "rules">), rules };
}
