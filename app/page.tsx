 'use client'

import Link from 'next/link'
import { ArrowRight, KeyRound } from 'lucide-react'

export default function Page() {

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="noise" aria-hidden="true" />
      <div className="login-mark login-mark-left" aria-hidden="true">✦</div>
      <div className="login-mark login-mark-right" aria-hidden="true">✧</div>

      <section className="relative z-1 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="sigil mx-auto mb-6" aria-hidden="true">AN</div>
          <p className="eyebrow">Arquivo nº 13 / acesso restrito</p>
          <h1 className="mt-4 font-serif text-4xl uppercase leading-none tracking-[0.12em] text-foreground sm:text-5xl">Arquivos da Noite</h1>
          <p className="mt-4 font-serif text-lg tracking-[0.08em] text-primary">Vampiros e outras Criaturas</p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Retorne ao arquivo dos amaldiçoados</p>
        </div>

        <div className="login-panel">
          <div className="mb-7 flex items-center gap-3 border-b border-border pb-5">
            <KeyRound className="size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Identificação do guardião</p>
              <p className="mt-1 text-sm text-foreground">Apresente suas credenciais</p>
            </div>
          </div>

          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">A autenticação é protegida pelo Auth0. Você será direcionado para inserir seu e-mail e sua senha com segurança.</p>
            <a href="/auth/login" className="button-primary flex w-full items-center justify-center gap-3 py-3">
              Verifique seus Contratos <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>

          <div className="mt-7 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">Caso não tenha um contrato crie um agora !</p>
            <Link href="/cadastro" className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:text-foreground">Criar nova conta</Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Toda entrada deixa uma marca</p>
      </section>

    </main>
  )
}
