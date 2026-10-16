import { ArrowRight } from 'lucide-react'

export default function Page() {

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-5 py-10 text-foreground sm:px-8">
      <div className="noise" aria-hidden="true" />

      <section className="relative z-1 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="sigil mx-auto mb-6" aria-hidden="true">AN</div>
          <p className="eyebrow">Arquivo nº 13 / acesso restrito</p>
          <h1 className="login-title">Arquivos da Noite</h1>
          <p className="mt-7 font-serif text-2xl text-primary">Vampiros e outras Criaturas</p>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-muted-foreground">Retorne ao arquivo dos amaldiçoados</p>
        </div>

        <div className="login-panel">
          <div className="mb-7 flex items-center gap-3 border-b border-border pb-5">
            <div>
              <p className="eyebrow">Identificação do guardião</p>
              <p className="mt-1 text-sm text-foreground">Apresente suas credenciais</p>
            </div>
          </div>

          <div className="flex flex-col gap-5">
            <p className="text-sm leading-6 text-muted-foreground">A autenticação é protegida pelo Auth0. Você será direcionado para inserir seu e-mail e sua senha com segurança.</p>
            <a href="/auth/login?returnTo=/characters" className="button-primary flex w-full items-center justify-center gap-3 py-3">
              Verifique seus Contratos <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>


        </div>

        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Toda entrada deixa uma marca</p>
      </section>

    </main>
  )
}
