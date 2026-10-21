import type { PublicClan } from '@/lib/vtm-v5/clans'
import type { ClanRule } from '@/lib/vtm-v5/clan-rules'
import { publicRuleSource } from '@/lib/vtm-v5/rule-profile'

function RuleDetails({ label, rule }: Readonly<{ label: string; rule: ClanRule }>) {
  const source = publicRuleSource(rule.sourceId)
  return <div className="flex flex-col gap-2">
    <h4 className="font-serif text-lg">{label}: {rule.name}</h4>
    <p className="text-xs text-muted-foreground" lang="en">{rule.originalName}</p>
    <p className="text-sm leading-6">{rule.description}</p>
    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm leading-6">{rule.mechanics.rules.map(text => <li key={text}>{text}</li>)}</ul>
    {rule.mechanics.endsWhen && <p className="text-sm text-muted-foreground">Término: {rule.mechanics.endsWhen}</p>}
    <a className="text-xs underline" href={source.href} target="_blank" rel="noopener noreferrer">{source.book} · {source.edition} · livro p. {source.printed} · PDF p. {source.pdf} · seção {rule.section}</a>
  </div>
}

export function ClanRules({ clan }: Readonly<{ clan: Pick<PublicClan, 'bane' | 'compulsion' | 'baneRule' | 'compulsionRule' | 'originalName' | 'description'> }>) {
  return <div className="mt-3 flex flex-col gap-5">
    {clan.originalName && <p className="text-xs text-muted-foreground">Nome original: <span lang="en">{clan.originalName}</span></p>}
    {clan.description && <p className="text-sm leading-6 text-muted-foreground">{clan.description}</p>}
    {clan.baneRule ? <RuleDetails label="Perdição" rule={clan.baneRule} /> : <p className="text-sm">Perdição: {clan.bane}</p>}
    {clan.compulsionRule ? <RuleDetails label="Compulsão" rule={clan.compulsionRule} /> : <p className="text-sm">Compulsão: {clan.compulsion}</p>}
  </div>
}
