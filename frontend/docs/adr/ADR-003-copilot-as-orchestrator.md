# ADR-003: Copilot como Orquestrador

## Status

Aprovado e implementado (PR #058)

## Problema

O Executive Copilot acessava diretamente serviços de inteligência de módulo (InventoryIntelligence, SalesIntelligence, etc.), criando acoplamento direto e duplicação de lógica de consulta. Cada módulo expunha dados em formatos diferentes.

## Decisão

Transformar o Executive Copilot em orquestrador puro:
- Criar CopilotExecutiveFacade como ponte oficial para a Intelligence Platform
- Copilot consome exclusivamente ExecutiveIntelligenceEngine e ExecutiveNarrativeEngine
- Nenhum acesso direto a Repository, Timeline, Lifecycle, Builders ou módulos executivos
- Toda consulta passa pela camada de inteligência

## Consequências

- Positivas: Copilot não tem regras de negócio de domínio
- Positivas: Toda inteligência executiva centralizada
- Positivas: Fonte de verdade única para Dashboard, Copilot e Narrative
- Positivas: Facade pode evoluir sem impactar o Copilot
- Negativas: Facade depende da Intelligence Engine (já estabelecida)

## Alternativas Descartadas

1. **Manter acesso direto a módulos** — rejeitado por violar princípio de fonte única de verdade
2. **Copilot chama Narrative Engine diretamente sem facade** — rejeitado por expor detalhes de implementação
3. **Unificar Copilot e Intelligence Engine** — rejeitado por confundir responsabilidades
