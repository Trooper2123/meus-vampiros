/**
 * Built-in catalog entries are immutable source templates. Campaigns opt in to
 * seeing/instantiating them; personal narrator templates are independent.
 */
export function visibleNpcTemplates<T extends {id:string}>(
  globalTemplates: readonly T[],
  personalTemplates: readonly T[],
  globalEnabled:boolean,
): T[] {
  return [...(globalEnabled ? globalTemplates : []), ...personalTemplates]
}
export function canCloneGlobalNpcTemplate(isGlobal:boolean, campaignId:string|null, enabled:boolean):boolean {
  return !isGlobal || campaignId===null || enabled
}
