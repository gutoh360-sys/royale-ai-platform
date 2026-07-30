import { describe, it, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const BUILDERS_DIR = path.resolve(__dirname, "..", "builders")

const BUILDER_FILES = [
  "marketplace-executive-insight-builder.ts",
  "financial-executive-insight-builder.ts",
  "inventory-executive-insight-builder.ts",
  "sales-executive-insight-builder.ts",
  "products-executive-insight-builder.ts",
  "purchasing-executive-insight-builder.ts",
]

const INPUT_FILES = [
  "marketplace-insight-input.ts",
  "financial-insight-input.ts",
  "inventory-insight-input.ts",
  "sales-insight-input.ts",
  "products-insight-input.ts",
  "purchasing-insight-input.ts",
]

describe("Builder architecture — no prohibited imports", () => {
  for (const file of BUILDER_FILES) {
    it(`${file} does not import React, hooks, APIs, or DB`, () => {
      const content = fs.readFileSync(path.join(BUILDERS_DIR, file), "utf-8")
      expect(content).not.toContain('"use client"')
      expect(content).not.toContain("from \"react\"")
      expect(content).not.toContain("from 'react'")
      expect(content).not.toContain("/hooks/")
      expect(content).not.toContain("Math.random")
      expect(content).not.toContain("Date.now")
      expect(content).not.toContain("crypto.randomUUID")
      expect(content).not.toContain("crypto.random")
      expect(content).not.toMatch(/scheduler|cron|background|SQLite|Redis|PostgreSQL|OpenAI|Claude|Gemini/i)
    })
  }

  for (const file of INPUT_FILES) {
    it(`inputs/${file} has no behavioral code`, () => {
      const content = fs.readFileSync(path.join(BUILDERS_DIR, "inputs", file), "utf-8")
      expect(content).not.toContain("class ")
      expect(content).not.toContain("function ")
      expect(content).not.toContain("new ")
    })
  }
})

describe("Builder architecture — no engines or prioritization called", () => {
  for (const file of BUILDER_FILES) {
    it(`${file} does not call engines or prioritization`, () => {
      const content = fs.readFileSync(path.join(BUILDERS_DIR, file), "utf-8")
      expect(content).not.toMatch(/DefaultExecutive(Intelligence|Prioritization)Service/)
      expect(content).not.toContain(".generateInsights(")
      expect(content).not.toContain(".prioritize(")
      expect(content).not.toContain(".analyzeProducts(")
      expect(content).not.toContain("buildInsights(")
      expect(content).not.toContain("buildRecommendations(")
    })
  }
})

describe("Builder architecture — no thresholds or magic numbers", () => {
  for (const file of BUILDER_FILES) {
    it(`${file} has no numeric thresholds`, () => {
      const content = fs.readFileSync(path.join(BUILDERS_DIR, file), "utf-8")
      const lines = content.split("\n")
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (line.includes(">= ") || line.includes("<= ") || line.includes("> ") || line.includes("< ")) {
          const trimmed = line.trim()
          if (
            !trimmed.includes("length") &&
            !trimmed.includes("indexOf") &&
            !trimmed.includes("for ") &&
            !trimmed.includes("i < ") &&
            !trimmed.startsWith("const ") &&
            !trimmed.startsWith("type ") &&
            !trimmed.startsWith("interface ")
          ) {
            expect(trimmed).toMatch(/length|indexOf|for|import|export/)
          }
        }
      }
    })
  }
})

describe("Builder architecture — no causal inference", () => {
  for (const file of BUILDER_FILES) {
    it(`${file} does not invent causality`, () => {
      const content = fs.readFileSync(path.join(BUILDERS_DIR, file), "utf-8")
      expect(content).not.toMatch(/porque|por que|ocorreu|devido|causa|logo|therefore|because|caused/i)
    })
  }
})
