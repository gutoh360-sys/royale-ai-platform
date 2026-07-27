# ADR-002 — Technical Foundation

## Royale AI Platform — Fundação Técnica

| Campo | Valor |
|---|---|
| **Data** | 2026-07-27 |
| **Autor** | Principal Engineer / Cloud Architect |
| **Status** | Proposto |
| **Decisão** | *Aguardando aprovação* |
| **Referência** | ADR-001 — Architecture Decision Record |

---

## 1. Estratégia de Ambiente

### 1.1 Três Ambientes, Três Propósitos

| Ambiente | Propósito | Banco | Log Level |
|---|---|---|---|
| **dev** | Desenvolvimento local | PostgreSQL local (Docker) | DEBUG |
| **homolog** | Testes de integração/aceitação | PostgreSQL staging | INFO |
| **prod** | Produção | PostgreSQL gerenciado | WARNING |

### 1.2 Configuração por Ambiente

Camadas de configuração:
1. `settings/base.py` — defaults compartilhados
2. `settings/{environment}.py` — overrides por ambiente
3. Variáveis de ambiente — sobrescrevem tudo, segredos nunca em arquivo

### 1.3 Segredos

| Ambiente | Onde ficam os secrets |
|---|---|
| dev | `.env` local (não versionado) |
| homolog | GitHub Actions Secrets + `.env` no servidor |
| prod | HashiCorp Vault (futuro) ou ENV do container |

**Regra:** Nenhum secret em código. `.env` em `.gitignore`.

---

## 2. Docker

### 2.1 Estratégia

**Dev:** Docker Compose com bind mounts para hot reload.
**Prod:** Multi-stage build com imagem mínima (slim).

### 2.2 Serviços (Compose)

| Serviço | Imagem | Propósito |
|---|---|---|
| **api** | python:3.12-slim | FastAPI |
| **worker** | python:3.12-slim | Celery worker |
| **beat** | python:3.12-slim | Celery beat (scheduler) |
| **postgres** | postgres:16-alpine | Banco operacional + DW |
| **redis** | redis:7-alpine | Cache + fila Celery |
| **minio** | minio/minio | Storage S3-compatível (dev) |

### 2.3 Volumes

| Volume | Container | Propósito |
|---|---|---|
| `pgdata` | postgres | Persistência do banco |
| `redisdata` | redis | Persistência do cache |
| `minio_data` | minio | Armazenamento de arquivos |
| `./backend` | api (bind) | Hot reload em dev |

### 2.4 Multi-stage Build (Produção)

```
Stage 1: builder — copia requirements, instala dependências
Stage 2: runtime — python:3.12-slim, copia site-packages + código, usuário não-root
```

### 2.5 Diretrizes

- Imagem base: `python:3.12-slim` (menor superfície de ataque)
- Apenas dependências de sistema necessárias (libpq, curl para healthcheck)
- Usuário `appuser` (nunca root)
- HEALTHCHECK instruction no Dockerfile
- Labels OCI (org.opencontainers.image.*)

---

## 3. Dependency Management

### 3.1 Decisão: uv (Astral)

**Escolha:** `uv` — gerenciador de dependências em Rust, do mesmo criador do Ruff.

### 3.2 Justificativa

| Critério | uv | Poetry | pip |
|---|---|---|---|
| Velocidade | 10-100x mais rápido | Lento | Lento |
| Resolução | Pubgrub (rápido) | Sim | Manual |
| Lock file | uv.lock | poetry.lock | requirements.txt |
| Compatibilidade pip | Total | Parcial | N/A |

### 3.3 Por que não Poetry?

- Resolução lenta para projetos com muitas dependências
- Incompatibilidades com pacotes que usam setup.py dinâmico
- Em 2026, uv é o padrão da comunidade para novos projetos Python

### 3.4 Estrutura

```
pyproject.toml       # Metadados + tool configs
uv.lock              # Lock file (versionado)
requirements/
  base.txt           # Dependências comuns
  dev.txt            # Dev-only
```

### 3.5 Comandos

