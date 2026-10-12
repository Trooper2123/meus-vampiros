export type CampaignEventVisibility = 'master' | 'everyone'

export type CampaignEvent = {
  id: string
  campaignId: string
  title: string
  description: string | null
  eventDate: string
  eventTime: string | null
  visibility: CampaignEventVisibility
  createdAt: Date | string
}

export type EventFormData = {
  campaignId?: string
  eventId?: string
  title?: string
  description?: string | null
  eventDate?: string
  eventTime?: string | null
  visibility?: CampaignEventVisibility
}
