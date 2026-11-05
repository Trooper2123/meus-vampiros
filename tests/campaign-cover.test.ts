import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { sanitizeCampaignCover, MAX_CAMPAIGN_COVER_BYTES } from '../lib/campaign-cover'

describe('campaign cover upload validation', () => {
  it('converts a valid PNG into WebP', async () => {
    const png = await sharp({ create: { width: 120, height: 120, channels: 3, background: '#7c2020' } }).png().toBuffer()
    const request = new Request('http://localhost/api/campaigns/test/cover', {
      method: 'PUT', headers: { 'content-type': 'image/png' }, body: new Uint8Array(png),
    })
    const result = await sanitizeCampaignCover(request)
    expect((await sharp(result).metadata()).format).toBe('webp')
  })

  it('rejects content-type outside supported image formats', async () => {
    const request = new Request('http://localhost/api/campaigns/test/cover', {
      method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'not an image',
    })
    await expect(sanitizeCampaignCover(request)).rejects.toMatchObject({ status: 415 })
  })

  it('rejects non-image bytes even when content-type claims JPEG', async () => {
    const request = new Request('http://localhost/api/campaigns/test/cover', {
      method: 'PUT', headers: { 'content-type': 'image/jpeg' }, body: 'not a jpeg',
    })
    await expect(sanitizeCampaignCover(request)).rejects.toMatchObject({ status: 422 })
  })

  it('rejects payload larger than 5 MB', async () => {
    const request = new Request('http://localhost/api/campaigns/test/cover', {
      method: 'PUT', headers: { 'content-type': 'image/png' }, body: new Uint8Array(MAX_CAMPAIGN_COVER_BYTES + 1),
    })
    await expect(sanitizeCampaignCover(request)).rejects.toMatchObject({ status: 413 })
  })
})