```bash
uv sync             # Instalar dependências
uv add fastapi      # Adicionar dependência
uv run pytest       # Executar no venv
uv lock             # Atualizar lock
```

---

## 4. Configuração

### 4.1 Organização

```
core/
  config/
    __init__.py       # Exporta get_settings() lazy
    base.py           # Pydantic BaseSettings
    dev.py            # Dev overrides
    homolog.py        # Homolog overrides
    prod.py           # Prod overrides
  constants.py        # Constantes do domínio
```

### 4.2 Pydantic Settings v2

```python
class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    ENVIRONMENT: str = "dev"
    DEBUG: bool = True
    DATABASE_URL: str
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    ENCRYPTION_KEY: str
    JWT_SECRET_KEY: str
    STORAGE_BACKEND: str = "local"
    STORAGE_LOCAL_PATH: str = "./storage"
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None
    S3_BUCKET_NAME: str = "royale-platform"
    AI_GATEWAY_API_KEY: str
    OPENAI_API_KEY: str | None = None
    OPENAI_MODEL: str = "gpt-4o"
    RATE_LIMIT_PER_MINUTE: int = 60
```

---

## 5. Dependency Injection

### 5.1 Decisão: FastAPI Depends + Factory para Celery

| Contexto | Estratégia |
|---|---|
| **API (FastAPI)** | `Depends()` nativo |
| **Celery tasks** | Factory functions |
| **Testes** | `app.dependency_overrides` |

### 5.2 Por que não dependency-injector?

FastAPI já tem DI embutido. `dependency-injector` adiciona complexidade sem benefício real para modular monolith. Factory explícita é mais testável que container com magia.

### 5.3 Padrão

```python
# API: Depends nativo
@app.get("/products")
async def list_products(
    service: IProductService = Depends(get_product_service),
    session: AsyncSession = Depends(get_session),
): ...


# Celery: factory function
def create_order_service() -> IOrderService:
    settings = Settings()
    session = create_session(settings)
    return OrderService(PostgresOrderRepository(session), session)


# Testes: override
app.dependency_overrides[get_product_service] = lambda: MockProductService()
```

---

## 6. Banco de Dados

### 6.1 Stack

| Componente | Tecnologia | Motivo |
|---|---|---|
| ORM | SQLAlchemy 2.0 (async) | Padrão de fato |
| Migrations | Alembic | Único maduro para SQLAlchemy |
| Driver | asyncpg | 2x mais rápido que psycopg2 |
| Pool | SQLAlchemy pool | Nativo do engine |

### 6.2 Connection Pool

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=10,  # Conexões fixas
    max_overflow=20,  # Máximo em pico (30 total)
    pool_pre_ping=True,  # Verifica antes de usar
    pool_recycle=3600,  # Recicla após 1h
)
```

### 6.3 Sessions

```python
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
```

### 6.4 Transactions

- Automáticas (commit no fim da request)
- `session.begin()` para operações manuais multi-etapa
- Savepoints para rollback parcial

### 6.5 Migrations (Alembic)

```
backend/
  alembic/
    env.py
    versions/       # Migration files
    script.py.mako  # Template
  alembic.ini
```

Regras:
- Uma migration por Sprint, não por alteração
- Rollback sempre testado antes do deploy
- Nunca editar migration já aplicada em homolog/prod
- Naming: `{YYYYMMDD}_{descricao}.py`

### 6.6 Seeds

`backend/database/seeds/` — carga inicial de dados (categorias, regras de markup). Nunca usar como fonte de dados de produção.

---

## 7. Cache

### 7.1 Stack

- Servidor: Redis 7.x
- Cliente: `redis-py` (async)
- Serialização: JSON (`orjson` para performance)

### 7.2 O que será cacheado

| Dado | TTL | Invalidação |
|---|---|---|
| Produtos mais vendidos | 5 min | TTL |
| Curva ABC | 1h | TTL + evento de venda |
| Indicadores financeiros | 15 min | TTL |
| Config de integrações | 5 min | Evento de alteração |
| Feature flags | 60s | TTL |

### 7.3 O que NÃO será cacheado

- Pedidos individuais (consistência forte)
- Estoque de SKUs específicos (real-time)
- Preços (mudam com frequência)

### 7.4 Abstração

```python
class ICacheService(ABC):
    async def get(self, key: str) -> Any | None: ...
    async def set(self, key: str, value: Any, ttl: int = 300) -> None: ...
    async def delete(self, pattern: str) -> None: ...
