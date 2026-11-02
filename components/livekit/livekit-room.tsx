'use client'

import { LiveKitRoom as LiveKitRoomProvider, RoomAudioRenderer, VideoConference } from '@livekit/components-react'

export function LiveKitRoom({ token, serverUrl, onDisconnected, compact = false }: Readonly<{ token: string; serverUrl: string; onDisconnected: () => void; compact?: boolean }>) {
  return <div className={compact ? "session-video-grid overflow-hidden border border-border bg-card" : "min-h-[32rem] overflow-hidden border border-border bg-card"} data-lk-theme="default"><LiveKitRoomProvider token={token} serverUrl={serverUrl} connect video audio onDisconnected={onDisconnected}><VideoConference controls={{ screenShare: false, chat: true }} /><RoomAudioRenderer /></LiveKitRoomProvider></div>
}
