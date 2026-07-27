# ADR-001 — Architecture Decision Record

## Royale AI Platform — Fundação Arquitetural

| Campo | Valor |
|---|---|
| **Data** | 2026-07-27 |
| **Autor** | Principal Engineer |
| **Status** | Proposto |
| **Decisão** | *Aguardando aprovação* |

---

## 1. Visão Geral

### 1.1 Objetivo da Plataforma

Centralizar, automatizar e inteligir a gestão completa do e-commerce da Royale Store, integrando todos os marketplaces (Mercado Livre, Shopee, Amazon, Magalu, TikTok Shop) e o ERP Bling em uma única plataforma de IA, analytics e automação.

### 1.2 Problema que Resolve

- Dados fragmentados entre ERP e marketplaces
- Processos manuais de conciliação, precificação e conteúdo
- Impossibilidade de aplicar IA com curadoria e segurança
- Inexistência de visão unificada de rentabilidade (CMV, margem real, curva ABC)
- Nenhuma rastreabilidade de decisões comerciais ou operacionais
- Escalabilidade comprometida por soluções artesanais (planilhas, scripts isolados)

### 1.3 Escopo

- Ingestão de dados de marketplaces e ERP
- Normalização, deduplicação e armazenamento centralizado
- Camada de analytics e BI (Power BI / Metabase)
- Módulos de IA com gateway restritivo (não acesso direto ao banco)
- Automação de conteúdo (títulos, descrições, imagens)
- Relatórios gerenciais e operacionais
- Scheduler para tarefas periódicas (sincronização, cálculo de indicadores)

### 1.4 Limites (Fora de Escopo Agora)

- E-commerce frontend (loja própria)
- CRM completo
- Gestão financeira completa (contas a pagar/receber)
- Marketplace próprio
- Aplicativo mobile

### 1.5 Não Objetivos

- Não substituir o Bling como ERP
- Não ser uma plataforma de vendas
- Não ser um data lake genérico (os dados têm curadoria e schema conhecido)

---

## 2. Arquitetura Geral

### 2.1 Decisão: Modular Monolith + Hexagonal (Ports & Adapters)

**Escolha:** Modular Monolith com arquitetura hexagonal (Ports & Adapters).

### 2.2 Justificativa Técnica

| Fator | Avaliação |
|---|---|
| **Time** | Único time, < 5 pessoas no primeiro ano |
| **Domínio** | Altamente coeso — marketplaces, ERP, analytics, IA são interdependentes |
| **Escalabilidade operacional** | Um deploy, um processo, observabilidade simples |
| **Evolução** | Cada módulo tem boundaries claras — extrair para microsserviço é trivial |
| **Latência** | Sem rede entre módulos — chamadas locais, sem serialização, sem fallbacks de rede |
| **Consistência** | Transações ACID reais entre módulos quando necessário |
| **Débito técnico** | Zero tolerância — Hexagonal força interfaces que previnem erosão |

### 2.3 Alternativas Descartadas

| Alternativa | Motivo da rejeição |
|---|---|
| **Microservices puro** | Complexidade prematura. Distributed transactions, service discovery, observabilidade distribuída, CI/CD multi-repo — o custo operacional supera o benefício para um time pequeno. Não há necessidade de escalar deployments independentes neste momento. |
| **Serverless** | Cold starts, limite de execução, estado efêmero, dificuldade de testes locais. Inviável para integrações longas (ETL) e processamento de IA. |
| **Layered Architecture (3 camadas)** | Conhecida, mas frágil. Um Service que chama outro Service leva ao acoplamento transversal. Sem Ports & Adapters, trocar implementação (ex: migrar banco) exige reescrita em N camadas. |
| **Clean Architecture clássica** | Camadas em excesso para o porte atual. O ganho real do Clean Architecture está nos Use Cases bem definidos — podemos adotar o conceito sem a rigidez dos 4 círculos. |

### 2.4 Benefícios da Arquitetura Escolhida

1. **Isolamento real entre módulos** — cada módulo exporta interfaces (Ports), não classes concretas
2. **Testabilidade** — Ports são naturalmente mockáveis
3. **Swap tecnológico** — Trocar PostgreSQL por outro banco? Troque o Adapter apenas
4. **Extraibilidade** — Um módulo hoje interno vira microsserviço amanhã: crie um Adapter HTTP que implementa o mesmo Port
5. **Clareza de dependências** — Sentido único: Core → Port (interface) ← Adapter (implementação)

### 2.5 Impactos Futuros

- Quando o time crescer (> 5 devs), módulos de alta contenção (ex: Integrações, IA) podem ser extraídos com segurança
- A comunicação cross-módulo via Ports permite substituir chamadas locais por eventos, filas ou RPC sem alterar o Core

---

## 3. Fluxo Completo dos Dados