```

---

## 8. Storage

### 8.1 Interface Abstrata

```python
class IStorageBackend(ABC):
    async def save(self, path: str, content: bytes) -> str: ...
    async def read(self, path: str) -> bytes: ...
    async def delete(self, path: str) -> None: ...
    async def exists(self, path: str) -> bool: ...
```

### 8.2 Implementações

| Ambiente | Backend |
|---|---|
| dev | `LocalStorage` (sistema de arquivos) |
| homolog | `S3Storage` (MinIO) |
| prod | `S3Storage` (AWS S3 / CloudFlare R2) |

### 8.3 Compatível com

AWS S3, MinIO, CloudFlare R2, DigitalOcean Spaces — qualquer S3-compatible.

---

## 9. Observabilidade

### 9.1 Stack

| Componente | Tecnologia |
|---|---|
| Tracing | OpenTelemetry |
| Métricas | Prometheus |
| Visualização | Grafana |
| Health Checks | FastAPI endpoints customizados |
| Logs | structlog + JSON |

### 9.2 OpenTelemetry

```python
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.sdk.trace import TracerProvider

tracer_provider = TracerProvider()
tracer_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(tracer_provider)
FastAPIInstrumentor.instrument_app(app)
```

### 9.3 Métricas Prometheus

| Métrica | Tipo |
|---|---|
| `http_requests_total` | Counter |
| `http_request_duration_seconds` | Histogram |
| `db_query_duration_seconds` | Histogram |
| `celery_tasks_total` | Counter |
| `cache_hit_ratio` | Gauge |

### 9.4 Health Checks

```python
GET / health / readiness  # App está pronta para tráfego?
GET / health / liveness  # App está viva?
GET / health / startup  # Inicialização completa?
```

### 9.5 Por que não Datadog?

Custo proibitivo para o estágio atual. OTel + Prometheus + Grafana é open source, padrão de mercado, e substituível sem mudar código (basta trocar exporter).

---

## 10. Logging

### 10.1 Decisão: structlog

- Logs estruturados JSON por padrão
- Pipeline de processadores (correlation_id automático)
- Bindings contextuais
- Performance superior ao logging padrão

### 10.2 Formato

```json
{
  "timestamp": "2026-07-27T10:30:00.123Z",
  "level": "info",
  "event": "orders_synced",
  "logger": "integrations.mercadolivre",
  "correlation_id": "abc-123-def",
  "extra": {"marketplace": "mercadolivre", "orders_count": 42}
}
```

### 10.3 Níveis

| Nível | Uso |
|---|---|
| debug | Desenvolvimento. Payloads ETL |
| info | Operação normal |
| warning | Anomalia não crítica (rate limit próximo) |
| error | Falha recuperável |
| critical | Falha irrecuperável (banco indisponível) |

### 10.4 Correlation ID

- Toda request HTTP recebe UUID via middleware
- Toda task Celery herda o correlation_id da request origem
- Logs SEM correlation_id: permitido em dev, rejeitado em produção

---

## 11. Segurança

### 11.1 Secrets Management

| Secret | Onde fica | Criptografia |
|---|---|---|
| DB password | ENV / Vault | AES-256 |
| API Keys | Banco (encrypted) | AES-256 (Fernet) |
| JWT Secret | ENV | N/A |
| OpenAI Key | ENV | AES-256 |
| Master Key | ENV (apenas) | N/A |

### 11.2 Criptografia (cryptography.fernet)

```python
class EncryptionService:
    def __init__(self, master_key: str):
        self._fernet = Fernet(master_key.encode())

    def encrypt(self, value: str) -> str:
        return self._fernet.encrypt(value.encode()).decode()

    def decrypt(self, encrypted: str) -> str:
        return self._fernet.decrypt(encrypted.encode()).decode()
