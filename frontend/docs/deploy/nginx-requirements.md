# Nginx Requirements — Royale Executive Insight Platform

> **Nota:** Esta documentação descreve os requisitos e a configuração esperada do Nginx como proxy reverso. A configuração definitiva deve ser ajustada conforme o ambiente da VPS (certificados SSL, domínio, etc.).

## Pré-requisitos

- Nginx 1.24+
- Certbot + Let's Encrypt (para HTTPS)
- Portas 80 (HTTP) e 443 (HTTPS) liberadas no firewall

## Requisitos de Configuração

### 1. Proxy Reverso

O Nginx deve encaminhar requisições para o Next.js (localhost:3000):

- `/` → `http://localhost:3000`
- `/_next/*` → `http://localhost:3000` (assets estáticos compilados)
- `/api/*` → `http://localhost:3000` (API routes — futuro)

### 2. WebSocket (futuro)

O Next.js utiliza WebSocket para hot-reload em desenvolvimento. Em produção, WebSocket pode ser necessário para funcionalidades futuras (notificações em tempo real).

### 3. Headers de Segurança

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (com HTTPS)

### 4. Cache

- Assets estáticos compilados pelo Next.js (`/_next/static/*`) possuem hash no filename e podem ser cacheados com `max-age=31536000, immutable`
- Páginas HTML não devem ser cacheadas (`no-cache`)
- Assets em `/public/` podem ter cache curto (`max-age=3600`)

### 5. Compressão

- Gzip ou Brotli para assets textuais (HTML, JS, CSS, JSON, SVG)
- Desabilitado para imagens e binários

### 6. TLS / HTTPS

- TLS 1.2+ obrigatório
- Certificado Let's Encrypt (Certbot) ou comercial
- HTTP → HTTPS redirect

### 7. Rate Limiting (futuro)

Após a migração de autenticação para server-side, configurar rate limiting no Nginx para a rota `/api/auth/session`:

```
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/s;
```

### 8. Tamanho Máximo do Body

O Next.js gerencia limites de body internamente. Configurar no Nginx:

```
client_max_body_size 10m;
```

### Exemplo Parcial (sem SSL)

```nginx
upstream royale_frontend {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name royale.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name royale.example.com;

    # SSL — configurar com Certbot
    # ssl_certificate     /etc/letsencrypt/live/royale.example.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/royale.example.com/privkey.pem;

    location / {
        proxy_pass http://royale_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /_next/static {
        proxy_pass http://royale_frontend;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /public {
        alias /opt/royale/current/frontend/public;
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

## Checklist de Configuração

- [ ] Proxy reverso configurado para localhost:3000
- [ ] HTTPS habilitado com Let's Encrypt
- [ ] HTTP → HTTPS redirect
- [ ] Headers de segurança configurados
- [ ] Cache de assets estáticos otimizado
- [ ] Compressão Brotli/Gzip habilitada
- [ ] Firewall liberando portas 80/443
- [ ] Rate limiting documentado (aplicar após auth migration)
- [ ] Logs do Nginx configurados e rotacionados