```
┌─────────────────────────────────────────────────────────────────┐
│                        MARKETPLACES                             │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐  │
│  │  Bling  │ │  Mercado  │ │ Shopee │ │ Amazon │ │  TikTok  │  │
│  │  (ERP)  │ │   Livre  │ │        │ │        │ │   Shop   │  │
│  └────┬────┘ └────┬─────┘ └───┬────┘ └───┬────┘ └────┬─────┘  │
│       │           │           │          │           │         │
└───────┼───────────┼───────────┼──────────┼───────────┼─────────┘
        │           │           │          │           │
        ▼           ▼           ▼          ▼           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INTEGRATION ADAPTERS                          │
│  (Cada adapter implementa o Port IIntegrationChannel)           │
│  - Autenticação, rate-limit, retry, webhook, polling            │
│  - Normaliza payload para schema interno                        │
└─────────────────────────────────┬────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────┐
│                        ETL PIPELINE                              │
│  - Validação de schema                                          │
│  - Deduplicação por ID externo + marketplace                    │
│  - Enriquecimento (custos, frete, comissão)                     │
│  - Escrita no banco operacional (OLTP)                          │
│  - Disparo de eventos de domínio (Domain Events)                │
└──────────┬───────────────────────────────────────┬──────────────┘
           │                                       │
           ▼                                       ▼
┌──────────────────┐              ┌──────────────────────────────┐
│  DATABASE OLTP   │              │  EVENT BUS (in-memory →      │
│  PostgreSQL      │              │  depois RabbitMQ/Celery)     │
│  - Normalizado   │              │  - pedido_importado           │
│  - Transacional  │              │  - estoque_alterado           │
│  - FK entre      │              │  - preco_divergente           │
│    módulos       │              │  - indicador_calculado        │
└────────┬─────────┘              └───────────────┬──────────────┘
         │                                         │
         ▼                                         ▼
┌──────────────────┐              ┌──────────────────────────────┐
│  DATA WAREHOUSE  │              │  BUSINESS LAYER              │
│  PostgreSQL      │              │  - Calcula indicadores       │
│  (Schema Star)   │◄─────────────│  - CMV, Margem, ABC         │
│  - Desnormalizado│              │  - Regras de negócio         │
│  - Histórico     │              │  - Gatilha IA               │
│  - Analítico     │              └───────────────┬──────────────┘
└────────┬─────────┘                              │
         │                                        │
         ▼                                        ▼
┌──────────────────┐              ┌──────────────────────────────┐
│  ANALYTICS LAYER │              │  AI GATEWAY                  │
│  - Power BI      │              │  - API dedicada para IA     │
│  - Metabase      │              │  - Views permissionadas      │
│  - Reports Engine│              │  - Log de toda consulta      │
│  - Dashboard BI  │              │  - Rate limit por agente     │
└──────────────────┘              └───────────────┬──────────────┘
                                                   │
                                                   ▼
                                   ┌──────────────────────────────┐
                                   │  AI AGENTS                   │
                                   │  - Comercial (precificação)  │
                                   │  - Conteúdo (títulos/desc)  │
                                   │  - Analítica (insights)     │
                                   │  NUNCA acessam DB direto     │
                                   └──────────────────────────────┘
```

### 3.1 Sentido do Fluxo

1. **Marketplace → Adapter**: Cada marketplace tem um adapter específico que normaliza os dados para o schema interno da plataforma
2. **Adapter → ETL Pipeline**: O pipeline valida, deduplica, enriquece e persiste
3. **ETL → OLTP**: Dados operacionais normalizados
4. **ETL → Event Bus**: Eventos de domínio notificam o resto do sistema
5. **OLTP → DW**: Sincronização periódica (ou CDC futuramente) para o schema analítico
6. **Business Layer**: Consome OLTP + DW para calcular indicadores
7. **AI Gateway**: Camada restritiva — expõe apenas o que a IA pode ver
8. **IA → Gateway**: IA consulta via Gateway, recebe resposta controlada, envia decisões de volta
9. **Analytics/Reports**: Consomem DW para BI e dashboards

---

## 4. Organização em Módulos

### 4.1 Módulos e Responsabilidades

| Módulo | Responsabilidade | Depende de | Interfaces Expostas |
|---|---|---|---|
| **core** | Tipos compartilhados, value objects, exceções de domínio, interfaces base | Nenhum | - |
| **catalog** | Produtos, categorias, variações, atributos | core | IProductRepository, ICategoryRepository |
| **pricing** | Preços, regras de markup, promoções, divergência | core | IPriceRepository, IPricingEngine |
| **stock** | Estoque real, virtual, reserva, histórico | core | IStockRepository |
| **order** | Pedidos, itens, status, fulfillment | core, catalog, pricing | IOrderRepository |
| **financial** | Custos, CMV, comissões, impostos, margem | core, order | IFinancialRepository, ICostEngine |
| **integration** | Orquestração de integrações, scheduling, retry | core | IIntegrationOrchestrator |
| **bling** | Adapter Bling ERP | core, integration | BlingAdapter : IIntegrationChannel |
| **mercadolivre** | Adapter Mercado Livre | core, integration | MLAdapter : IIntegrationChannel |
| **shopee** | Adapter Shopee | core, integration | ShopeeAdapter : IIntegrationChannel |
| **amazon** | Adapter Amazon | core, integration | AmazonAdapter : IIntegrationChannel |
| **magalu** | Adapter Magalu | core, integration | MagaluAdapter : IIntegrationChannel |
| **tiktok** | Adapter TikTok Shop | core, integration | TikTokAdapter : IIntegrationChannel |
| **analytics** | Indicadores, DW sync, relatórios, curva ABC | core, financial, order, stock | IAnalyticsEngine |
| **ai-gateway** | Camada restritiva entre IA e dados | core, analytics | IAIGateway |
| **ai-agents** | Agentes de IA (comercial, conteúdo, analítico) | core, ai-gateway | - |
| **scheduler** | Tarefas agendadas, cron, Celery tasks | core, integration, analytics | IScheduler |
| **reports** | Geração de relatórios (PDF, CSV, XLSX) | core, analytics | IReportEngine |
| **api** | Endpoints REST (FastAPI) | todos os módulos via Ports | - |