```

### 11.3 JWT

- `python-jose` com `cryptography` backend
- Claims: `sub`, `scope`, `iat`, `exp`
- Revogação via blocklist no Redis

### 11.4 Rate Limit (slowapi)

- Global: 100 req/min por IP
- Por API Key: 1000 req/min (AI Gateway)

### 11.5 CORS

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,  # Lista explícita, nunca "*"
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
)
```

### 11.6 Security Headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

---

## 12. Qualidade de Código

### 12.1 Stack

| Ferramenta | Propósito | Justificativa |
|---|---|---|
| **Ruff** | Linter + Formatter | Substitui flake8 + isort + black. 100x mais rápido |
| **MyPy** | Type checker | Padrão de fato para type hints |
| **import-linter** | Arquitetura | Garante isolamento entre módulos |
| **Bandit** | Segurança estática | Detecta hardcoded secrets, SQL injection |
| **Pre-commit** | Gatilho local | Executa tudo antes do commit |

### 12.2 Ruff

```toml
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "SIM", "ARG", "PL"]
```

### 12.3 MyPy

```toml
[tool.mypy]
python_version = "3.12"
strict = true
disallow_untyped_defs = true
```

### 12.4 import-linter

```toml
[tool.import-linter]
root_package = "backend"

[[tool.import-linter.forbidden_imports]]
sources = ["backend.modules.*"]
forbidden_modules = ["backend.modules.*"]
```

### 12.5 Pre-commit

```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    hooks: [ruff, ruff-format]
  - repo: https://github.com/pre-commit/mirrors-mypy
    hooks: [mypy]
  - repo: https://github.com/PyCQA/bandit
    hooks: [bandit]
```

### 12.6 Rejeitados

| Ferramenta | Motivo |
|---|---|
| Black | Ruff substitui |
| Flake8 | Ruff substitui |
| Isort | Ruff substitui |
| Pylint | MyPy + Ruff são suficientes |
| Pydocstyle | Ruff tem regras DOC |

---

## 13. Testes

### 13.1 Stack

| Ferramenta | Propósito |
|---|---|
| pytest | Framework |
| pytest-asyncio | Suporte async |
| pytest-cov | Cobertura |
| testcontainers | PostgreSQL real em container |
| httpx | Async HTTP client |
| pytest-mock | Mock objects |

### 13.2 Estrutura

```
backend/
  tests/
    conftest.py              # Fixtures globais (DB, Redis, settings)
    unit/                    # Business layer pura (zero mock)
    integration/             # Repository + Adapters (container real)
    api/                     # Endpoints (httpx + testcontainers)
    e2e/                     # Fluxo completo
```

### 13.3 Fixtures Globais

```python
@pytest.fixture(scope="session")
def docker_services():
    with PostgresContainer("postgres:16-alpine") as pg:
        with RedisContainer("redis:7-alpine") as redis:
            yield {"pg": pg, "redis": redis}


@pytest.fixture
def db_session(docker_services):
    engine = create_async_engine(docker_services["pg"].get_connection_url())
    async with async_session(engine) as session:
        yield session
```

### 13.4 Cobertura Mínima

| Camada | Mínimo |
|---|---|
| Business | 95% |
| Service | 90% |
| Repository | 85% |
| Adapters | 80% |
| API | 90% |
| **Geral** | **85%** |

### 13.5 Regras

- Business layer: zero mocks
- Repository: testcontainers com PostgreSQL real
- Adapters: mock HTTP (`responses` ou `httpx_mock`)
- Service: mock apenas nos Ports
- Toda PR deve incluir testes. Cobertura não pode diminuir.

---

## 14. CI/CD

### 14.1 Stack

- **GitHub Actions** para CI/CD
- **Docker Buildx** para build multi-plataforma

### 14.2 Pipeline CI (PRs)

