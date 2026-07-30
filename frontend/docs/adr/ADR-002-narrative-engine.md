# ADR-002: Executive Narrative Engine

## Status

Aprovado e implementado (PR #057)

## Problema

Consumer precisavam de descrições textuais de insights, mas não havia separação entre dados estruturados e narrativa gerada. Riscos: IA podia inferir causalidade, criar recomendações ou inventar dados.

## Decisão

Criar o ExecutiveNarrativeEngine como camada exclusivamente textual que:
- Consome apenas DTOs estruturados (ExecutiveNarrativeInput)
- Delega geração a provider abstrato (ExecutiveNarrativeProvider)
- Possui fallback determinístico (TemplateProvider)
- Valida saída com FactualityGuard
- Nunca acessa Repository, Timeline ou engines de domínio

## Consequências

- Positivas: Narrativa factual e rastreável
- Positivas: Provider abstrato permite troca de implementação sem impacto no domínio
- Positivas: TemplateProvider permite testes sem API key
- Positivas: FactualityGuard pega violações de fidelidade
- Negativas: Narrativa limitada aos dados fornecidos (intencional — sem inferência)
- Negativas: TemplateProvider produz texto básico (adequado para fallback)

## Alternativas Descartadas

1. **IA gera narrativa diretamente** — rejeitado por falta de controle sobre alucinação
2. **Narrativa embutida no ExecutiveInsight** — rejeitado por misturar dados estruturados com texto gerado
3. **Sem camada narrativa** — rejeitado por forçar cada consumer a implementar sua própria lógica textual