### 4.2 Regra Fundamental

**Nenhum módulo importa implementação concreta de outro módulo.**

A comunicação entre módulos ocorre exclusivamente por:
- **Ports (interfaces)** definidas no módulo consumidor
- **Domain Events** para comunicação assíncrona
- **Commands** para ações orquestradas

### 4.3 Exemplo de Dependência

```
⚠️ PROIBIDO: from integrations.bling import BlingService
✅ CORRETO: from core.ports import IIntegrationChannel
```

---

## 5. Camadas da Aplicação

```
┌──────────────────────────────────────────────────────────────┐
│                      API LAYER                                │
│  FastAPI routers, middlewares, rate-limit, validação entrada  │
│  Depende de: Service Layer (via interfaces)                   │
│  Responsabilidade: HTTP → Controller → Service                │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    SERVICE LAYER                               │
│  Orquestração de casos de uso (Use Cases)                    │
│  Coordena múltiplos repositórios e serviços                  │
│  Depende de: Repository interfaces, Business Layer           │
│  Responsabilidade: "O que fazer" — não "como fazer"          │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                    BUSINESS LAYER                              │
│  Regras de negócio puras, entidades, value objects            │
│  Depende de: NADA (zero framework, zero infra)                │
│  Responsabilidade: "Como decidir" — Pure domain logic         │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                   REPOSITORY LAYER                             │
│  Interfaces (Ports) e implementações (Adapters)               │
│  SQLAlchemy, queries, cache, paginação                        │
│  Depende de: Persistence Layer                                │
│  Responsabilidade: "Como persistir e recuperar"               │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                  PERSISTENCE LAYER                             │
│  Database engine, migrations, connections, session factory    │
│  PostgreSQL, Redis                                            │
│  Responsabilidade: Gerenciar conexões e transações            │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                 INTEGRATION LAYER                              │
│  Adapters de external APIs (marketplaces, ERP)               │
│  HTTP clients, webhooks, polling, rate-limit                 │
│  Responsabilidade: "Como conversar com o mundo externo"      │
└──────────────────────────────┬───────────────────────────────┘
                               │
┌──────────────────────────────▼───────────────────────────────┐
│                  INFRASTRUCTURE LAYER                          │
│  Redis, Celery, S3/MinIO, email, filas                       │
│  Config, logging, observabilidade (OpenTelemetry)            │
│  Responsabilidade: Infraestrutura técnica compartilhada      │
└──────────────────────────────────────────────────────────────┘

         ┌──────────────────────────────────────┐
         │           AI LAYER                    │
         │  ┌────────────┐  ┌────────────────┐   │
         │  │ AI Gateway  │  │   AI Agents    │   │
         │  │ (Porta de   │  │ Comercial      │   │
         │  │  entrada)   │  │ Conteúdo       │   │
         │  │             │  │ Analítico      │   │
         │  └────────────┘  └────────────────┘   │
         │  Gateway NUNCA expõe DB direto.        │
         │  Só expõe views curadas.               │
         └──────────────────────────────────────┘
```

### 5.1 Regra de Dependência das Camadas

```
API → Service → Business (← Repository) → Persistence
                    ↘
               Integration / AI Gateway
```

- **API** depende de Service
- **Service** depende de Business + Repository (Ports)
- **Business** depende de NADA (pure Python)
- **Repository** depende de Persistence
- **Infrastructure** é injetada via DI (FastAPI Depends ou manual)

---

## 6. Banco de Dados

### 6.1 Estratégia: Dois Bancos + DW

#### 6.1.1 Banco Operacional (OLTP) — PostgreSQL

**Função:** Dados transacionais do dia a dia
- Schema normalizado (3ª forma normal)
- FK entre tabelas de diferentes módulos
- Índices para queries operacionais
- Transações ACID
- Backup a cada 6h

**Justificativa:** PostgreSQL é maturo, open source, suporta JSONB (para payloads de integração), extensões como PostGIS (futuro), e tem ecossistema de ferramentas maduro.

**Alternativa descartada:** MySQL — PostgreSQL vence em: índices parciais, CTEs, window functions, extensões, suporte a concorrência com MVCC superior.

#### 6.1.2 Banco Analítico + Data Warehouse — PostgreSQL (schema Star)

**Função:** Cálculo de indicadores, BI, histórico, relatórios
- Schema desnormalizado (Star Schema)
- Tabelas fato e dimensão
- Dados históricos (desde o início da plataforma)
- Sincronizado do OLTP via job agendado

