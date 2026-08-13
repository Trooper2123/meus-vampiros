 'use client'

import { useState } from 'react'
import { signIn } from '@/lib/firebase'
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react'

export default function Page() {
  const [showPassword, setShowPassword] = useState(false)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !password) return

    try {
      await signIn(user, password)
      // TODO: redirect or load protected data
    } catch {
      // Feedback visual será conectado ao fluxo de autenticação.
    }
  }

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

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="user" className="login-label">Usuário</label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="user" name="user" autoComplete="username" value={user} onChange={(event) => setUser(event.target.value)} className="input login-input w-full pl-10" placeholder="seu usuário" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="login-label">Senha</label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input login-input w-full px-10" placeholder="••••••••••••" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <button type="submit" className="button-primary flex w-full items-center justify-center gap-3 py-3">
              Verifique seus Contratos <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </form>

          <div className="mt-7 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">Caso não tenha um contrato crie um agora !</p>
            <button type="button" className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:text-foreground">Criar nova conta</button>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Toda entrada deixa uma marca</p>
      </section>

    </main>
  )
}
