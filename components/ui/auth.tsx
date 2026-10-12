'use client'

import useAppUser from './useAppUser'

export default function AuthButton() {
  const { user, error, isLoading } = useAppUser()
  if (isLoading) return <div className="auth-status">Carregando...</div>
  if (error) return <div className="auth-status">Erro de autenticação</div>

  if (user) {
    return (
      <div className="auth-status">
        <span className="mr-3">Olá, {user.name ?? user.email}</span>
        {/* In dev the logout link may be a no-op */}
        <a className="button-ghost" href="/auth/logout">Sair</a>
      </div>
    )
  }

  return (
    <div className="auth-status">
      <a className="button-ghost" href="/auth/login">Entrar</a>
      <a className="ml-3 button-ghost" href="/auth/login?screen_hint=signup">Criar conta</a>
    </div>
  )
}