**Por que não um DW separado (Redshift, BigQuery, ClickHouse)?**
- Custo operacional e financeiro desnecessário neste estágio
- PostgreSQL lida bem com datasets de até centenas de GB
- Quando crescer, podemos migrar o DW para ClickHouse (columnar, analítico) sem mudar a aplicação — o Repository troca de implementação

#### 6.1.3 Audit Log — Mesmo banco OLTP (tabela `audit_log`)

**Função:** Rastrear toda alteração relevante
- Quem, o quê, quando, valor anterior, valor novo
- Trigger-based ou application-based (recomendado: application-based com decorator)
- Retenção: 2 anos no banco, depois archive

### 6.2 Estrutura de Schemas (PostgreSQL)

```
┌─────────────────────────────────────────────────────────────┐
│  royale_platform (database)                                  │
│                                                              │
│  ┌─ public (reservado para extensões, UUID, etc)            │
│  ├─ operational (tabelas OLTP)                               │
│  │   ├─ catalog_products, catalog_categories                 │
│  │   ├─ pricing_prices, pricing_rules                       │
│  │   ├─ stock_items, stock_movements                        │
│  │   ├─ order_orders, order_items                           │
│  │   ├─ financial_costs, financial_margins                  │
│  │   └─ integration_sync_log, integration_webhooks          │
│  ├─ analytics (tabelas analíticas / DW)                      │
│  │   ├─ fact_sales, fact_stock_daily                        │
│  │   ├─ dim_product, dim_marketplace, dim_date              │
│  │   └─ agg_monthly_performance                             │
│  ├─ audit (logs de auditoria)                                │
│  │   └─ audit_log                                           │
│  ├─ ai (dados da IA — consultas, respostas, métricas)        │
│  │   └─ ai_queries, ai_responses, ai_feedback               │
│  └─ reports (relatórios gerados, cache)                     │
│      └─ report_cache, report_schedule                       │
└─────────────────────────────────────────────────────────────┘
```

### 6.3 Por que Schema Separado por Domínio?

1. **Isolamento** — Migrations independentes por schema
2. **Segurança** — Permissões por schema (GRANT por módulo)
3. **Clareza** — Cada módulo sabe exatamente onde estão seus dados
4. **Futuro** — Migrar um schema para outro banco é copiar o schema

---

## 7. Estratégia para Integrações

### 7.1 Princípio: Um Canal, Muitos Adaptadores

```python
# core/ports/integration.py


class IIntegrationChannel(ABC):
    """Port que todo adapter de marketplace DEVE implementar."""

    @abstractmethod
    async def fetch_orders(self, since: datetime) -> list[OrderDTO]: ...

    @abstractmethod
    async def fetch_products(self) -> list[ProductDTO]: ...

    @abstractmethod
    async def sync_stock(self, sku: str, quantity: int) -> bool: ...

    @abstractmethod
    async def update_price(self, sku: str, price: Decimal) -> bool: ...
```

### 7.2 Cada Adapter Implementa o Port

```
integrations/
├── bling/
│   └── adapter.py  # BlingAdapter(IIntegrationChannel)
├── mercadolivre/
│   └── adapter.py  # MercadoLivreAdapter(IIntegrationChannel)
├── shopee/
│   └── adapter.py  # ShopeeAdapter(IIntegrationChannel)
├── amazon/
│   └── adapter.py  # AmazonAdapter(IIntegrationChannel)
├── magalu/
│   └── adapter.py  # MagaluAdapter(IIntegrationChannel)
└── tiktok/
    └── adapter.py  # TikTokAdapter(IIntegrationChannel)
```

### 7.3 Injeção de Adaptadores

A Service Layer nunca sabe qual adapter específico está sendo usado:

```python
class IntegrationOrchestrator:
    def __init__(self, channels: dict[str, IIntegrationChannel]):
        self._channels = channels  # {"mercadolivre": MLAdapter(), ...}

    async def sync_all_orders(self):
        for marketplace, channel in self._channels.items():
            orders = await channel.fetch_orders(since=...)
            await self._pipeline.process(marketplace, orders)
```

### 7.4 Suporte a Novas Integrações

Para adicionar um novo marketplace:
1. Crie um novo diretório em `integrations/`
2. Implemente `IIntegrationChannel`
3. Registre no container de DI
4. **Zero alterações no core, no orchestrator, no pipeline**

### 7.5 Tratamento de Falhas

- **Retry com backoff exponencial** (configurado por adapter)
- **Circuit Breaker** para marketplaces com falha recorrente
- **Dead Letter Queue** para pedidos que não puderam ser processados após N tentativas
- **Webhook vs Polling**: Cada adapter decide. ML e Shopee têm webhook; Bling pode exigir polling

### 7.6 Alternativas Descartadas

- **Adapter por classe com if/else** — Viola Open/Closed Principle. Acrescentar um marketplace exige mudar código existente.
- **Herança de classe base** — Acoplamento forte. O adapter herda comportamento que pode não se aplicar. Prefira composição (Port) à herança.

---

## 8. Estratégia para IA

### 8.1 Regra de Ouro

> A IA NUNCA acessa o banco de dados diretamente. A IA NUNCA executa SQL. A IA NUNCA recebe credenciais de banco.

