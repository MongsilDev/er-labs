import { OG_SIZE, siteImage } from "@/server/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "ER Labs";

export default async function Image() {
  return siteImage();
}
