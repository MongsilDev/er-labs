// OG 이미지 글꼴에 없는 글자는 @vercel/og가 글자열마다 Google Fonts에서 받아 지우지 않는 캐시에 쌓으므로, 이름은 글꼴에 있는 글자만 남김

// OpenType cmap 표의 형식 12 하위 표에서 글리프가 있는 코드 포인트를 모음
export function glyphs(font: Uint8Array): Set<number> {
  const v = new DataView(font.buffer, font.byteOffset, font.byteLength);
  let cmap = -1;
  for (let i = 0, n = v.getUint16(4); i < n; i++) {
    const rec = 12 + i * 16;
    if (String.fromCharCode(...font.subarray(rec, rec + 4)) === "cmap") cmap = v.getUint32(rec + 8);
  }
  const subs = cmap < 0 ? [] : Array.from({ length: v.getUint16(cmap + 2) }, (_, i) => cmap + v.getUint32(cmap + 8 + i * 8));
  const f12 = subs.find((o) => v.getUint16(o) === 12);
  if (f12 === undefined) throw new Error("글꼴에 cmap 형식 12 표가 없습니다");
  const out = new Set<number>();
  for (let i = 0, n = v.getUint32(f12 + 12); i < n; i++) {
    const g = f12 + 16 + i * 12;
    const [start, end, first] = [v.getUint32(g), v.getUint32(g + 4), v.getUint32(g + 8)];
    for (let c = start; c <= end; c++) if (first + c - start) out.add(c);
  }
  return out;
}

// 폭 없는 서식 문자만 남으면 빈 칸으로 그려지므로 같이 뺌
const FORMAT = /\p{Cf}/u;

export function keepGlyphs(text: string, covered: Set<number>): string {
  return [...text]
    .filter((ch) => covered.has(ch.codePointAt(0)!) && !FORMAT.test(ch))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
