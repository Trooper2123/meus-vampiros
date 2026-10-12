import { AccessToken } from 'livekit-server-sdk'

function requireLiveKitEnv() {
  const url = process.env.LIVEKIT_URL
  const apiKey = process.env.LIVEKIT_API_KEY
  const apiSecret = process.env.LIVEKIT_API_SECRET
  if (!url || !apiKey || !apiSecret) throw new Error('LiveKit não configurado. Defina LIVEKIT_URL, LIVEKIT_API_KEY e LIVEKIT_API_SECRET.')
  return { url, apiKey, apiSecret }
}

export function getLiveKitUrl() {
  return requireLiveKitEnv().url
}

export async function generateLiveKitToken({ identity, name, roomName, isHost }: { identity: string; name?: string | null; roomName: string; isHost: boolean }) {
  const { apiKey, apiSecret } = requireLiveKitEnv()
  const token = new AccessToken(apiKey, apiSecret, { identity, name: name ?? identity, ttl: '2h' })
  token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, roomAdmin: isHost })
  return token.toJwt()
}
