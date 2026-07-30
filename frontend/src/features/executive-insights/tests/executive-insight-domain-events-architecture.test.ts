import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const DOMAIN_EVENTS_DIR = path.resolve(__dirname, "..", "domain", "events")

const DOMAIN_EVENTS_FILES = [
  "executive-insight-event-type.ts",
  "executive-insight-domain-event.ts",
  "index.ts",
]

const TIMELINE_DIR = path.resolve(__dirname, "..", "timeline")

const TIMELINE_FILES = [
  "executive-insight-timeline.ts",
  "index.ts",
]

describe("Domain Events architecture — no prohibited imports", () => {
  for (const file of DOMAIN_EVENTS_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(DOMAIN_EVENTS_DIR, file), "utf-8")
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

describe("Domain Events architecture — no engines or domain imports", () => {
  for (const file of DOMAIN_EVENTS_FILES) {
    it(`${file} does not import engines or domain modules`, () => {
      const content = fs.readFileSync(path.join(DOMAIN_EVENTS_DIR, file), "utf-8")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
      expect(content).not.toContain("/executive-copilot/")
      expect(content).not.toContain("/dashboard/")
      expect(content).not.toContain(".analyzeProducts(")
      expect(content).not.toContain(".generateInsights(")
      expect(content).not.toContain(".prioritize(")
    })
  }
})

describe("Domain Events architecture — no side effects", () => {
  for (const file of DOMAIN_EVENTS_FILES) {
    it(`${file} has no Date.now(), new Date(), Math.random, or crypto`, () => {
      const content = fs.readFileSync(path.join(DOMAIN_EVENTS_DIR, file), "utf-8")
      expect(content).not.toContain("new Date")
      expect(content).not.toContain("Date.now")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("crypto")
    })
  }
})

describe("Domain Events architecture — no concrete implementations", () => {
  it("does not contain classes or new expressions", () => {
    for (const file of DOMAIN_EVENTS_FILES) {
      const content = fs.readFileSync(path.join(DOMAIN_EVENTS_DIR, file), "utf-8")
      expect(content).not.toContain("class ")
      expect(content).not.toContain("new ")
    }
  })
})

describe("Timeline architecture — no prohibited imports", () => {
  for (const file of TIMELINE_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(TIMELINE_DIR, file), "utf-8")
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

describe("Timeline architecture — no concrete implementations", () => {
  it("does not contain classes or new expressions", () => {
    for (const file of TIMELINE_FILES) {
      const content = fs.readFileSync(path.join(TIMELINE_DIR, file), "utf-8")
      expect(content).not.toContain("class ")
      expect(content).not.toContain("new ")
    }
  })
})

describe("Timeline architecture — no engines or domain imports", () => {
  for (const file of TIMELINE_FILES) {
    it(`${file} does not import engines or domain modules`, () => {
      const content = fs.readFileSync(path.join(TIMELINE_DIR, file), "utf-8")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
      expect(content).not.toContain("/executive-copilot/")
    })
  }
})

describe("Engine architecture — events in engine", () => {
  const engineFile = path.resolve(__dirname, "..", "lifecycle", "executive-insight-lifecycle-engine.ts")

  it("imports timeline and event types but does not generate random values", () => {
    const content = fs.readFileSync(engineFile, "utf-8")
    expect(content).not.toContain("Math.random")
    expect(content).not.toContain("Date.now")
    expect(content).not.toContain("new Date(")
    expect(content).not.toContain("crypto")
  })
})

describe("InMemoryTimeline — infrastructure test only", () => {
  it("does not appear in production code", () => {
    const domainEventsIndex = fs.readFileSync(path.join(DOMAIN_EVENTS_DIR, "index.ts"), "utf-8")
    const timelineIndex = fs.readFileSync(path.join(TIMELINE_DIR, "index.ts"), "utf-8")
    expect(domainEventsIndex).not.toContain("InMemory")
    expect(timelineIndex).not.toContain("InMemory")
  })
})
