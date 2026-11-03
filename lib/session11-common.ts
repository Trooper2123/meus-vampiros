import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { db } from './db'
import { CharacterCommandError } from './character-commands'

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type Session11Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]
export type CampaignAccess = { master_user_id: string; is_member: boolean; is_master: boolean; status: string }

export function requireUuid(id: unknown, description = 'Identificador inválido'): asserts id is string {
  if (typeof id !== 'string' || !UUID_RE.test(id)) throw new CharacterCommandError(400, description)
}
export function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new CharacterCommandError(400, field + ' inválido.')
  return value.trim()
}
export function optionalText(value: unknown, field: string, max: number): string {
  if (value === undefined || value === null) return ''
  if (typeof value !== 'string' || value.length > max) throw new CharacterCommandError(400, field + ' inválido.')
  return value.trim()
}
export function dots(value: unknown, name: string, min = 0, max = 5) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) throw new CharacterCommandError(400, name + ' inválido.')
  return Number(value)
}
export async function campaignAccess(tx: Session11Tx, actorId: string, campaignId: string, forUpdate = false): Promise<CampaignAccess> {
  requireUuid(campaignId, 'Mesa inválida.')
  const rows = await tx.execute<CampaignAccess>(sql`SELECT c.master_user_id, c.status,
     (c.master_user_id = ${actorId}) AS is_master,
     (c.master_user_id = ${actorId} OR EXISTS (SELECT 1 FROM characters ch WHERE ch.campaign_id = c.id AND ch.user_id = ${actorId} AND ch.status NOT IN ('DELETED','ARCHIVED'))) AS is_member
     FROM campaigns c WHERE c.id = ${campaignId}::uuid ${forUpdate ? sql`FOR UPDATE` : sql`FOR SHARE`}`)
  const access=rows.rows[0]
  if(!access) throw new CharacterCommandError(404,'Mesa não encontrada.')
  if(!access.is_member) throw new CharacterCommandError(403,'Você não participa desta mesa.')
  if(access.status==='Arquivada') throw new CharacterCommandError(409,'Esta mesa está arquivada.')
  return access
}
export async function requireCampaignMaster(tx: Session11Tx, actorId: string,campaignId:string) {
  const access=await campaignAccess(tx,actorId,campaignId)
  if(!access.is_master) throw new CharacterCommandError(403,'Esta operação exige o Narrador da mesa.')
  return access
}
export async function requireCharacterOfCampaign(tx:Session11Tx,campaignId:string,characterId:string,actorId?:string) {
  requireUuid(characterId,'Personagem inválido.')
  const rows=await tx.execute<{ id:string; user_id:string; character_type:string;status:string }>(sql`SELECT id,user_id,character_type,status FROM characters WHERE id=${characterId}::uuid AND campaign_id=${campaignId}::uuid FOR SHARE`)
  const character=rows.rows[0]
  if(!character || character.character_type!=='PLAYER_VAMPIRE' || ['DELETED','ARCHIVED','DISABLED'].includes(character.status)) throw new CharacterCommandError(422,'Selecione um vampiro jogável da mesma mesa.')
  if(actorId && character.user_id!==actorId) throw new CharacterCommandError(403,'Somente o proprietário da ficha pode realizar esta ação.')
  return character
}
function canonical(value:unknown):unknown {
  if(Array.isArray(value)) return value.map(canonical)
  if(value && typeof value==='object') return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)]))
  return value
}
export async function runCampaignCommand<T extends Record<string,unknown>>(actorId:string,campaignId:string,input:{idempotencyKey:string;action:string;[key:string]:unknown},handler:(tx:Session11Tx,access:CampaignAccess)=>Promise<T>):Promise<T>{
  requireUuid(campaignId,'Mesa inválida.')
  requireUuid(input.idempotencyKey,'Chave de comando inválida.')
  const hash=createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex')
  return db.transaction(async tx=>{
    const access=await campaignAccess(tx,actorId,campaignId,true)
    const saved=await tx.execute<{payload_hash:string;response:T}>(sql`SELECT payload_hash,response FROM project_commands WHERE campaign_id=${campaignId}::uuid AND actor_user_id=${actorId} AND command_key=${input.idempotencyKey}::uuid`)
    if(saved.rows[0]){
      if(saved.rows[0].payload_hash!==hash) throw new CharacterCommandError(409,'Chave idempotente já usada para outra operação.')
      return saved.rows[0].response
    }
    const result=await handler(tx,access)
    await tx.execute(sql`INSERT INTO project_commands (campaign_id,actor_user_id,command_key,payload_hash,response)
      VALUES (${campaignId}::uuid,${actorId},${input.idempotencyKey}::uuid,${hash},${JSON.stringify(result)}::jsonb)`)
    return result
  })
}
