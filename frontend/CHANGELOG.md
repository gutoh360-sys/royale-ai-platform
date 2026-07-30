# Changelog

## [1.1.0] — 2026-07-30

### Adicionado

#### Sistema de Autenticação e Autorização (Auth Platform)
- Feature completa de Authentication & Authorization
- Novas rotas protegidas por middleware + guards
- Menu dinâmico baseado em permissões
- Página 403 (Access Denied)

#### Auth Domain
- `src/auth/domain/types.ts` — User, Role, Session, LoginRequest/Response, AuthUser
- `src/auth/domain/permissions.ts` — Permission Registry centralizado (22 permissões)
- `src/auth/domain/role-permissions.ts` — Mapeamento Role → Permissions (6 papéis)

#### Auth Infrastructure
- `src/auth/infrastructure/password.ts` — Password hashing com Node.js `crypto.scryptSync`
- `src/auth/infrastructure/users.ts` — Repositório local de usuários (inicializado com Administrador)
- `src/auth/infrastructure/session.ts` — Session cookie HMAC-SHA256 com Web Crypto API

#### Auth Application
- `src/auth/application/auth-service.ts` — Authenticate, CreateSessionCookie, ValidateSession
- `src/auth/application/permission-service.ts` — hasPermission, requirePermission
- `src/auth/application/nav-filter.ts` — Filtro de navegação por permissão

#### Session & Providers
- `src/auth/session/auth-provider.tsx` — React Context + Provider para estado de autenticação
- `src/auth/guards/require-auth.tsx` — Route guard (redireciona para /login)
- `src/auth/guards/require-permission.tsx` — Permission guard (renderiza 403)

#### API Routes
- `src/app/api/auth/login/route.ts` — POST /api/auth/login (valida credenciais, cria sessão)
- `src/app/api/auth/logout/route.ts` — POST /api/auth/logout (destroi sessão)
- `src/app/api/auth/me/route.ts` — GET /api/auth/me (retorna usuário atual)

#### Middleware
- `src/middleware.ts` — Edge Middleware: protege rotas, redireciona não autenticados para /login

#### Login Screen
- Login profissional com validação Zod, loading state, erros
- Suporte a usuário/senha (login `adm`, senha `123`)

#### 403 Page
- `src/app/access-denied/page.tsx` — Página de acesso negado com link para Dashboard

#### Testes (31 novos)
- `src/auth/domain/role-permissions.test.ts` — 6 testes (papéis, permissões)
- `src/auth/infrastructure/password.test.ts` — 5 testes (hash, verify)
- `src/auth/infrastructure/users.test.ts` — 6 testes (CRUD, senha, exposição)
- `src/auth/application/auth-service.test.ts` — 6 testes (login, sessão)
- `src/auth/application/permission-service.test.ts` — 3 testes (hasPermission)
- `src/auth/application/nav-filter.test.ts` — 3 testes (filtro de menu)

### Modificado
- `src/app/layout.tsx` — Adicionado AuthProvider
- `src/app/(authenticated)/layout.tsx` — Wrapped com RequireAuth via AppShell
- `src/app/login/page.tsx` — Usa novo LoginForm de src/auth
- `src/components/shell/app-shell.tsx` — Adicionado RequireAuth
- `src/components/shell/user-menu.tsx` — Conectado à sessão, logout funcional
- `src/features/navigation/config.ts` — NavItem com permission opcional
- `src/features/navigation/components/navigation-sidebar.tsx` — Filtro dinâmico por permissão
- `src/features/navigation/components/sidebar-footer.tsx` — Conectado à sessão, logout
- `next.config.ts` — Removido `output: "export"` (API routes requerem SSR)
- `package.json` — Versão 1.0.0 → 1.1.0

### Segurança
- Senha armazenada com hash (scrypt + salt aleatório)
- Sessão com HMAC-SHA256 (impede adulteração)
- Cookie httpOnly, secure em produção, sameSite lax
- Sessão expira em 8 horas
- Middleware valida sessão em todas as requisições
- Nenhuma regra de negócio da Executive Platform alterada

## [1.0.0] — 2026-07-30

### Adicionado

- Executive Insight Platform — primeira versão completa
(PRs #051-#058, ver CHANGELOG da v1.0.0 para detalhes)
