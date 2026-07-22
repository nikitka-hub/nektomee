/**
 * Web Audio API helper for sound visualizers, voice effects, and synthesized reactions.
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private remoteAnalyser: AnalyserNode | null = null;
  private voiceFxNodes: {
    delay?: DelayNode;
    feedback?: GainNode;
    filter?: BiquadFilterNode;
    oscillator?: OscillatorNode;
  } = {};

  public isMuted: boolean = false;
  public volume: number = 1.0;

  public getMicStream(): MediaStream | null {
    if (this.micStream && this.micStream.active) {
      return this.micStream;
    }
    return null;
  }

  public async initMicrophone(): Promise<MediaStream> {
    if (this.micStream && this.micStream.active && this.micStream.getAudioTracks().some((t) => t.readyState === 'live')) {
      return this.micStream;
    }

    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume().catch((e) => console.warn('AudioContext resume error:', e));
    }

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    this.micSourceNode = this.ctx.createMediaStreamSource(this.micStream);
    this.localAnalyser = this.ctx.createAnalyser();
    this.localAnalyser.fftSize = 64;
    this.micSourceNode.connect(this.localAnalyser);

    return this.micStream;
  }

  public attachRemoteStream(stream: MediaStream): HTMLAudioElement {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch((e) => console.warn('AudioContext resume error:', e));
    }
    
    const audioEl = new Audio();
    audioEl.srcObject = stream;
    audioEl.autoplay = true;

    audioEl.play().catch((err) => {
      console.warn('Remote audio playback autoplay blocked:', err);
    });

    try {
      const remoteSourceNode = this.ctx.createMediaStreamSource(stream);
      this.remoteAnalyser = this.ctx.createAnalyser();
      this.remoteAnalyser.fftSize = 64;
      remoteSourceNode.connect(this.remoteAnalyser);
    } catch (e) {
      console.warn('Could not connect remote stream to web audio context:', e);
    }

    return audioEl;
  }

  public getLocalVolume(): number {
    if (!this.localAnalyser || this.isMuted) return 0;
    const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
    this.localAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return Math.min(100, Math.round((sum / dataArray.length) * 1.5));
  }

  public getRemoteVolume(): number {
    if (!this.remoteAnalyser) return 0;
    const dataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
    this.remoteAnalyser.getByteFrequencyData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return Math.min(100, Math.round((sum / dataArray.length) * 1.5));
  }

  public getLocalFrequencies(): Uint8Array {
    if (!this.localAnalyser || this.isMuted) return new Uint8Array(16);
    const dataArray = new Uint8Array(this.localAnalyser.frequencyBinCount);
    this.localAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public getRemoteFrequencies(): Uint8Array {
    if (!this.remoteAnalyser) return new Uint8Array(16);
    const dataArray = new Uint8Array(this.remoteAnalyser.frequencyBinCount);
    this.remoteAnalyser.getByteFrequencyData(dataArray);
    return dataArray;
  }

  public setMicMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }

  public stopMicrophone() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  // Synthesized Sound Effects for Soundboard
  public playReactionSound(type: string) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const now = this.ctx.currentTime;

    switch (type) {
      case 'applause': {
        // Synthesize noise applause
        const bufferSize = this.ctx.sampleRate * 0.8;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1200;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        whiteNoise.start(now);
        break;
      }

      case 'laugh': {
        // Playful double arpeggio synth
        [300, 400, 500, 600, 750].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.08);

          gain.gain.setValueAtTime(0.2, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.08 + 0.12);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.12);
        });
        break;
      }

      case 'heart': {
        // Gentle double pulse heart beat
        [150, 140].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.18);

          gain.gain.setValueAtTime(0.4, now + idx * 0.18);
          gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.18 + 0.2);

          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.18);
          osc.stop(now + idx * 0.18 + 0.2);
        });
        break;
      }

      case 'bell': {
        // High chime
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.3);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
        break;
      }

      case 'wow': {
        // Rising whistle
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.4);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      }
    }
  }

  // AI Speech Output Helper
  public speakText(text: string, onEnd?: () => void) {
    if (!('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ru-RU';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a Russian voice if available
    const voices = window.speechSynthesis.getVoices();
    const ruVoice = voices.find((v) => v.lang.includes('ru') || v.lang.includes('RU'));
    if (ruVoice) {
      utterance.voice = ruVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };
    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  }
}
