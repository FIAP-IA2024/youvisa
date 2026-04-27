# Setup do Ambiente de Desenvolvimento — Sprint 4

Sprint 4 roda 100% local via `docker compose`. Apenas Docker, Node, e o Claude Code CLI no host são necessários.

## Pré-requisitos

- **Docker Desktop** (ou Docker Engine + compose v2)
- **Node 22+** apenas se você for rodar testes/scripts fora dos containers
- **ngrok** (free tier basta) para expor o webhook do Telegram durante a demo
- **Conta Claude Max** logada via Claude Code CLI no seu host
- **Bot do Telegram** (use `@BotFather` para criar; o token vai em `.env`)

## Setup inicial (uma vez)

### 1. Variáveis de ambiente

```bash
cp .env.example .env
# Edite e preencha:
#   TELEGRAM_BOT_TOKEN=...        (do @BotFather)
#   PORTAL_SECRET=$(openssl rand -hex 32)
#   DASHBOARD_SESSION_SECRET=$(openssl rand -hex 32)
```

### 2. Volume do Claude

```bash
docker volume create claude_home
```

### 3. Token do Claude Agent SDK

O agente roda como o usuário `node` (UID 1000) dentro do container. O Claude Code CLI dentro do container precisa ter um token autorizado para chamar a API.

```bash
docker compose run --rm agent claude setup-token
```

Isso abre uma URL no terminal — copie e cole no seu browser, autorize com sua conta Max, e cole o token de volta no terminal. O token persiste no volume `claude_home` (sobrevive a `docker compose down`).

> **Atalho.** Se você já tem o Claude Code logado no host (macOS), o token está no Keychain. Pode pular este passo executando:
> ```bash
> security find-generic-password -s "Claude Code-credentials" -a "$USER" -w | \
>   docker run --rm -i -v claude_home:/dst alpine sh -c \
>   'cat > /dst/.credentials.json && chown 1000:1000 /dst/.credentials.json && chmod 600 /dst/.credentials.json'
> ```

## Subir a stack

```bash
make up           # equivalente a docker compose up -d
make logs agent   # acompanha logs de um serviço
```

Serviços expostos no host:

| Serviço      | Porta  | Descrição                                |
|--------------|--------|------------------------------------------|
| frontend     | 3010   | Next.js (operador console + portal cliente) |
| api          | 5555   | Fastify API                              |
| agent        | 7777   | Multi-agent + Telegram webhook + classifier |
| validation   | 5556   | FastAPI + OpenCV (qualidade de imagem)   |
| mongo        | 27017  | MongoDB local                            |
| minio        | 9000/9001 | S3 + console web                      |

Frontend dashboard: `http://localhost:3010` (login `admin@admin.com` / `Teste1234`).
Cliente portal: `http://localhost:3010/portal/<jwt>` (gerado pelo bot quando o usuário digita "abrir portal").

## Conectar o Telegram bot ao agente

Telegram só fala com URLs públicas via webhook. Use ngrok para expor o agente:

```bash
ngrok http 7777
# copie o URL https://abc-123.ngrok-free.app
make webhook URL=https://abc-123.ngrok-free.app
# verifica: tail -f logs do agent quando você manda mensagem ao bot
make logs agent
```

Agora envie qualquer mensagem para o bot pelo Telegram — você deve receber resposta em 5–15s.

## Verificar que tudo funciona

```bash
make test            # vitest no api e agent
make smoke           # smoke E2E (cenários sintéticos contra a stack)
```

`make smoke` deve sair com `✅ all scenarios passed` (8/8).

## Troubleshooting

**`mongo connection failed at startup`**: o agente não conseguiu falar com o mongo. Verifique `docker compose ps` — o mongo precisa estar `healthy`. Reinicie: `docker compose restart agent`.

**`telegram sendMessage failed: chat not found`**: o `chat_id` no banco não existe no Telegram. Geralmente porque você está testando contra dados sintéticos do `make smoke` (esperado).

**`access token not found in credentials`**: o passo 3 não rodou ou o volume está vazio. Re-execute `claude setup-token`.

**`docker compose up` quebra com "claude_home volume not found"**: rode `docker volume create claude_home` (passo 2).

**Portal mostra "Link expirado"**: o token JWT expirou (24h padrão) ou foi assinado com um `PORTAL_SECRET` diferente. Peça um novo no Telegram digitando "abrir portal".

**Frontend mostra apenas tela em branco**: confira se o container `youvisa-frontend` está em `Up`. Pode levar até 30s na primeira vez (Next.js compila as páginas sob demanda em modo dev).