### 8.2 AI Gateway — Camada Restritiva

```
┌─────────────────────────────────────────────┐
│              AI GATEWAY API                   │
│  FastAPI (endpoints dedicados, sem exposição  │
│  pública, apenas rede interna)               │
│                                               │
│  Endpoints:                                   │
│  POST /gateway/query                          │
│  POST /gateway/analyze                        │
│  POST /gateway/suggest                        │
│  GET  /gateway/metrics                        │
│                                               │
│  Autenticação: API Key própria para cada      │
│  agente de IA (comercial, conteúdo, etc)      │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│           GATEWAY SERVICE LAYER               │
│  - Recebe a pergunta da IA                    │
│  - Monta a query curada contra o DW           │
│  - Executa a query (própria conexão)          │
│  - Formata a resposta (nunca o raw DB)        │
│  - Aplica regras de negócio (o que a IA       │
│    pode ou não ver)                           │
│  - Log de TUDO (quem perguntou, o quê,       │
│    quando, quanto tempo levou)                │
│  - Rate limit por agente                      │
│  - Limite de escopo (ex: IA de conteúdo       │
│    não vê dados financeiros)                  │
└──────────────────────┬──────────────────────┘
                       │
┌──────────────────────▼──────────────────────┐
│              AI AGENTS                         │
│  - AI Comercial: sugere preços, promoções     │
│  - AI Conteúdo: gera títulos, descrições     │
│  - AI Analítica: insights, detecção de        │
│    anomalias, previsão de demanda              │
│  - Cada agente tem sua API Key                │
│  - Cada agente tem seu escopo de dados        │
│  - Agentes NUNCA têm string de conexão        │
│  - Agentes NUNCA têm acesso a tabelas         │
└─────────────────────────────────────────────┘
```

### 8.3 Vantagens

1. **Segurança**: Mesmo que um agente de IA seja comprometido, o atacante só acessa o que o Gateway permite
2. **Auditoria**: Cada consulta da IA é logada com quem, quando, o quê, resposta
3. **Controle de qualidade**: Gateway pode rejeitar perguntas malformadas, aplicar limites de contexto, validar saída
4. **Independência de modelo**: Trocar GPT por Claude ou Llama? O Gateway não muda — só o adapter do modelo
5. **Rate limiting por agente**: IA de conteúdo não consome cota da IA comercial
6. **Caching**: Respostas frequentes podem ser cacheadas no Redis

### 8.4 Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| IA tenta enganar o Gateway (prompt injection) | Média | Alto | Sanitização, limite de escopo, validação de saída, logging |
| Gateway vira gargalo | Baixa | Médio | Cache, assíncrono para queries pesadas, pool de conexões |
| Modelo alucina dados financeiros | Alta | Crítico | Gateway sempre retorna dados reais + "confiança"; IA apenas sugere, não decide |

### 8.5 Decisão de Design

**A IA sugesta, não executa.** Nenhuma decisão da IA é aplicada automaticamente sem revisão humana ou regra explícita. Toda ação da IA é registrada como "sugestão" e requer aprovação (manual ou automática por regra).

---

## 9. Estratégia de Analytics

### 9.1 Princípios

1. **Regra única**: Cada indicador é calculado em UM lugar (a Analytics Engine). Nenhum módulo recalcula CMV, margem, ABC.
2. **Fonte da verdade**: DW é a única fonte para indicadores. OLTP é para transações.
3. **Materializado vs. Sob Demanda**: Indicadores de alta frequência (estoque diário) são materializados em agregações. Indicadores sob demanda (lucro de um pedido específico) são calculados no momento.

### 9.2 Indicadores e Fonte

| Indicador | Fonte | Cálculo | Frequência |
|---|---|---|---|
| **CMV** | financial_costs + order_items | Custo do produto + frete + comissão + imposto | Por pedido |
| **Margem Bruta** | financial_margins | (Receita - CMV) / Receita | Por pedido + agregado diário |
| **Margem Líquida** | financial_margins | Margem Bruta - taxas marketplace | Por pedido + agregado mensal |
| **Curva ABC** | analytics.fact_sales | Agregação por produto (80/15/5) | Diária |
| **Ticket Médio** | analytics.fact_sales | Receita total / Número de pedidos | Diária, semanal, mensal |
| **Giro de Estoque** | analytics.fact_stock_daily | Vendas / Estoque médio | Mensal |
| **Previsão de Demanda** | analytics (IA) | Modelo estatístico + ML | Semanal |
| **Lucro por SKU** | financial_margins | Receita - CMV - custos fixos rateados | Mensal |

### 9.3 Evitando Duplicação

```python
# analytics/engine.py  ← ÚNICO lugar que calcula CMV


class AnalyticsEngine:
    def calculate_cmv(self, order_id: UUID) -> Decimal:
        # Regra de CMV centralizada aqui
        ...

    def calculate_margin(self, order_id: UUID) -> Decimal:
        cmv = self.calculate_cmv(order_id)  # Reusa o mesmo cálculo
        ...
```

**Regra:** Se dois módulos precisam do mesmo indicador, ambos chamam a Analytics Engine. Nenhum recalcula.

