# meus-vampiros

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_h1jJ0SKSMFxaCV1hIrsTlcdIlxUG)

## Getting Started

A CLI `vercel` não faz parte das dependências da aplicação: os scripts usam Next.js diretamente e o deploy automático do projeto não depende de instalar essa CLI no runtime. O pacote `@vercel/analytics` permanece disponível. Se precisar de comandos de deploy local, configure a CLI separadamente em uma versão auditada; não reintroduza a árvore vulnerável no projeto.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Mesa virtual com LiveKit

Configure `LIVEKIT_URL`, `LIVEKIT_API_KEY` e `LIVEKIT_API_SECRET` no ambiente do servidor. Use `.env.local.example` como referência. As credenciais ficam disponíveis no painel do projeto LiveKit Cloud; nunca exponha `LIVEKIT_API_SECRET` no cliente.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.
