# VPS Deploy — Royale Executive Insight Platform

## Pré-requisitos

- Linux (Ubuntu 22.04+ / Debian 12+)
- Node.js 20 LTS ou superior (recomendado 22 LTS)
- npm 10+
- Git
- Nginx (para proxy reverso)
- PM2 (para gerenciamento de processo)

## Estrutura de Diretórios

```
/opt/royale/
├── current/                  # Symlink para release ativo
│   ├── frontend/
│   │   ├── .next/            # Build output (next build)
│   │   ├── public/           # Assets estáticos
│   │   ├── src/              # Código fonte
│   │   ├── .env              # Variáveis de ambiente
│   │   ├── package.json
│   │   └── next.config.ts
│   └── ...
├── releases/                 # Histórico de releases
│   ├── v1.0.0/
│   ├── v1.1.0/
│   └── v1.2.0/
└── logs/                     # Logs da aplicação (PM2)
```

## Instalação

```bash
# 1. Instalar Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Verificar versões
node --version   # v22.x
npm --version    # 10.x

# 3. Instalar PM2 globalmente
npm install -g pm2

# 4. Clonar repositório
git clone https://github.com/gutoh360-sys/royale-ai-platform.git /opt/royale/releases/v1.2.0

# 5. Instalar dependências
cd /opt/royale/releases/v1.2.0/frontend
npm ci --production

# 6. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com editor de sua preferência
nano .env
```

## Build

```bash
cd /opt/royale/releases/v1.2.0/frontend
npm run build
```

## Start

```bash
# Iniciar com PM2
pm2 start npm --name "royale-frontend" -- start

# Ou com porta personalizada
PORT=4000 pm2 start npm --name "royale-frontend" -- start
```

## Restart

```bash
pm2 restart royale-frontend
```

## Rollback

```bash
# Listar releases disponíveis
ls -la /opt/royale/releases/

# Atualizar symlink
ln -sfn /opt/royale/releases/v1.1.0 /opt/royale/current

# Rebuild (se necessário)
cd /opt/royale/current/frontend && npm ci --production && npm run build

# Restart PM2
pm2 restart royale-frontend
```

## Atualização

```bash
# 1. Criar nova release
cd /opt/royale/releases
git clone https://github.com/gutoh360-sys/royale-ai-platform.git v1.3.0

# 2. Instalar dependências
cd v1.3.0/frontend
npm ci --production

# 3. Copiar .env da release anterior
cp /opt/royale/current/frontend/.env .

# 4. Build
npm run build

# 5. Atualizar symlink
ln -sfn /opt/royale/releases/v1.3.0 /opt/royale/current

# 6. Restart
pm2 restart royale-frontend
```

## Verificação

```bash
# Health check
curl http://localhost:3000/api/auth/session

# Logs
pm2 logs royale-frontend --lines 50

# Status
pm2 status
```
