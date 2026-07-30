import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const NARRATIVE_DIR = path.resolve(__dirname, "..", "narrative")

const NARRATIVE_FILES = [
  "executive-narrative-input.ts",
  "executive-narrative-output.ts",
  "executive-narrative-provider.ts",
  "executive-narrative-engine.ts",
  "executive-narrative-template-provider.ts",
  "executive-narrative-factuality-guard.ts",
  "executive-narrative-prompt-contract.ts",
  "index.ts",
]

describe("Narrative Layer — no prohibited imports", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain('"use client"')
      expect(content).not.toContain("from \"react\"")
      expect(content).not.toContain("from 'react'")
      expect(content).not.toContain("/hooks/")
      expect(content).not.toContain("/pages/")
      expect(content).not.toContain("/dashboard/")
      expect(content).not.toContain("/copilot/")
      expect(content).not.toContain("localStorage")
      expect(content).not.toContain("indexedDB")
      expect(content).not.toContain("Prisma")
      expect(content).not.toContain("Drizzle")
      expect(content).not.toContain("SQLite")
      expect(content).not.toContain("Scheduler")
      expect(content).not.toContain("Redis")
      expect(content).not.toContain("Kafka")
      expect(content).not.toContain("RabbitMQ")
      expect(content).not.toContain("WebSocket")
    })
  }
})

describe("Narrative Layer — no domain engines or modules", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not import domain engines or executive modules`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
      expect(content).not.toContain("/executive-copilot/")
      expect(content).not.toContain("/dashboard/")
      expect(content).not.toContain("/repository/")
      expect(content).not.toContain("/timeline/")
    })
  }
})

describe("Narrative Layer — no side effects or non-determinism", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} has no Date.now(), Math.random(), or crypto`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("crypto.randomUUID")
      expect(content).not.toContain("crypto.random")
    })
  }
})

describe("Narrative Engine — no business logic", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not assign severity, priority, or thresholds`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toMatch(/severity\s*=\s*(?!=)/)
      expect(content).not.toContain("priority =")
      expect(content).not.toContain("priority=")
      expect(content).not.toMatch(/[Tt]hreshold/)
      if (file !== "executive-narrative-prompt-contract.ts") {
        expect(content).not.toContain("duration")
        expect(content).not.toContain("recurrence")
        expect(content).not.toContain("criticality")
        expect(content).not.toMatch(/porque|por que|ocorreu|devido|causa|logo|therefore|because|caused/i)
      }
    })
  }
})

describe("Narrative Layer — no repository or timeline access", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not import repository or timeline`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain("Repository")
      expect(content).not.toContain("Timeline")
    })
  }
})

describe("Narrative Layer — no circular dependency with intelligence", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not import from intelligence engine`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain("/intelligence/")
    })
  }
})

describe("Narrative Layer — no AI SDK directly in domain", () => {
  for (const file of NARRATIVE_FILES) {
    it(`${file} does not import OpenAI, Anthropic, or Gemini directly`, () => {
      const content = fs.readFileSync(path.join(NARRATIVE_DIR, file), "utf-8")
      expect(content).not.toContain("openai")
      expect(content).not.toContain("anthropic")
      expect(content).not.toContain("gemini")
      expect(content).not.toContain("langchain")
    })
  }
})

describe("Narrative Layer — provider is abstract", () => {
  it("provider contract is an interface, not concrete", () => {
    const content = fs.readFileSync(
      path.join(NARRATIVE_DIR, "executive-narrative-provider.ts"),
      "utf-8",
    )
    expect(content).toContain("interface")
    expect(content).not.toContain("class")
  })
})

describe("Factuality Guard — no AI-based detection", () => {
  it("guard is deterministic and does not use AI", () => {
    const content = fs.readFileSync(
      path.join(NARRATIVE_DIR, "executive-narrative-factuality-guard.ts"),
      "utf-8",
    )
    expect(content).not.toContain("AI")
    expect(content).not.toContain("llm")
    expect(content).not.toContain("prompt")
  })
})
