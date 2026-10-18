'use client'

import { LiveKitRoom as LiveKitRoomProvider, RoomAudioRenderer, VideoConference } from '@livekit/components-react'

export function LiveKitRoom({ token, serverUrl, onDisconnected }: Readonly<{ token: string; serverUrl: string; onDisconnected: () => void }>) {
  return <div className="min-h-[32rem] overflow-hidden border border-border bg-card" data-lk-theme="default"><LiveKitRoomProvider token={token} serverUrl={serverUrl} connect video audio onDisconnected={onDisconnected}><VideoConference /><RoomAudioRenderer /></LiveKitRoomProvider></div>
}
