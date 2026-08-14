'use client'

import Link from 'next/link'
import { useUser } from '@auth0/nextjs-auth0/client'

export default function AuthButton() {
  const { user, error, isLoading } = useUser()

  if (isLoading) return <div className="auth-status">Carregando...</div>
  if (error) return <div className="auth-status">Erro de autenticação</div>

  if (user) {
    return (
      <div className="auth-status">
        <span className="mr-3">Olá, {user.name ?? user.email}</span>
        <a className="button-ghost" href="/api/auth/logout">Sair</a>
      </div>
    )
  }

  return (
    <a className="button-ghost" href="/api/auth/login">Entrar</a>
  )
}
