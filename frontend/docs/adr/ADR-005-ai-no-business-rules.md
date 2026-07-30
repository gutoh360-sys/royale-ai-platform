# ADR-005: IA não contém regra de negócio

## Status

Aprovado e implementado (PR #057)

## Problema

Em muitos sistemas, regras de negócio vazam para prompts de IA ou para provedores de LLM, criando lógica invisível, não testável e não versionada. Isso viola os princípios de DDD e torna o comportamento do sistema imprevisível.

## Decisão

Estabelecer que IA (quando integrada) NUNCA conterá regras de negócio:
- Todo prompt deve usar APENAS dados fornecidos no input
- Nenhum cálculo, classificação, threshold ou recomendação pode ser criado pela IA
- A IA é apenas um formatador textual de dados já processados
- A validação é feita pelo FactualityGuard (determinístico, sem IA)
- O Prompt Safety Contract documenta as restrições obrigatórias
- O provider concreto de IA é intercambiável (abstração via interface)

## Consequências

- Positivas: Regras de negócio permanecem no domínio, testáveis e versionadas
- Positivas: Trocar de provider de IA não altera comportamento do sistema
- Positivas: Narrativa é sempre factual e rastreável
- Positivas: FactualityGuard funciona sem depender de outra IA
- Negativas: Narrativa pode ser menos "fluida" (intencional — segurança > estética)

## Alternativas Descartadas

1. **Injetar regras de negócio no prompt** — rejeitado por criar lógica invisível e não testável
2. **FactualityGuard baseado em LLM** — rejeitado por depender de IA para validar IA (recursão)
3. **Sem validação de saída** — rejeitado por risco de alucinação sem detecção
