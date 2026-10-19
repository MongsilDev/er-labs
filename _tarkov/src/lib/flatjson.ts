// {"키":"값" 또는 숫자, ...} 형태의 큰 JSON을 조각 단위로 읽음. 중첩 객체는 다루지 않음

export type Pair = (key: string, value: string | number) => void;

export class FlatJsonReader {
  private buf = "";
  private started = false;
  private key: string | null = null;

  constructor(private onPair: Pair) {}

  push(chunk: string) {
    this.buf += chunk;
    let i = 0;
    const s = this.buf;
    const n = s.length;
    const skipWs = () => {
      while (i < n && (s[i] === " " || s[i] === "\n" || s[i] === "\r" || s[i] === "\t" || s[i] === ",")) i++;
    };
    if (!this.started) {
      skipWs();
      if (i >= n) return this.keep(i);
      if (s[i] !== "{") throw new SyntaxError("객체가 아닙니다");
      i++;
      this.started = true;
    }
    for (;;) {
      skipWs();
      if (i >= n) break;
      if (s[i] === "}") {
        i++;
        break;
      }
      const start = i;
      let tok: string | number;
      if (s[i] === '"') {
        let j = i + 1;
        while (j < n && s[j] !== '"') j += s[j] === "\\" ? 2 : 1;
        if (j >= n) break;
        const raw = s.slice(i, j + 1);
        tok = raw.includes("\\") ? (JSON.parse(raw) as string) : raw.slice(1, -1);
        i = j + 1;
      } else {
        let j = i;
        while (j < n && s[j] !== "," && s[j] !== "}" && s[j] !== " " && s[j] !== "\n") j++;
        if (j >= n) break;
        tok = Number(s.slice(i, j));
        i = j;
      }
      if (this.key == null) {
        let j = i;
        while (j < n && s[j] !== ":") j++;
        if (j >= n) {
          i = start;
          break;
        }
        this.key = String(tok);
        i = j + 1;
      } else {
        this.onPair(this.key, tok);
        this.key = null;
      }
    }
    this.keep(i);
  }

  private keep(i: number) {
    this.buf = this.buf.slice(i);
  }
}
