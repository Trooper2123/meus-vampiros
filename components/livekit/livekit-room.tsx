'use client'

import { LiveKitRoom as LiveKitRoomProvider, RoomAudioRenderer, VideoConference } from '@livekit/components-react'
import { SessionLiveKitChat } from './session-livekit-chat'

export function LiveKitRoom({ token, serverUrl, onDisconnected, compact = false, chatTargetId }: Readonly<{ token: string; serverUrl: string; onDisconnected: () => void; compact?: boolean; chatTargetId?: string }>) {
  return <div className={compact ? "session-video-grid overflow-hidden border border-border bg-card" : "min-h-[32rem] overflow-hidden border border-border bg-card"} data-lk-theme="default"><LiveKitRoomProvider token={token} serverUrl={serverUrl} connect video audio onDisconnected={onDisconnected}><VideoConference controls={{ screenShare: false, chat: !chatTargetId }} /><RoomAudioRenderer />{chatTargetId && <SessionLiveKitChat targetId={chatTargetId} />}</LiveKitRoomProvider></div>
}