---

## 10. Estratégia de Segurança

### 10.1 Segredos e Variáveis de Ambiente

- **Nunca** em código fonte
- **Nunca** em arquivos de configuração versionados
- **Apenas** em variáveis de ambiente ou vault (HashiCorp Vault / AWS Secrets Manager futuramente)
- Arquivo `.env.example` versionado com valores dummy

### 10.2 Tokens de Integração

- Criptografados em repouso no banco (tabela `integration_credentials`)
- Chave de criptografia mestra em variável de ambiente
- Decript apenas no momento do uso, pelo adapter específico
- Log de every decrypt attempt (quem, quando, qual marketplace)

### 10.3 Permissões e Acesso

- **API Layer**: Rate limiting global + por endpoint
- **AI Gateway**: API Key por agente, escopo por agente
- **Admin**: Para operações sensíveis (ex: recalcular CMV manualmente)
- **Leitura**: Power BI / Metabase acessam apenas schema `analytics` (read-only)

### 10.4 Criptografia

- Em trânsito: TLS 1.3
- Em repouso: AES-256 para tokens e credenciais
- Hash de senhas: bcrypt (se houver autenticação futura)

### 10.5 Logs e Auditoria

- Toda alteração em dados sensíveis (preço, custo, estoque) é auditada
- Toda consulta da IA é logada
- Logs de segurança (tentativa de acesso negado, token inválido) têm nível WARNING

---

## 11. Estratégia de Configuração

### 11.1 Ambientes

| Ambiente | Propósito | Banco | Log Level |
|---|---|---|---|
| **dev** | Desenvolvimento local | PostgreSQL local | DEBUG |
| **homolog** | Testes de integração e aceitação | PostgreSQL staging | INFO |
| **prod** | Produção | PostgreSQL produção | WARNING |

### 11.2 Configuração por Ambiente

```python
# core/config/__init__.py


class Settings(BaseSettings):
    ENVIRONMENT: str = "dev"  # dev | homolog | prod
    DEBUG: bool = False

    # Database
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"

    # Security
    ENCRYPTION_KEY: str
    AI_GATEWAY_API_KEY: str

    # Marketplaces (credenciais em secrets vault, não aqui)
    ...
```

- Uso do **Pydantic Settings** (validação automática, type coercion, suporte a `.env`)
- `.env` carregado automaticamente no ambiente dev
- Em produção: variáveis de ambiente reais (Docker/Kubernetes)

### 11.3 Versionamento

- `settings.base.yaml` para defaults
- `settings.{env}.yaml` para overrides (nunca versionado com secrets)
- Feature flags em banco (tabela `feature_flags`) ou Redis

---

## 12. Estratégia de Logs

### 12.1 Formato Estruturado (JSON)

Não logs soltos. Cada log entry é um JSON válido para ingestão por ferramentas de observabilidade.

```json
{
  "timestamp": "2026-07-27T10:30:00.123Z",
  "level": "INFO",
  "module": "integrations.mercadolivre",
  "correlation_id": "abc-123-def",
  "message": "Pedidos sincronizados com sucesso",
  "extra": {
    "marketplace": "mercadolivre",
    "orders_count": 42,
    "duration_ms": 1250
  }
}
```

### 12.2 Níveis

| Nível | Uso |
|---|---|
| **DEBUG** | Desenvolvimento apenas. Struct de request/response, detalhes de ETL |
| **INFO** | Operação normal: sincronização concluída, indicador calculado, pedido processado |
| **WARNING** | Anomalia não crítica: rate limit próximo, divergência de preço, retry |
| **ERROR** | Falha recuperável: falha de integração após retries, falha de cálculo |
| **CRITICAL** | Falha irrecuperável: banco indisponível, erro de configuração, crash |

### 12.3 Rastreabilidade (Correlation ID)

- **Toda requisição HTTP** recebe um `correlation_id` (UUID) via middleware
- **Toda task do Celery** recebe o mesmo ID da requisição que a agendou (se houver)
- **Toda consulta da IA** loga o mesmo ID para rastrear: requisição → gateway → resposta
- Logs sem correlation_id são **rejeitados** em produção (configurável)

### 12.4 Ferramentas de Observabilidade

- **OpenTelemetry** para tracing distribuído (preparação para futuro)
- **Prometheus + Grafana** para métricas (a partir da Sprint 2)
- Logs em stdout (Docker-friendly), coletados pelo Docker ou sistema de log

---

## 13. Estratégia de Testes

### 13.1 Pirâmide de Testes

```
        ╱╲
       ╱ E2E ╲           ~5%  (crítico: fluxo completo de pedido)
      ╱────────╲
     ╱ Integration ╲    ~25% (adapters, repositórios, endpoints)
    ╱────────────────╲
   ╱   Unit (pure)    ╲  ~70% (business layer, value objects, regras)
  ╱──────────────────────╲
```

### 13.2 Estratégia por Camada

