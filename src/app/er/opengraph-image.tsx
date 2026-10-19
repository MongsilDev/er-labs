import { OG_SIZE, siteImage } from "@/er/server/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Labs 이터널 리턴";

export default async function Image() {
  return siteImage();
}
