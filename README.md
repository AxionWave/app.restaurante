# app.restaurante — Orion

Front React + Vite + TypeScript do **Orion** (sistema Restaurante).

Login e JWT são os **mesmos** do Enterprise (Gateway → oAuth). Não há login próprio.

## Integração

| Peça | Valor |
|------|--------|
| Sistema | `ORI` (Orion) |
| Módulo de segurança | `ORION000000` (legado `ORI0000000`) |
| Gateway | `VITE_GATEWAY_URL` (local: `http://localhost:8080`) |
| API de negócio | `/api/restaurante/**` |
| Porta local | `3001` |
| Header | `X-Secret-Token` = `FRONTEND_SECRET_TOKEN` do Gateway |

## Rodar local

1. Copie `.env.example` → `.env.local`
2. Em `VITE_ORION_AMBIENTE` / `VITE_GATEWAY_AMBIENTE` use `homolog` (VPS) ou `local` (Gateway na sua máquina)
3. `npm install && npm run dev`
4. Abra `http://localhost:3001`

Ou, na raiz do workspace Enterprise: edite `env.ambiente` e rode `node scripts/aplicar-ambiente.mjs`.

O painel chama `GET /api/restaurante/me` no Gateway escolhido.

## CI/CD

Push em `production` faz deploy na VPS (`https://orion.lumensoft.com.br/`).
Secrets: os mesmos do Gateway (`VPS_*`) + `FRONTEND_SECRET_TOKEN`.

## Módulos

- `ORION000000` Segurança / Início → `/inicio`
- `ORI0000000` Legado (ainda aceito)
- `ORI0000001` Cardápio → `/cardapio`
- `ORI0000002` Pedidos → `/pedidos`
- `ORI0000003` Mesas → `/mesas`

Conceda via `usuario_modulo` / perfil no ASC. Sem isso o JWT vem com `modulos: []`.
