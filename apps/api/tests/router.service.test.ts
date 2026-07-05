import { describe, expect, it } from "vitest";
import { RouterService } from "../src/services/router.service";

describe("RouterService.classifyIntent", () => {
  const router = new RouterService();

  it("routes order intent by keyword", () => {
    expect(router.classifyIntent("Can you track my order ORD-1001?")).toBe("order");
  });

  it("recognizes alphanumeric order numbers without the word 'order'", () => {
    expect(router.classifyIntent("status of ORD-MR7RIYKO76")).toBe("order");
  });

  it("recognizes shipping vocabulary", () => {
    expect(router.classifyIntent("when will my package be delivered")).toBe("order");
  });

  it("routes order pricing questions to the order agent", () => {
    expect(router.classifyIntent("how much do my orders cost")).toBe("order");
    expect(router.classifyIntent("all order pricing")).toBe("order");
  });

  it("routes billing intent by keyword", () => {
    expect(router.classifyIntent("I need a refund for my last invoice")).toBe("billing");
  });

  it("recognizes invoice numbers", () => {
    expect(router.classifyIntent("what happened to INV-3001")).toBe("billing");
  });

  it("routes subscription questions to billing, not order", () => {
    expect(router.classifyIntent("cancel my subscription")).toBe("billing");
  });

  it("prefers billing when a refund concerns an order number", () => {
    expect(router.classifyIntent("refund status for ORD-1001")).toBe("billing");
  });

  it("does not match keyword fragments inside other words", () => {
    expect(router.classifyIntent("the billboard is broken")).toBeUndefined();
  });

  it("returns undefined for ambiguous messages (deferred to LLM)", () => {
    expect(router.classifyIntent("How do I update my account profile?")).toBeUndefined();
  });
});
