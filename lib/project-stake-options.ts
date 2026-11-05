import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'
import { campaignAccess, requireUuid, type Session11Tx } from './session11-common'

export type StakeOption = { ownerType: 'CHARACTER' | 'COTERIE'; ownerId: string; ownerName: string; trait: string; dots: number; reserved: number; available: number }
const STAKE_BACKGROUNDS = new Set(['ALLY','ALLIES','CONTACTS','HAVEN','HERD','INFLUENCE','MASK','MAWLA','RESOURCES','RETAINERS','STATUS'])
const aliases:Record<string,string>={
 ALIADO:'ALLIES',ALIADOS:'ALLIES',CONTATOS:'CONTACTS',CONTATO:'CONTACTS',
 REFUGIO:'HAVEN',REBANHO:'HERD',INFLUENCIA:'INFLUENCE',MASCARA:'MASK',
 MENTOR:'MAWLA',RECURSO:'RESOURCES',RECURSOS:'RESOURCES',LACAIOS:'RETAINERS',LACAIO:'RETAINERS',STATUS:'STATUS'
}
export function backgroundCode(value:string) {
 const raw=value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase()
 const code=aliases[raw]??raw
 return STAKE_BACKGROUNDS.has(code)?code:null
}
type TraitValue = { name?: unknown; level?: unknown; dots?: unknown; pontos?: unknown; kind?: unknown; type?: unknown }
export function backgroundDots(data: Record<string, unknown>): { trait: string; dots: number }[] {
  const sources = [data.vantagens, data.backgrounds]
  const totals = new Map<string, number>()
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    for (const candidate of source) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) continue
      const item = candidate as TraitValue
      const trait = typeof item.name === 'string' ? backgroundCode(item.name) : null
      const dots = Number(item.level ?? item.dots ?? item.pontos ?? 0)
      if (!trait || !Number.isInteger(dots) || dots < 1 || dots > 5 || item.kind === 'FLAW' || item.type === 'FLAW') continue
      totals.set(trait, Math.max(totals.get(trait) ?? 0, dots))
    }
    if (totals.size) break
  }
  return [...totals].map(([trait, dots]) => ({ trait, dots }))
}
export async function stakeOptionsForProject(tx: Session11Tx, campaignId: string, projectId: string): Promise<StakeOption[]> {
  const projects = await tx.execute<{ id: string; coterie_id: string | null }>(sql`SELECT id,coterie_id FROM character_projects WHERE id=${projectId}::uuid AND campaign_id=${campaignId}::uuid`)
  const project = projects.rows[0]
  if (!project) throw new CharacterCommandError(404, 'Projeto não encontrado nesta mesa.')
  const members = await tx.execute<{ id: string; name: string; data: Record<string, unknown> }>(sql`SELECT ch.id,ch.name,ch.data FROM project_participants pp JOIN characters ch ON ch.id=pp.character_id WHERE pp.project_id=${projectId}::uuid AND ch.campaign_id=${campaignId}::uuid`)
  const options: StakeOption[] = []
  for (const member of members.rows) for (const entry of backgroundDots(member.data ?? {})) {
    const used = await tx.execute<{ reserved: number }>(sql`SELECT COALESCE(SUM(dots),0)::int AS reserved FROM project_stakes WHERE character_id=${member.id}::uuid AND upper(trim(trait))=${entry.trait} AND released_at IS NULL`)
    const reserved = Number(used.rows[0]?.reserved ?? 0)
    options.push({ ownerType: 'CHARACTER', ownerId: member.id, ownerName: member.name, trait: entry.trait, dots: entry.dots, reserved, available: Math.max(0, entry.dots - reserved) })
  }
  if (project.coterie_id) {
    const shared = await tx.execute<{ background_code: string; dots: number; name: string }>(sql`SELECT cb.background_code, SUM(cb.dots)::int AS dots, co.name FROM coterie_backgrounds cb JOIN coteries co ON co.id=cb.coterie_id WHERE co.id=${project.coterie_id}::uuid AND co.campaign_id=${campaignId}::uuid GROUP BY cb.background_code,co.name`)
    for (const entry of shared.rows) {
      const trait = backgroundCode(entry.background_code)
      if (!trait) continue
      const used = await tx.execute<{ reserved: number }>(sql`SELECT COALESCE(SUM(dots),0)::int AS reserved FROM project_stakes WHERE coterie_id=${project.coterie_id}::uuid AND upper(trim(trait))=${trait} AND released_at IS NULL`)
      const reserved = Number(used.rows[0]?.reserved ?? 0)
      options.push({ ownerType: 'COTERIE', ownerId: project.coterie_id, ownerName: entry.name, trait, dots: Number(entry.dots), reserved, available: Math.max(0, Number(entry.dots) - reserved) })
    }
  }
  return options
}
export async function getProjectStakeOptions(actorId: string, campaignId: string, projectId: string) {
  requireUuid(campaignId, 'Mesa inválida.')
  requireUuid(projectId, 'Projeto inválido.')
  return db.transaction(async tx => {
    const access = await campaignAccess(tx, actorId, campaignId)
    if (!access.is_master) throw new CharacterCommandError(403, 'Somente o Narrador gerencia os pontos em Stake.')
    return { options: await stakeOptionsForProject(tx, campaignId, projectId) }
  })
}
