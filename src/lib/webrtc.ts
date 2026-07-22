/**
 * WebRTC PeerConnection manager for anonymous 1-on-1 audio calling
 */

const STUN_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class WebRTCClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private sendSignalCallback: (payload: any) => void;
  private onRemoteStreamCallback: (stream: MediaStream) => void;
  private onConnectionStateChangeCallback: (state: RTCPeerConnectionState) => void;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(
    sendSignal: (payload: any) => void,
    onRemoteStream: (stream: MediaStream) => void,
    onConnectionStateChange: (state: RTCPeerConnectionState) => void
  ) {
    this.sendSignalCallback = sendSignal;
    this.onRemoteStreamCallback = onRemoteStream;
    this.onConnectionStateChangeCallback = onConnectionStateChange;
  }

  public async createPeerConnection(localStream: MediaStream, isInitiator: boolean) {
    this.close();

    this.localStream = localStream;
    this.pc = new RTCPeerConnection(STUN_SERVERS);
    this.pendingCandidates = [];

    // Add local tracks
    localStream.getAudioTracks().forEach((track) => {
      if (this.pc && this.localStream) {
        this.pc.addTrack(track, this.localStream);
      }
    });

    // ICE Candidate handler
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalCallback({
          candidate: event.candidate.toJSON(),
        });
      }
    };

    // Track handler for remote stream
    this.pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.onRemoteStreamCallback(event.streams[0]);
      }
    };

    // Connection state handler
    this.pc.onconnectionstatechange = () => {
      if (this.pc) {
        this.onConnectionStateChangeCallback(this.pc.connectionState);
      }
    };

    if (isInitiator) {
      try {
        const offer = await this.pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: false,
        });
        await this.pc.setLocalDescription(offer);
        this.sendSignalCallback({ offer });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    }
  }

  public async handleSignal(payload: any) {
    if (!this.pc) return;

    try {
      if (payload.offer) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.offer));
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.sendSignalCallback({ answer });
        await this.processPendingCandidates();
      } else if (payload.answer) {
        await this.pc.setRemoteDescription(new RTCSessionDescription(payload.answer));
        await this.processPendingCandidates();
      } else if (payload.candidate) {
        if (this.pc.remoteDescription && this.pc.remoteDescription.type) {
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          this.pendingCandidates.push(payload.candidate);
        }
      }
    } catch (err) {
      console.error('Error handling WebRTC signal:', err);
    }
  }

  private async processPendingCandidates() {
    if (!this.pc || !this.pc.remoteDescription) return;
    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('Error adding queued ICE candidate:', err);
        }
      }
    }
  }

  public close() {
    if (this.pc) {
      this.pc.onicecandidate = null;
      this.pc.ontrack = null;
      this.pc.onconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }
    this.pendingCandidates = [];
  }
}
