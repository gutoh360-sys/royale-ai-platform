# ADR-004: Single Source of Truth

## Status

Aprovado e implementado (PRs #051-#058)

## Problema

Múltiplos consumers (Dashboard, Copilot, Narrative, módulos) acessavam dados executivos por caminhos diferentes — alguns via módulos, outros via inteligência, outros via mocks próprios. Isso gerava inconsistências e duplicação.

## Decisão

Estabelecer a Executive Insight Platform como única fonte de verdade para dados de insight executivo:
- ExecutiveIntelligenceEngine é o único ponto de entrada para consultas
- CopilotExecutiveFacade é a única ponte para o Copilot
- Nenhum consumer cria, classifica ou transforma dados executivos
- Toda e qualquer inteligência executiva passa pelo fluxo oficial

## Consequências

- Positivas: Dados consistentes entre todos os consumers
- Positivas: Mudanças na fonte propagam para todos os consumers
- Positivas: Rastreabilidade completa (sourceRunId, timestamps, versões)
- Negativas: Camada única pode tornar-se gargalo (mitigado por ser in-memory/síncrona)

## Alternativas Descartadas

1. **Cada consumer gerencia seus próprios dados** — rejeitado por inconsistência garantida
2. **Event sourcing como única fonte** — rejeitado por complexidade para o escopo atual
3. **Compartilhar banco de dados entre consumers** — rejeitado por acoplamento de esquema
