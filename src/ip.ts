// IPv6는 /64 하나가 한 사용자에게 주어지므로 요청 제한 키를 /64로 묶음. IPv4와 IPv4 매핑 주소는 그대로
export function limitKey(ip: string): string {
  if (!ip.includes(":") || ip.includes(".")) return ip;
  const [head, tail = ""] = ip.split("::");
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const full = ip.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t] : h;
  return `${full
    .slice(0, 4)
    .map((x) => (parseInt(x, 16) || 0).toString(16))
    .join(":")}::/64`;
}
