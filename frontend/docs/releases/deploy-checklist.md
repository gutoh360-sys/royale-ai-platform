# Deploy Checklist — Executive Insight Platform v1.0.0

## Pré-deploy

- [ ] Lint passou (`npm run lint`) — 0 erros
- [ ] Testes passaram (`npm run test`) — 621 testes, 35 arquivos
- [ ] Build passou (`npm run build`) — Compilado + TypeScript + páginas estáticas
- [ ] Nenhum console.log, debugger, TODO ou FIXME no código
- [ ] Nenhum `.only` ou `.skip` nos testes
- [ ] Variáveis de ambiente configuradas
- [ ] `.env` não está versionado
- [ ] `.env.example` existe (se aplicável)

## Deploy

- [ ] Tag da release criada (`v1.0.0`)
- [ ] CHANGELOG.md atualizado
- [ ] Release notes geradas
- [ ] Backup do estado atual (se aplicável)
- [ ] Migrações executadas (se existirem)
- [ ] Build de produção gerado (`npm run build`)

## Pós-deploy

- [ ] Smoke test no ambiente de produção
- [ ] Rotas executivas funcionando:
  - [ ] `/executive-copilot`
  - [ ] `/copilot`
  - [ ] `/dashboard`
- [ ] Testes de regressão executados
- [ ] Monitoramento ativo

## Rollback

- [ ] Última tag estável identificada
- [ ] Comando de rollback documentado:
  ```bash
  git checkout tags/<ultima-tag-estavel>
  npm run build
  npm run start
  ```
- [ ] Backup de dados disponível (se aplicável)

## Observações

- Nenhuma migration é necessária para esta release
- Nenhuma variável de ambiente secreta é necessária
- O build é puramente estático (Next.js SSG)