| Camada | Tipo | Ferramenta | O que testar |
|---|---|---|---|
| **Business** | Unitário | pytest | Regras de negócio puras (sem infra) |
| **Repository** | Integração | pytest + testcontainers | SQL, queries, mapeamento |
| **Service** | Unitário + Integração | pytest + mock | Orquestração, coordenação |
| **Adapter** | Integração | pytest + responses (HTTP mock) | Chamadas externas, retry, timeout |
| **API** | Integração | pytest + httpx AsyncClient | Status, validação, serialização |
| **E2E** | End-to-end | pytest + Docker Compose | Fluxo completo marketplace → BD → analytics |

### 13.3 Mocks vs. Reais

- **Business layer**: Zero mocks. Testes com dados reais, sem infraestrutura.
- **Service layer**: Mocks apenas nos Ports (interfaces). Testa lógica de orquestração.
- **Repository layer**: Testcontainers com PostgreSQL real. NUNCA mock de banco.
- **Adapters**: `responses` ou `httpx_mock` para simular HTTP. Testa parsing, retry, erros.

### 13.4 Cobertura Mínima

- Business layer: 95%+
- Service layer: 90%+
- Repository layer: 85%+
- Adapters: 80%+
- API layer: 90%+
- **Geral: 85%+**

### 13.5 Fixtures Compartilhadas

- `conftest.py` por módulo
- Fixtures globais em `tests/conftest.py` (DB session, Redis mock, settings)

---

## 14. Convenções

### 14.1 Nomes de Arquivos e Pastas

| Contexto | Convenção | Exemplo |
|---|---|---|
| Módulos | snake_case | `mercadolivre/`, `ai_gateway/` |
| Arquivos Python | snake_case | `order_service.py`, `price_rule.py` |
| Testes | `test_` prefixo | `test_order_service.py` |
| Schemas (Pydantic) | snake_case | `order_schema.py`, `product_dto.py` |
| Migrations | timestamp_desc | `20260727_initial_schema.py` |

### 14.2 Classes e Funções

