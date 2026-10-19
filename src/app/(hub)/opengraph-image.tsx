import { OG_SIZE, siteImage } from "@/er/server/og";
import { HUB_ACCENT } from "./Mark";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Labs";

export default function Image() {
  return siteImage({ sub: "게임 도구 모음", url: "labs.mongsil.dev", accent: HUB_ACCENT });
}
