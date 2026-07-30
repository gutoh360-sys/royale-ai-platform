# PM2 Setup — Royale Executive Insight Platform

## Instalação

```bash
npm install -g pm2
```

## Ecosystem File

Criar `/opt/royale/current/frontend/ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: "royale-frontend",
      cwd: "/opt/royale/current/frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0",
      },
      env_file: ".env",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: "/opt/royale/logs/royale-frontend-error.log",
      out_file: "/opt/royale/logs/royale-frontend-out.log",
      pid_file: "/opt/royale/pids/royale-frontend.pid",
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: "1G",
      watch: false,
    },
  ],
};
```

## Comandos

| Ação | Comando |
|------|---------|
| Start | `pm2 start ecosystem.config.js` |
| Restart | `pm2 restart royale-frontend` |
| Stop | `pm2 stop royale-frontend` |
| Delete | `pm2 delete royale-frontend` |
| Status | `pm2 status` |
| Logs | `pm2 logs royale-frontend` |
| Logs (últimas N linhas) | `pm2 logs royale-frontend --lines 100` |
| Monitor (dashboard) | `pm2 monit` |
| Reload (zero downtime) | `pm2 reload royale-frontend` |
| Save process list | `pm2 save` |
| Startup on boot | `pm2 startup` |

## Startup Automático

```bash
# Gerar script de startup (saída indicará o comando exato)
pm2 startup systemd

# Executar o comando exibido (exemplo):
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

# Salvar lista de processos
pm2 save
```

## Monitoramento

```bash
# Dashboard interativo
pm2 monit

# Métricas em tempo real
pm2 show royale-frontend

# Listar processos e uso
pm2 status

# CPU / Memória
pm2 prettylist
```

## Log Rotation

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```
