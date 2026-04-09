import { describe, expect, it } from "vitest";
import { RouterService } from "../src/services/router.service";

describe("RouterService", () => {
  const router = new RouterService();

  it("routes order intent", () => {
    expect(router.classifyIntent("Can you track my order ORD-1001?")).toBe("order");
  });

  it("routes billing intent", () => {
    expect(router.classifyIntent("I need a refund for my last invoice")).toBe("billing");
  });

  it("falls back to support intent", () => {
    expect(router.classifyIntent("How do I update my account profile?")).toBe("support");
  });
});
