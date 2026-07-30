# Desenvolvimento Local

## Pré-requisitos

- Node.js >= 18
- npm

## Instalação

```bash
cd frontend
npm install
```

## Executar

```bash
npm run dev
```

O servidor de desenvolvimento será iniciado em:

```
http://localhost:3000
```

## Rotas

| Rota | Descrição |
|------|-----------|
| `/` | Redireciona para `/dashboard` |
| `/login` | Tela de login |
| `/dashboard` | Dashboard Executivo |
| `/marketplace` | Monitoramento de marketplaces (em breve) |
| `/inventory` | Gerenciamento de estoque (em breve) |
| `/financial` | Painel financeiro (em breve) |
| `/products` | Gerenciamento de produtos (em breve) |
| `/ai` | Centro de inteligência artificial (em breve) |
| `/reports` | Relatórios (em breve) |
| `/settings` | Configurações (em breve) |
| `/playground` | Developer Playground — visualiza todos os componentes com controle de estados |

## Lint e Build

```bash
npm run lint    # ESLint
npm run build   # Production build
```

## Playground

O Developer Playground em `/playground` exibe todos os componentes do Dashboard em uma única página, com controle para alternar entre os estados:

- **Success** — dados mockados reais
- **Loading** — indicador de carregamento
- **Empty** — estado vazio
- **Error** — estado de erro

O controle afeta todos os componentes simultaneamente através do Developer Controls panel.

## Arquitetura

Os componentes consomem dados exclusivamente através do `DashboardDataLayer` (`src/features/dashboard/data/`). Nenhum componente importa mocks diretamente.
