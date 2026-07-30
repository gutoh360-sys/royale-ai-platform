import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword", () => {
  it("produz hash diferente para mesma senha (salt aleatório)", async () => {
    const a = await hashPassword("123");
    const b = await hashPassword("123");
    expect(a).not.toBe(b);
  });

  it("produz string no formato salt:hex:iterations:N:hash:hex", async () => {
    const result = await hashPassword("abc");
    expect(result).toMatch(/^salt:[a-f0-9]{32}:iterations:\d+:hash:[a-f0-9]{128}$/);
  });
});

describe("verifyPassword", () => {
  it("retorna true para senha correta", async () => {
    const hash = await hashPassword("minha-senha");
    expect(await verifyPassword("minha-senha", hash)).toBe(true);
  });

  it("retorna false para senha incorreta", async () => {
    const hash = await hashPassword("senha-correta");
    expect(await verifyPassword("senha-errada", hash)).toBe(false);
  });

  it("retorna false para formato inválido", async () => {
    expect(await verifyPassword("x", "invalido")).toBe(false);
    expect(await verifyPassword("x", "salt:abc:iterations:0:hash:")).toBe(false);
  });
});
