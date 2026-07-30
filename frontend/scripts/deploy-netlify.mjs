import { rmSync, mkdirSync, cpSync, readdirSync, existsSync, writeFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const deployDir = join(root, "..", "deploy netlify")
const outDir = join(root, "out")
const nextDir = join(root, ".next")

let sourceDir

if (existsSync(outDir)) {
  sourceDir = outDir
} else if (existsSync(nextDir)) {
  console.log("Usando .next/ (SSR). Apenas version.json será copiado.")
  sourceDir = null
} else {
  console.error("ERRO: Nenhum build encontrado. Execute npm run build primeiro.")
  process.exit(1)
}

if (existsSync(deployDir)) {
  rmSync(deployDir, { recursive: true, force: true })
}

mkdirSync(deployDir, { recursive: true })

if (sourceDir) {
  const entries = readdirSync(sourceDir)
  for (const entry of entries) {
    const src = join(sourceDir, entry)
    const dest = join(deployDir, entry)
    cpSync(src, dest, { recursive: true })
  }
}

const version = {
  version: "1.2.0",
  buildDate: new Date().toISOString(),
  environment: "production",
}

try {
  const { execSync } = await import("child_process")
  version.commit = execSync("git rev-parse --short HEAD 2>nul || echo unknown", { encoding: "utf8" }).trim()
} catch {
  version.commit = "unknown"
}

writeFileSync(join(deployDir, "version.json"), JSON.stringify(version, null, 2))
console.log(`  version.json (${version.version})`)

console.log(`deploy netlify criada em: ${deployDir}`)
console.log("Conteúdo:")
for (const entry of readdirSync(deployDir)) {
  console.log(`  ${entry}`)
}
