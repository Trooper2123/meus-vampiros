const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function parseCampaignInvitationLink(link: string) {
  const value = link.trim()
  let campaignId = value
  if (!UUID.test(value)) {
    try { campaignId = new URL(value).searchParams.get('campaignId') ?? '' }
    catch { campaignId = '' }
  }
  if (!UUID.test(campaignId)) throw new Error('Informe um ID ou link válido da mesa.')
  return { campaignId }
}
