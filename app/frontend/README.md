# YOUVISA Frontend

Frontend da plataforma YOUVISA - Sistema de atendimento multicanal inteligente para serviços consulares.

## Stack

- **Next.js 16** - Framework React com App Router
- **React 19** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização utility-first
- **shadcn/ui** - Componentes base (New York style)
- **Magic UI** - Componentes animados e efeitos visuais
- **Coss UI** - Componentes extras baseados em Base UI
- **next-themes** - Gerenciamento de tema (light/dark/system)
- **framer-motion** - Animações

## Estrutura do Projeto

```text
src/
├── app/                    # App Router (Next.js)
│   ├── layout.tsx          # Layout raiz com ThemeProvider
│   ├── page.tsx            # Página inicial
│   └── globals.css         # Estilos globais + CSS variables
├── components/
│   ├── ui/                 # Componentes shadcn/ui
│   ├── magicui/            # Componentes Magic UI
│   ├── theme-provider.tsx  # Provider de tema
│   └── theme-toggle.tsx    # Toggle de tema
└── lib/
    └── utils.ts            # Utilitários (cn function)
```

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev

# Build de produção
npm run build

# Rodar build de produção
npm start

# Lint
npm run lint
```

Acesse [http://localhost:3000](http://localhost:3000) para ver a aplicação.

## Adicionando Componentes

### shadcn/ui (Componentes Base)

```bash
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add table
```

### Magic UI (Animações e Efeitos)

```bash
npx shadcn@latest add "https://magicui.design/r/shimmer-button"
npx shadcn@latest add "https://magicui.design/r/animated-gradient-text"
npx shadcn@latest add "https://magicui.design/r/globe"
```

### Coss UI (Componentes Extras)

```bash
npx shadcn@latest add @coss/alert
npx shadcn@latest add @coss/spinner
npx shadcn@latest add @coss/notification
```

## Tema

O projeto suporta tema claro, escuro e automático (sistema). O toggle de tema está disponível no componente `ThemeToggle`.

As cores são definidas via CSS variables em `globals.css` e se adaptam automaticamente ao tema selecionado. Evite usar cores fixas - sempre use as variáveis do tema:

```tsx
// Correto
<div className="bg-background text-foreground">
<p className="text-muted-foreground">

// Evitar
<div className="bg-white text-black">
<p className="text-gray-500">
```

## Referências

- [Next.js 16 Docs](https://nextjs.org/docs)
- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Magic UI](https://magicui.design)
- [Coss UI](https://coss.com/ui/docs)
