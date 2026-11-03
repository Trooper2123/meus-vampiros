'use client'

import {
  ControlBar,
  GridLayout,
  LiveKitRoom as LiveKitRoomProvider,
  ParticipantTile,
  RoomAudioRenderer,
  VideoConference,
  useTracks,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { SessionLiveKitChat } from './session-livekit-chat'

function SessionCameraGrid() {
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }])

  return (
    <div className="session-livekit-video-with-external-chat">
      <div className="lk-grid-layout-wrapper">
        <GridLayout tracks={cameraTracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <ControlBar controls={{ chat: false, screenShare: false }} />
    </div>
  )
}

export function LiveKitRoom({ token, serverUrl, onDisconnected, compact = false, chatTargetId }: Readonly<{ token: string; serverUrl: string; onDisconnected: () => void; compact?: boolean; chatTargetId?: string }>) {
  return (
    <div className={compact ? 'session-video-grid overflow-hidden border border-border bg-card' : 'min-h-[32rem] overflow-hidden border border-border bg-card'} data-lk-theme="default">
      <LiveKitRoomProvider token={token} serverUrl={serverUrl} connect video audio onDisconnected={onDisconnected}>
        {chatTargetId ? <SessionCameraGrid /> : <VideoConference />}
        <RoomAudioRenderer />
        {chatTargetId && <SessionLiveKitChat targetId={chatTargetId} />}
      </LiveKitRoomProvider>
    </div>
  )
}