| Contexto | Convenção | Exemplo |
|---|---|---|
| Classes | PascalCase | `OrderService`, `MercadoLivreAdapter` |
| Funções/Métodos | snake_case | `calculate_margin()`, `fetch_orders()` |
| Variáveis | snake_case | `order_id`, `total_amount` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT` |
| Interfaces (Ports) | `I` prefixo | `IOrderRepository`, `IIntegrationChannel` |
| Abstrações (ABC) | `ABC` sufixo não necessário | `class IOrderRepository(ABC)` |

### 14.3 Banco de Dados

| Contexto | Convenção | Exemplo |
|---|---|---|
| Tabelas | snake_case plural | `order_orders`, `financial_costs` |
| Colunas | snake_case | `product_id`, `total_amount` |
| PK | `id` (UUID) | `id UUID PRIMARY KEY` |
| FK | `{tabela}_id` | `product_id UUID REFERENCES catalog_products(id)` |
| Índices | `idx_{tabela}_{coluna}` | `idx_orders_created_at` |
| Timestamps | `created_at`, `updated_at` | Com timezone |

### 14.4 Commits (Conventional Commits)

```
feat: add Mercado Livre integration adapter
fix: correct CMV calculation for orders with multiple items
refactor: extract pricing rules to dedicated module
test: add unit tests for analytics engine
docs: add ADR-001 architecture decision record
chore: update dependencies
```

### 14.5 Branches

```
main              → Produção
develop           → Integração
feature/{modulo}  → Features (ex: feature/bling-integration)
fix/{descricao}   → Bugfixes
release/v*        → Releases
```

---

## 15. Riscos Arquiteturais

### 15.1 Matriz de Riscos

| # | Risco | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| R01 | **Monolith cresce demais e vira "big ball of mud"** | Média | Alto | Boundaries rígidas via Ports. CI/CD com análise de dependência circular. Revisão arquitetural a cada 3 meses. |
| R02 | **Módulos começam a ignorar Ports e importar direto** | Alta | Alto | Code review obrigatório. Linter personalizado (ou `import-linter`) que proíbe imports entre módulos. Teste de arquitetura. |
| R03 | **Performance do PostgreSQL analítico degrada com crescimento** | Média | Médio | Particionamento por data, materialized views, índices. Quando necessário, migrar DW para ClickHouse. |
| R04 | **Adapters de marketplace quebram por mudança na API externa** | Alta | Alto | Testes de integração com cassete (VCR). Alertas de falha. Circuit breaker. Timeout configurável. |
| R05 | **Prompt injection na camada de IA** | Média | Crítico | AI Gateway sanitiza entrada e saída. Auditoria total. IA sugere, não executa. |
| R06 | **Perda de eventos por falha no Event Bus** | Baixa | Alto | Começar com eventos síncronos (in-memory). Evoluir para RabbitMQ/Celery com persistência. Dead letter queue desde o início. |
| R07 | **Configuração vaza segredo para o código** | Baixa | Crítico | `.env` em `.gitignore`. Revisão de CI/CD para secrets. Precommit hook que detecta secrets. |
| R08 | **Cálculo de indicadores duplicado entre módulos** | Alta | Médio | Analytics Engine é fonte única. Teste de integração que verifica consistência. |
| R09 | **Tempo de build/deploy aumenta com o monolith** | Baixa | Baixo | Build incremental. Cache de Docker layers. Se crítico, extrair módulo de maior impacto para serviço separado. |
| R10 | **Débito técnico de "vou fazer rápido agora, arrumo depois"** | Alta | Crítico | Zero tolerância. Review rejeita PR que introduz dívida técnica. Definição de "pronto" inclui testes e documentação. |

---

## 16. Roadmap Técnico

### Sprint 0 (Atual) — Fundação Arquitetural

- [x] ADR-001 aprovado
- [ ] Estrutura de diretórios e módulos
- [ ] Configuração do projeto (pyproject.toml, settings)
- [ ] CI/CD básico (lint + testes)
- [ ] Docker Compose (PostgreSQL, Redis, app)
- [ ] Settings + Config
- [ ] Logging estruturado
- [ ] Core module (Ports, Value Objects, Exceptions)
- [ ] Database connection + session factory
- [ ] Test infrastructure (conftest, fixtures, testcontainers)

### Sprint 1 — Integração Bling + Base Operacional

- [ ] Módulo `bling`: adapter implementando IIntegrationChannel
- [ ] Módulo `catalog`: schemas, repositório, serviço
- [ ] Módulo `order`: schemas, repositório, serviço
- [ ] ETL pipeline (Bling → OLTP)
- [ ] Testes de integração Bling
- [ ] Scheduler para sincronização periódica

### Sprint 2 — Analytics + DW

- [ ] Star Schema (fact_sales, dim_product, dim_date)
- [ ] Analytics Engine (CMV, Margem, Ticket Médio)
- [ ] Job de sincronização OLTP → DW
- [ ] Curva ABC
- [ ] Relatórios básicos
- [ ] Conexão Metabase / Power BI

### Sprint 3 — Mercado Livre + Shopee

- [ ] Módulo `mercadolivre`: adapter
- [ ] Módulo `shopee`: adapter
- [ ] ETL pipeline multi-marketplace
- [ ] Deduplicação de pedidos entre marketplaces
- [ ] Conciliação financeira por marketplace
- [ ] Testes de integração

### Sprint 4 — Amazon + Magalu + TikTok

- [ ] Módulo `amazon`: adapter
- [ ] Módulo `magalu`: adapter
- [ ] Módulo `tiktok`: adapter
- [ ] Dashboard BI com todos os marketplaces
- [ ] Relatórios gerenciais

### Sprint 5 — AI Gateway + Agentes

- [ ] AI Gateway (API + service layer)
- [ ] Agente Comercial (precificação)
- [ ] Agente de Conteúdo (títulos e descrições)
- [ ] Logging e auditoria de IA
- [ ] Validação de sugestões da IA

### Sprint 6 — Automação + Refinamento

- [ ] Automação de conteúdo (imagens, SEO)
- [ ] Regras automáticas de precificação
- [ ] Alerta de divergência
- [ ] Previsão de demanda (IA Analítica)
- [ ] Performance tuning
- [ ] Testes E2E
- [ ] Documentação final

### Sprint 7 — Produção

- [ ] Hardening de segurança
- [ ] Stress test
- [ ] Disaster recovery
- [ ] Playbook de operação
- [ ] Deploy em produção
- [ ] Monitoramento (Grafana + Prometheus)
- [ ] Suporte pós-deploy

---

## Recomendação Final do Arquiteto

**DECISÃO: APROVADO, com ressalvas.**

### Aprovação

A arquitetura proposta (Modular Monolith + Hexagonal + Domain-Driven Design) é a mais adequada para a realidade do projeto:

- Um time pequeno
- Domínio coeso mas internamente complexo
- Necessidade de evolução por anos
- Zero tolerância a débito técnico

### Ressalvas

1. **Disciplina de equipe**: Esta arquitetura SÓ funciona se todos seguirem as regras. Um único PR que importe implementação concreta de outro módulo quebra o isolamento. Code review rigoroso É obrigatório, não opcional.

2. **Documentação viva**: ADR-001 deve ser revisitado a cada 3 meses ou quando uma decisão arquitetural for desafiada.

3. **Testes de arquitetura**: Implementar teste automatizado que verifica imports entre módulos (ex: `import-linter` ou `pytest-arch`). Uma PR que viola o isolamento DEVE falhar no CI.

4. **Performance**: O PostgreSQL analítico vai funcionar bem até certo volume. Definir métrica de alerta: quando `fact_sales` ultrapassar 50 milhões de linhas, iniciar migração do DW para ClickHouse.

5. **Eventual evolução para microsserviços**: Não forçar agora. Monitorar os boundaries. Se um módulo começar a ser alterado em toda sprint, é candidato a extração.

### Pendências Antes da Sprint 1

1. ✅ ADR-001 finalizado e aprovado
2. ⌛ Definição de qual será a ferramenta de observabilidade (Grafana + Prometheus? Datadog? New Relic?)
3. ⌛ Escolha do provedor de infraestrutura inicial (VPS? AWS? DigitalOcean?)
4. ⌛ Definição da estratégia de backup e disaster recovery
5. ⌛ Setup do repositório Git e branch protection rules

---

*Este documento é a Constituição da Royale AI Platform. Qualquer decisão arquitetural futura deve ser registrada como ADR-NNN e referenciar este documento.*