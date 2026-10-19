import { OG_SIZE, siteImage } from "@/server/og";

export const alt = "Tarkov Labs";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return siteImage();
}
