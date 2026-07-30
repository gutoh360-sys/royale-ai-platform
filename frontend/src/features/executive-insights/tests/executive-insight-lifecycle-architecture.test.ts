import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const LIFECYCLE_DIR = path.resolve(__dirname, "..", "lifecycle")

const LIFECYCLE_FILES = [
  "lifecycle-context.ts",
  "lifecycle-transitions.ts",
  "lifecycle-reconciliation-result.ts",
  "executive-insight-lifecycle-engine.ts",
  "index.ts",
]

describe("Lifecycle Engine architecture — no prohibited imports", () => {
  for (const file of LIFECYCLE_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(LIFECYCLE_DIR, file), "utf-8")
      expect(content).not.toContain('"use client"')
      expect(content).not.toContain("from \"react\"")
      expect(content).not.toContain("from 'react'")
      expect(content).not.toContain("/hooks/")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("Date.now")
      expect(content).not.toContain("new Date()")
      expect(content).not.toContain("crypto.randomUUID")
      expect(content).not.toContain("crypto.random")
      expect(content).not.toContain("localStorage")
      expect(content).not.toContain("indexedDB")
      expect(content).not.toContain("Prisma")
      expect(content).not.toContain("Drizzle")
      expect(content).not.toContain("SQLite")
      expect(content).not.toMatch(/scheduler|cron|background|SQLite|Redis|PostgreSQL|OpenAI|Claude|Gemini/i)
    })
  }
})

describe("Lifecycle Engine architecture — no engines or domain imports", () => {
  for (const file of LIFECYCLE_FILES) {
    it(`${file} does not import engines or domain modules`, () => {
      const content = fs.readFileSync(path.join(LIFECYCLE_DIR, file), "utf-8")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
      expect(content).not.toContain("/executive-copilot/")
      expect(content).not.toContain("/dashboard/")
      expect(content).not.toMatch(/DefaultExecutive(Intelligence|Prioritization)Service/)
      expect(content).not.toContain(".analyzeProducts(")
      expect(content).not.toContain(".generateInsights(")
      expect(content).not.toContain(".prioritize(")
    })
  }
})

describe("Lifecycle Engine architecture — no business logic", () => {
  for (const file of LIFECYCLE_FILES) {
    it(`${file} does not calculate thresholds, severity, or priority`, () => {
      const content = fs.readFileSync(path.join(LIFECYCLE_DIR, file), "utf-8")
      expect(content).not.toMatch(/threshold/i)
      expect(content).not.toContain("severity =")
      expect(content).not.toContain("severity=")
      expect(content).not.toContain("priority =")
      expect(content).not.toContain("priority=")
      expect(content).not.toMatch(/>= |<= |< | >/)
      expect(content).not.toMatch(/porque|por que|ocorreu|devido|causa|logo|therefore|because|caused/i)
    })
  }
})

describe("Lifecycle Engine architecture — no side effects", () => {
  it("engine has no new Date() or Date.now() calls", () => {
    const content = fs.readFileSync(
      path.join(LIFECYCLE_DIR, "executive-insight-lifecycle-engine.ts"),
      "utf-8",
    )
    expect(content).not.toContain("new Date")
    expect(content).not.toContain("Date.now")
    expect(content).not.toContain("Math.random")
    expect(content).not.toContain("crypto.randomUUID")
  })

  it("all lifecycle files are deterministic", () => {
    const content = fs.readFileSync(
      path.join(LIFECYCLE_DIR, "lifecycle-transitions.ts"),
      "utf-8",
    )
    expect(content).not.toContain("Math.random")
    expect(content).not.toContain("Date.now")
    expect(content).not.toContain("crypto")
  })
})

describe("InMemoryRepository — infrastructure test only", () => {
  it("does not appear in production code", () => {
    const lifecycleFiles = LIFECYCLE_FILES.map((f) =>
      fs.readFileSync(path.join(LIFECYCLE_DIR, f), "utf-8"),
    )
    for (const content of lifecycleFiles) {
      expect(content).not.toContain("InMemory")
    }
  })
})
