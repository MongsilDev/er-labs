import { describe, expect, it } from "vitest";
import { limitKey } from "../../src/ip";

describe("요청 제한 키", () => {
  it("같은 /64의 IPv6 주소는 한 키로 묶는다", () => {
    expect(limitKey("2001:db8:1:2::1")).toBe("2001:db8:1:2::/64");
    expect(limitKey("2001:db8:1:2::2")).toBe("2001:db8:1:2::/64");
    expect(limitKey("2001:0DB8:0001:0002:0000:0000:0000:0001")).toBe("2001:db8:1:2::/64");
    expect(limitKey("2001:db8:1:3::1")).toBe("2001:db8:1:3::/64");
    expect(limitKey("::1")).toBe("0:0:0:0::/64");
  });

  it("IPv4와 IPv4 매핑 주소는 그대로 쓴다", () => {
    expect(limitKey("203.0.113.9")).toBe("203.0.113.9");
    expect(limitKey("::ffff:203.0.113.9")).toBe("::ffff:203.0.113.9");
    expect(limitKey("local")).toBe("local");
  });
});
