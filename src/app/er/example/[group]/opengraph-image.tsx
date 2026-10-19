import { exampleView } from "@/er/lib/example";
import { OG_SIZE, boardImage } from "@/er/server/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "예시 대회 순위표";

export default async function Image() {
  return boardImage(exampleView(), 0);
}
