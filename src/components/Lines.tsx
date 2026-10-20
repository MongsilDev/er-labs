import { Fragment } from "react";

// 문장 끝 마침표, 물음표, 느낌표 뒤 공백에서 줄바꿈. 3.5나 r1.csv처럼 공백 없는 점은 그대로
export default function Lines({ text }: { text: string }) {
  return text.split(/(?<=[.?!])\s+/).map((s, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {s}
    </Fragment>
  ));
}
