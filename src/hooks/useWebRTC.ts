import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '@/socket';
import type { CallPeer, PeerMediaState } from '@/types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export interface RemotePeer extends CallPeer {
  stream: MediaStream | null;
  media: PeerMediaState;
}

interface SignalData {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

/**
 * Mesh WebRTC for room calls: every participant peers with every other,
 * signaling over Socket.io (`call:signal`). Screen share replaces the
 * outgoing camera track, so it needs no renegotiation.
 */
export function useWebRTC(roomId: string) {
  const [inCall, setInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const [audioOn, setAudioOn] = useState(true);
  const [videoOn, setVideoOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);

  const pcs = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  const updatePeer = useCallback((socketId: string, patch: Partial<RemotePeer>) => {
    setPeers((prev) => {
      const next = new Map(prev);
      const existing = next.get(socketId);
      if (existing) next.set(socketId, { ...existing, ...patch });
      return next;
    });
  }, []);

  const broadcastMediaState = useCallback(
    (state: { audio: boolean; video: boolean; screen: boolean }) => {
      getSocket()?.emit('call:media-state', { roomId, ...state });
    },
    [roomId],
  );

  const createPeerConnection = useCallback(
    (peer: CallPeer, initiator: boolean) => {
      const socket = getSocket();
      if (!socket) return;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcs.current.set(peer.socketId, pc);

      setPeers((prev) => {
        const next = new Map(prev);
        next.set(peer.socketId, {
          ...peer,
          stream: null,
          media: { audio: true, video: false, screen: false },
        });
        return next;
      });

      for (const track of localStreamRef.current?.getTracks() ?? []) {
        pc.addTrack(track, localStreamRef.current!);
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('call:signal', {
            targetSocketId: peer.socketId,
            data: { candidate: e.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (e) => {
        updatePeer(peer.socketId, { stream: e.streams[0] ?? null });
      };

      pc.onnegotiationneeded = async () => {
        if (!initiator) return;
        try {
          await pc.setLocalDescription(await pc.createOffer());
          socket.emit('call:signal', {
            targetSocketId: peer.socketId,
            data: { sdp: pc.localDescription?.toJSON() },
          });
        } catch {
          /* renegotiation failed — peer will retry on next change */
        }
      };

      if (initiator) {
        void (async () => {
          try {
            await pc.setLocalDescription(await pc.createOffer());
            socket.emit('call:signal', {
              targetSocketId: peer.socketId,
              data: { sdp: pc.localDescription?.toJSON() },
            });
          } catch {
            /* offer failed */
          }
        })();
      }
    },
    [updatePeer],
  );

  const closePeer = useCallback((socketId: string) => {
    pcs.current.get(socketId)?.close();
    pcs.current.delete(socketId);
    setPeers((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
  }, []);

  // Socket signaling listeners (active only while in a call)
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !inCall) return;

    const onPeerJoined = (peer: CallPeer) => {
      // Newcomer initiates; we just prepare the connection and answer.
      createPeerConnection(peer, false);
    };

    const onSignal = async ({ fromSocketId, data }: { fromSocketId: string; data: SignalData }) => {
      const pc = pcs.current.get(fromSocketId);
      if (!pc) return;
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
          if (data.sdp.type === 'offer') {
            await pc.setLocalDescription(await pc.createAnswer());
            socket.emit('call:signal', {
              targetSocketId: fromSocketId,
              data: { sdp: pc.localDescription?.toJSON() },
            });
          }
        } else if (data.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch {
        /* stale signal — safe to ignore */
      }
    };

    const onPeerLeft = ({ socketId }: { socketId: string }) => closePeer(socketId);

    const onMediaState = (s: { socketId: string } & PeerMediaState) => {
      updatePeer(s.socketId, { media: { audio: s.audio, video: s.video, screen: s.screen } });
    };

    socket.on('call:peer-joined', onPeerJoined);
    socket.on('call:signal', onSignal);
    socket.on('call:peer-left', onPeerLeft);
    socket.on('call:media-state', onMediaState);
    return () => {
      socket.off('call:peer-joined', onPeerJoined);
      socket.off('call:signal', onSignal);
      socket.off('call:peer-left', onPeerLeft);
      socket.off('call:media-state', onMediaState);
    };
  }, [inCall, createPeerConnection, closePeer, updatePeer]);

  const joinCall = useCallback(
    async (withVideo: boolean) => {
      const socket = getSocket();
      if (!socket || inCall) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: withVideo,
      });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      setLocalStream(stream);
      setAudioOn(true);
      setVideoOn(withVideo);
      setScreenOn(false);
      setInCall(true);

      socket.emit(
        'call:join',
        { roomId, type: withVideo ? 'VIDEO' : 'AUDIO' },
        (res: { ok: boolean; peers?: CallPeer[] }) => {
          if (!res.ok) return;
          // We are the newcomer → we initiate offers to everyone already in.
          for (const peer of res.peers ?? []) createPeerConnection(peer, true);
          broadcastMediaState({ audio: true, video: withVideo, screen: false });
        },
      );
    },
    [roomId, inCall, createPeerConnection, broadcastMediaState],
  );

  const leaveCall = useCallback(() => {
    getSocket()?.emit('call:leave', { roomId });
    for (const socketId of [...pcs.current.keys()]) closePeer(socketId);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setInCall(false);
    setScreenOn(false);
    setVideoOn(false);
  }, [roomId, closePeer]);

  useEffect(() => leaveCall, [leaveCall]); // cleanup on unmount

  const toggleAudio = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setAudioOn(track.enabled);
    broadcastMediaState({ audio: track.enabled, video: videoOn, screen: screenOn });
  }, [videoOn, screenOn, broadcastMediaState]);

  /** Replaces the outgoing video track on every peer connection. */
  const replaceVideoTrack = useCallback(async (track: MediaStreamTrack | null) => {
    for (const pc of pcs.current.values()) {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(track).catch(() => undefined);
      } else if (track && localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    }
  }, []);

  const toggleVideo = useCallback(async () => {
    if (screenOn) return; // stop screen share first
    const stream = localStreamRef.current;
    if (!stream) return;

    let track = stream.getVideoTracks()[0];
    if (!track) {
      // Camera was never started — acquire it now.
      const cam = await navigator.mediaDevices.getUserMedia({ video: true });
      track = cam.getVideoTracks()[0];
      stream.addTrack(track);
      cameraTrackRef.current = track;
      await replaceVideoTrack(track);
      setLocalStream(new MediaStream(stream.getTracks()));
      setVideoOn(true);
      broadcastMediaState({ audio: audioOn, video: true, screen: false });
      return;
    }
    track.enabled = !track.enabled;
    setVideoOn(track.enabled);
    broadcastMediaState({ audio: audioOn, video: track.enabled, screen: false });
  }, [audioOn, screenOn, replaceVideoTrack, broadcastMediaState]);

  const toggleScreenShare = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (screenOn) {
      // Back to camera (or nothing).
      const cam = cameraTrackRef.current;
      stream.getVideoTracks().forEach((t) => {
        if (t !== cam) {
          t.stop();
          stream.removeTrack(t);
        }
      });
      await replaceVideoTrack(cam && cam.readyState === 'live' ? cam : null);
      setScreenOn(false);
      setLocalStream(new MediaStream(stream.getTracks()));
      broadcastMediaState({ audio: audioOn, video: videoOn, screen: false });
      return;
    }

    const display = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const screenTrack = display.getVideoTracks()[0];
    screenTrack.onended = () => void toggleScreenShare(); // browser "stop sharing" button
    stream.addTrack(screenTrack);
    await replaceVideoTrack(screenTrack);
    setScreenOn(true);
    setLocalStream(new MediaStream(stream.getTracks()));
    broadcastMediaState({ audio: audioOn, video: videoOn, screen: true });
  }, [screenOn, audioOn, videoOn, replaceVideoTrack, broadcastMediaState]);

  return {
    inCall,
    localStream,
    peers: [...peers.values()],
    audioOn,
    videoOn,
    screenOn,
    joinCall,
    leaveCall,
    toggleAudio,
    toggleVideo,
    toggleScreenShare,
  };
}
