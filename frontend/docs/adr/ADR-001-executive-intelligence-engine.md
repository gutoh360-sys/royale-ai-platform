# ADR-001: Executive Intelligence Engine

## Status

Aprovado e implementado (PR #056)

## Problema

Dashboard, Copilot e Narrative precisavam acessar dados de insight, mas cada consumer acessava Repository e Timeline diretamente, criando acoplamento e duplicação de consultas.

## Decisão

Criar o ExecutiveIntelligenceEngine como fachada centralizada que encapsula Repository, Timeline, TimelineQueries e AlertEngine. Nenhum consumer acessa Repository ou Timeline diretamente.

## Consequências

- Positivas: acoplamento reduzido, consultas padronizadas, ponto único de teste
- Positivas: Auditável — toda consulta passa pelo mesmo caminho
- Positivas: AlertEngine integrado por composição
- Negativas: Camada adicional de indireção
- Negativas: Engine pode crescer (mitigado por delegação a classes menores como TimelineQueries)

## Alternativas Descartadas

1. **Cada consumer acessa Repository diretamente** — rejeitado por violar Lei de Demeter e criar espalhamento de consultas
2. **Camada de serviço genérica** — rejeitado por falta de tipagem forte e rastreabilidade
3. **GraphQL** — rejeitado por overhead desnecessário para o domínio atual
