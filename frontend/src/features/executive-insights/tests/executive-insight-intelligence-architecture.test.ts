import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const INTELLIGENCE_DIR = path.resolve(__dirname, "..", "intelligence")

const INTELLIGENCE_FILES = [
  "executive-insight-intelligence-engine.ts",
  "executive-insight-timeline-queries.ts",
  "executive-insight-event-publisher.ts",
  "executive-insight-alert.ts",
  "executive-insight-alert-engine.ts",
  "index.ts",
]

describe("Intelligence Layer — no prohibited imports", () => {
  for (const file of INTELLIGENCE_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
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

describe("Intelligence Layer — no engines or domain modules", () => {
  for (const file of INTELLIGENCE_FILES) {
    it(`${file} does not import domain engines`, () => {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
      expect(content).not.toContain("/executive-copilot/")
      expect(content).not.toContain("/dashboard/")
    })
  }
})

describe("Intelligence Layer — no side effects", () => {
  for (const file of INTELLIGENCE_FILES) {
    it(`${file} has no Date.now(), new Date(), Math.random, or crypto`, () => {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toContain("new Date")
      expect(content).not.toContain("Date.now")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("crypto")
    })
  }
})

describe("Intelligence Layer — no business calculation", () => {
  for (const file of INTELLIGENCE_FILES) {
    it(`${file} does not assign severity or priority`, () => {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toMatch(/severity\s*=\s*(?!=)/)
      expect(content).not.toContain("priority =")
      expect(content).not.toContain("priority=")
      expect(content).not.toMatch(/porque|por que|ocorreu|devido|causa|logo|therefore|because|caused/i)
    })
    it(`${file} does not reference thresholds`, () => {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toMatch(/[Tt]hreshold/)
    })
  }
})

describe("Intelligence Engine — does not access repository from Dashboard/Copilot", () => {
  it("only the Intelligence Engine imports repository directly", () => {
    const engineContent = fs.readFileSync(
      path.join(INTELLIGENCE_DIR, "executive-insight-intelligence-engine.ts"),
      "utf-8",
    )
    expect(engineContent).toContain("ExecutiveInsightRepository")

    const nonEngineFiles = INTELLIGENCE_FILES.filter(
      (f) => f !== "executive-insight-intelligence-engine.ts",
    )
    for (const file of nonEngineFiles) {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toContain("ExecutiveInsightRepository")
    }
  })
})

describe("InMemoryPublisher — infrastructure test only", () => {
  it("does not appear in production code", () => {
    for (const file of INTELLIGENCE_FILES) {
      const content = fs.readFileSync(path.join(INTELLIGENCE_DIR, file), "utf-8")
      expect(content).not.toContain("InMemory")
    }
  })
})

describe("ExecutiveInsightEventPublisher — no concrete implementations", () => {
  it("is a type-only interface with publish method", () => {
    const content = fs.readFileSync(
      path.join(INTELLIGENCE_DIR, "executive-insight-event-publisher.ts"),
      "utf-8",
    )
    expect(content).toContain("interface ")
    expect(content).toContain("publish(event")
    expect(content).not.toContain("class ")
    expect(content).not.toContain("new ")
  })
})

describe("ExecutiveInsightAlert — contract", () => {
  it("has exactly 3 alert types (no unofficial classifications)", () => {
    const content = fs.readFileSync(
      path.join(INTELLIGENCE_DIR, "executive-insight-alert.ts"),
      "utf-8",
    )
    expect(content).toContain("REOPENED")
    expect(content).toContain("RESOLVED")
    expect(content).toContain("ARCHIVED")
    expect(content).not.toContain("RECURRING_CRITICAL")
  })
})
