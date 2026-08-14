'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Eye, EyeOff, KeyRound, LockKeyhole, Mail } from 'lucide-react'
import { createAccount } from '@/lib/firebase'

function getAuthErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : ''

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está vinculado a uma conta.'
    case 'auth/invalid-email':
      return 'Informe um e-mail válido.'
    case 'auth/weak-password':
      return 'A senha precisa ter pelo menos 6 caracteres.'
    default:
      return 'Não foi possível criar sua conta. Verifique os dados e tente novamente.'
  }
}

export default function CadastroPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }

    setIsSubmitting(true)
    try {
      await createAccount(email.trim(), password)
      router.push('/')
    } catch (authError) {
      setError(getAuthErrorMessage(authError))
      setIsSubmitting(false)
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
          <p className="eyebrow">Arquivo nº 13 / novo guardião</p>
          <h1 className="mt-4 font-serif text-4xl uppercase leading-none tracking-[0.12em] text-foreground sm:text-5xl">Criar acesso</h1>
          <p className="mt-4 font-serif text-lg tracking-[0.08em] text-primary">Entre para os arquivos</p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Registre seu e-mail e escolha uma senha para proteger sua entrada.</p>
        </div>

        <div className="login-panel">
          <div className="mb-7 flex items-center gap-3 border-b border-border pb-5">
            <KeyRound className="size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Registro do guardião</p>
              <p className="mt-1 text-sm text-foreground">Crie suas credenciais</p>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="login-label">E-mail</label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="input login-input w-full pl-10" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="login-label">Senha</label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="password" name="password" type={showPassword ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="input login-input w-full px-10" placeholder="mínimo de 6 caracteres" />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmation" className="login-label">Confirmar senha</label>
              <div className="relative mt-2">
                <LockKeyhole className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                <input id="confirmation" name="confirmation" type={showConfirmation ? 'text' : 'password'} required minLength={6} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="input login-input w-full px-10" placeholder="repita sua senha" />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmation(!showConfirmation)} aria-label={showConfirmation ? 'Ocultar confirmação' : 'Mostrar confirmação'}>
                  {showConfirmation ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error && <p className="border border-[#642b2d] bg-[#241315] px-3 py-3 text-sm leading-6 text-[#f3c7b7]" role="alert">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="button-primary flex w-full items-center justify-center gap-3 py-3 disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? 'Criando acesso...' : 'Criar minha conta'} {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>

          <div className="mt-7 border-t border-border pt-5 text-center">
            <p className="text-sm text-muted-foreground">Já possui um contrato?</p>
            <Link href="/" className="mt-3 inline-block font-mono text-[11px] uppercase tracking-[0.14em] text-primary transition-colors hover:text-foreground">Voltar ao acesso</Link>
          </div>
        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Toda entrada deixa uma marca</p>
      </section>
    </main>
  )
}