```yaml
name: CI
on: pull_request
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: astral-sh/setup-uv@v3
      - run: uv sync
      - run: uv run ruff check .
      - run: uv run ruff format --check .
      - run: uv run mypy .
      - run: uv run bandit -r .

  test:
    runs-on: ubuntu-latest
    services: { postgres, redis }
    steps:
      - uses: actions/checkout@v4
      - run: uv sync
      - run: uv run pytest --cov --cov-fail-under=85

  check-architecture:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: uv run import-linter
```

### 14.3 Pipeline CD (push em main)

```yaml
name: CD
on: push branches: [main]
jobs:
  build-and-deploy:
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - run: docker build -t royale-api:latest .
      - run: docker push registry/royale-api:latest
      - run: ./deploy.sh
```

### 14.4 Rollback

- Imagens Docker taggeadas com SHA do commit
- Rollback = `docker-compose pull` da tag anterior
- DB rollback via Alembic `downgrade`

---

## 15. Versionamento

### 15.1 Decisão: Trunk-Based Development

**Por que não Git Flow?** Complexidade desnecessária para time pequeno. Git Flow foi criado para times grandes com releases coordenadas.

### 15.2 Estratégia

```
main (protegida)
  └── feature/nome → PR → merge
  └── fix/nome → PR → merge
  └── release/v1.0.0 → tag
```

- Branches curtas (< 1 dia)
- Merge frequente para main
- Code review obrigatório
- Main bloqueada para push direto

### 15.3 Tags

Semânticas: `v1.0.0`, `v1.1.0`, `v2.0.0`
Release notes a partir de commits convencionais.

---

## 16. Backup

### 16.1 Banco de Dados

| Tipo | Frequência | Retenção |
|---|---|---|
| Full dump | Diário | 30 dias (S3) |
| WAL archiving | Contínuo | 7 dias (S3) |
| Pré-deploy | Antes de cada deploy | Até próximo deploy |

### 16.2 Comandos

```bash
pg_dump -Fc -Z 9 -f royale_$(date +%Y%m%d).dump royale_platform
```

WAL archiving:
```
archive_mode = on
archive_command = 'aws s3 cp %p s3://royale-backups/wal/%f'
```

### 16.3 Teste de Restore

- Mensal: backup full restaurado em ambiente isolado
- Trimestral: simulação de DR completa

---

## 17. Disaster Recovery

### 17.1 Métricas

| Métrica | Valor |
|---|---|
| RPO | < 1 hora |
| RTO | < 4 horas |

### 17.2 Cenários

| Cenário | Ação | Tempo |
|---|---|---|
| Falha de instância | Restart container | 5 min |
| Corrupção de dados | Restore full + WAL | 2h |
| Erro humano | PITR (point-in-time recovery) | 1h |

### 17.3 Runbook (Resumo)

1. Identificar escopo
2. Notificar equipe
3. Se banco: provisionar instância, restaurar full + WAL, validar, apontar app
4. Se app: rollback para última tag estável, verificar health checks
5. Documentar incidente

---

## 18. Feature Flags

### 18.1 Estratégia Evolutiva

| Fase | Mecanismo | Sprint |
|---|---|---|
| Fase 1 | Tabela `feature_flags` no banco | Sprint 0 |
| Fase 2 | Cache Redis + Tabela | Sprint 2+ |
| Fase 3 | LaunchDarkly (se necessário) | Futuro |

### 18.2 Tabela

```sql
CREATE TABLE feature_flags (
    id UUID PRIMARY KEY,
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 18.3 Uso

```python
if feature_flags.is_enabled("ai_price_suggestions"):
    await ai_gateway.suggest_price(product_id)
