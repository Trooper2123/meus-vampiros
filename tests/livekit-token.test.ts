import { afterEach, expect, it, vi } from 'vitest'
import { generateLiveKitToken } from '@/lib/livekit'

afterEach(() => vi.unstubAllEnvs())

it('permits camera and microphone publishing, but not screen sharing', async () => {
  vi.stubEnv('LIVEKIT_URL', 'wss://livekit.example')
  vi.stubEnv('LIVEKIT_API_KEY', 'test-key')
  vi.stubEnv('LIVEKIT_API_SECRET', 'test-secret-for-unit-test')
  const token = await generateLiveKitToken({ identity: 'actor', roomName: 'room', isHost: false })
  const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())
  expect(claims.video.canPublishSources).toEqual(['camera', 'microphone'])
})
