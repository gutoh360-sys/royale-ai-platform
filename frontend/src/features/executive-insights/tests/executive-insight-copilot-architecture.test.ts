import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const FACADE_DIR = path.resolve(__dirname, "..", "copilot")

const FACADE_FILES = [
  "copilot-executive-facade.ts",
  "index.ts",
]

const COPIROT_SERVICES_DIR = path.resolve(__dirname, "..", "..", "executive-copilot", "services")

describe("CopilotExecutiveFacade — no prohibited dependencies", () => {
  for (const file of FACADE_FILES) {
    it(`${file} does not import Repository directly`, () => {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain("ExecutiveInsightRepository")
      expect(content).not.toContain("/repository/")
    })

    it(`${file} does not import Timeline directly`, () => {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain("ExecutiveInsightTimeline")
      expect(content).not.toContain("/timeline/")
    })

    it(`${file} does not import Lifecycle, Builders, or domain engines`, () => {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain("LifecycleEngine")
      expect(content).not.toContain("Lifecycle")
      expect(content).not.toContain("Builder")
      expect(content).not.toContain("/marketplace/")
      expect(content).not.toContain("/financial-executive/")
      expect(content).not.toContain("/inventory-executive/")
      expect(content).not.toContain("/sales-executive/")
      expect(content).not.toContain("/products-executive/")
      expect(content).not.toContain("/purchasing-executive/")
    })

    it(`${file} does not import React, hooks, or UI`, () => {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain('"use client"')
      expect(content).not.toContain("from \"react\"")
      expect(content).not.toContain("from 'react'")
      expect(content).not.toContain("/hooks/")
    })

    it(`${file} has no side effects or non-determinism`, () => {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("Date.now")
      expect(content).not.toContain("crypto")
    })
  }
})

describe("CopilotExecutiveFacade — only uses Intelligence Engine + Narrative Engine", () => {
  it("facade imports IntelligenceEngine and NarrativeEngine", () => {
    const content = fs.readFileSync(
      path.join(FACADE_DIR, "copilot-executive-facade.ts"),
      "utf-8",
    )
    expect(content).toContain("ExecutiveIntelligenceEngine")
    expect(content).toContain("ExecutiveNarrativeEngine")
  })

  it("facade does not have business logic", () => {
    const content = fs.readFileSync(
      path.join(FACADE_DIR, "copilot-executive-facade.ts"),
      "utf-8",
    )
    expect(content).not.toMatch(/severity\s*=\s*(?!=)/)
    expect(content).not.toContain("priority =")
    expect(content).not.toContain("priority=")
    expect(content).not.toMatch(/[Tt]hreshold/)
    expect(content).not.toMatch(/porque|por que|ocorreu|devido|causa|logo|therefore|because|caused/i)
    expect(content).not.toContain("calcHealth")
    expect(content).not.toContain("buildPriorities")
    expect(content).not.toContain("buildActions")
  })
})

describe("CopilotOrchestrator — no direct module service instantiation", () => {
  const serviceFiles = fs.readdirSync(COPIROT_SERVICES_DIR)
    .filter((f) => f.endsWith(".ts"))

  for (const file of serviceFiles) {
    it(`${file} does not instantiate module intelligence services`, () => {
      const content = fs.readFileSync(path.join(COPIROT_SERVICES_DIR, file), "utf-8")
      expect(content).not.toContain("new DefaultInventoryIntelligenceService")
      expect(content).not.toContain("new DefaultPurchaseIntelligenceService")
      expect(content).not.toContain("new DefaultSalesIntelligenceService")
      expect(content).not.toContain("new DefaultFinancialIntelligenceService")
      expect(content).not.toContain("/inventory-intelligence/services/")
      expect(content).not.toContain("/purchase-intelligence/services/")
      expect(content).not.toContain("/sales-intelligence/services/")
      expect(content).not.toContain("/financial-intelligence/services/")
      expect(content).not.toContain("/marketplace/mocks")
    })
  }
})

describe("ExecutiveInsights — copilot facade does not create circular dependency", () => {
  it("copilot directory does not import from executive-copilot feature", () => {
    const files = fs.readdirSync(FACADE_DIR).filter((f) => f.endsWith(".ts"))
    for (const file of files) {
      const content = fs.readFileSync(path.join(FACADE_DIR, file), "utf-8")
      expect(content).not.toContain("/executive-copilot/")
    }
  })
})
