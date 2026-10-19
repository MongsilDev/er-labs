export const NAME_MAX = 40;

export function cleanName(value: unknown, max = NAME_MAX): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().replace(/\s+/g, " ").slice(0, max).trim();
}
