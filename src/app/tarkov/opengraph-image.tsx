import { OG_SIZE, siteImage } from "@/tarkov/server/og";

export const alt = "Labs Escape from Tarkov";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return siteImage();
}
