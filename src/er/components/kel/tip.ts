// 값 상자 폭 어림값. 상자가 차트 밖으로 나가지 않게 위치를 이만큼 안쪽으로 제한함
const TIP = 180;

// 값 상자는 기준점이 차트 오른쪽 절반에 있으면 기준점 왼쪽에 둠
export const tipSide = (x: number, w: number, gap: number) =>
  x > w / 2 ? { right: Math.max(0, Math.min(w - x + gap, w - TIP)) } : { left: Math.max(0, Math.min(x + gap, w - TIP)) };
