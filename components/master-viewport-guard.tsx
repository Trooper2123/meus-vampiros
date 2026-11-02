import Link from 'next/link'
import { Laptop, Tablet, ArrowLeft } from 'lucide-react'

export function MasterViewportGuard({ backHref = '/campaigns' }: Readonly<{ backHref?: string }>) {
  return (
    <section className="master-mobile-guard" aria-label="Gestão da Mesa indisponível em telas pequenas">
      <div className="master-mobile-guard-brand">
        <span className="master-mobile-guard-mark" aria-hidden="true">♀</span>
        <div><strong>MEUS VAMPIROS</strong><span>Arquivos da Noite</span></div>
      </div>
      <div className="master-mobile-guard-hero" aria-hidden="true">
        <Laptop />
        <Tablet />
      </div>
      <h1>Gestão da Mesa</h1>
      <div className="master-mobile-guard-divider" aria-hidden="true"><span>♀</span></div>
      <p className="master-mobile-guard-lead">A visão do Narrador/Mestre está disponível apenas em tablets e computadores.</p>
      <div className="master-mobile-guard-rules">
        <div><Laptop aria-hidden="true"/><p><strong>Acesse em uma tela maior</strong><span>(≥ 768 px de largura)</span></p></div>
        <div><Tablet aria-hidden="true"/><p>Você pode usar um tablet ou computador para gerenciar a mesa.</p></div>
      </div>
      <Link className="master-mobile-guard-back" href={backHref}><ArrowLeft aria-hidden="true"/>Voltar</Link>
    </section>
  )
}