```

### 18.4 Benefícios

- Dark launch (deploy desligado)
- Rollback instantâneo sem redeploy
- Teste A/B futuro

---

## 19. Performance

### 19.1 Connection Pool

`pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=3600`

### 19.2 Async

Tudo async: FastAPI, SQLAlchemy, redis-py, httpx. Uvicorn com `--workers 4`.

### 19.3 Celery Workers

| Worker | Concurrency | Filas |
|---|---|---|
| worker-default | 4 | `default` |
| worker-integrations | 2 | `integrations` |
| worker-analytics | 1 | `analytics` |

### 19.4 Otimizações Futuras

| Otimização | Quando | Ganho |
|---|---|---|
| Materialized Views | Sprint 2 | 10-50x queries analíticas |
| PgBouncer | Alta carga | Pool de conexões |
| Partitioning | 50M+ linhas | Manutenção + performance |
| ClickHouse | 100M+ linhas | 10-100x analítico |

---

## 20. Riscos Técnicos

| # | Risco | Prob | Impacto | Mitigação |
|---|---|---|---|---|
| T01 | SQLAlchemy async complexidade | Média | Baixo | Treinamento da equipe |
| T02 | structlog curva de aprendizado | Baixa | Baixo | Logger factory pronto |
| T03 | Testcontainers lentos | Alta | Médio | Fixture session-scoped, paralelizar |
| T04 | Migração OLTP→DW complexa | Média | Alto | Começar com job periódico simples |
| T05 | Redis como broker perde mensagens | Baixa | Alto | Redis com AOF persistente. RabbitMQ futuro |
| T06 | Monolith cresce sem boundaries | Média | Alto | import-linter no CI. Review arquitetural trimestral |

---

## Recomendação Final do Arquiteto

### Decisão: APROVADO

### Tecnologias Aprovadas

| Domínio | Tecnologia |
|---|---|
| Linguagem | Python 3.12 |
| Framework | FastAPI |
| ORM | SQLAlchemy 2.0 async |
| Migrations | Alembic |
| Driver BD | asyncpg |
| Cache | Redis 7 |
| Task Queue | Celery |
| Gerenciador de dep | uv |
| Linter/Formatter | Ruff |
| Type Checker | MyPy |
| Testes | pytest + testcontainers |
| Logging | structlog |
| Observabilidade | OTel + Prometheus + Grafana |
| Storage | S3-compatível (MinIO) |
| CI/CD | GitHub Actions |
| Versionamento | Trunk-Based |
| DI | FastAPI Depends |
| Criptografia | cryptography (Fernet) |
| Segurança | slowapi, Bandit |
| Arquitetura | import-linter |
| Pre-commit | pre-commit hooks |

### Tecnologias Rejeitadas

| Tecnologia | Motivo |
|---|---|
| Poetry | Lento. uv é superior |
| Black + Flake8 + Isort | Ruff substitui todos |
| Pylint | MyPy + Ruff são suficientes |
| dependency-injector | Complexidade desnecessária |
| Git Flow | Overkill para time pequeno |
| MySQL | PostgreSQL é muito superior |
| MongoDB | Sem caso de uso — dados são relacionais |
| Datadog | Custo alto. OTel + Grafana bastam |

### Pendências Antes da Sprint 1

1. ✅ ADR-001 aprovado
2. ✅ ADR-002 aprovado (este documento)
3. ⌛ Configurar GitHub repository com branch protection
4. ⌛ Configurar GitHub Actions Secrets
5. ⌛ Escolher provedor de infraestrutura
6. ⌛ Setup do pre-commit no repositório

### Roadmap Técnico Atualizado

```
Sprint 0: Fundação
  - Estrutura de diretórios
  - Configuração uv + pyproject.toml
  - Docker Compose (api, postgres, redis, minio)
  - Settings + Config + DI
  - Logging estruturado (structlog)
  - Core module (Ports, exceptions, value objects)
  - Database engine + session factory
  - Alembic setup
  - Test infrastructure (conftest, fixtures)
  - CI/CD pipeline (lint + test + arch check)
  - Pre-commit hooks
  - Feature flags table

Sprint 1: Bling + Catalog + Orders
Sprint 2: Analytics + DW
Sprint 3: Mercado Livre + Shopee
Sprint 4: Amazon + Magalu + TikTok
Sprint 5: AI Gateway + Agents
Sprint 6: Automação + Refinamento
Sprint 7: Produção
```

---

*Este documento define a fundação técnica da Royale AI Platform. Toda decisão técnica deve referenciar este ADR.*