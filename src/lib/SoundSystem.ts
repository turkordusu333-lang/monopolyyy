import { UserSettings } from '../types';

class SoundSystem {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      // Create audio context lazily after user interaction
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private playTone(
    frequencies: number[],
    durations: number[],
    type: OscillatorType = 'sine',
    volume: number = 0.5,
    pitchMultiplier: number = 1.0
  ) {
    const ctx = this.initCtx();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
    masterGain.connect(ctx.destination);

    let startTime = ctx.currentTime;

    frequencies.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq * pitchMultiplier, startTime);

      const duration = durations[index] || 0.1;
      
      gainNode.gain.setValueAtTime(volume * 0.15, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gainNode);
      gainNode.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration);

      startTime += duration * 0.8; // overlap slightly or chain
    });
  }

  playDraw(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([261.63, 329.63], [0.08, 0.12], type, volume, pitch);
  }

  playPlay(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([392.00, 523.25], [0.08, 0.15], type, volume, pitch);
  }

  playCoin(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([523.25, 659.25, 783.99, 1046.50], [0.05, 0.05, 0.05, 0.2], type, volume, pitch);
  }

  playAction(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([440.00, 349.23, 440.00, 523.25], [0.1, 0.1, 0.1, 0.25], type, volume, pitch);
  }

  playSteal(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([587.33, 493.88, 392.00], [0.1, 0.1, 0.2], type, volume, pitch);
  }

  playJustSayNo(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    // Highlighted alarm pitch
    this.playTone([880.00, 587.33, 880.00], [0.08, 0.08, 0.15], 'sawtooth', volume, pitch);
  }

  playVictory(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone(
      [523.25, 659.25, 783.99, 1046.50, 783.99, 1046.50],
      [0.15, 0.15, 0.15, 0.15, 0.15, 0.4],
      type,
      volume,
      pitch
    );
  }

  playDefeat(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([392.00, 349.23, 311.13, 261.63], [0.2, 0.2, 0.2, 0.4], type, volume, pitch);
  }

  playAlert(settings: UserSettings) {
    const volume = settings.soundVolume / 100;
    const pitch = settings.soundPitch;
    const type = settings.synthType;
    this.playTone([440.00, 440.00], [0.08, 0.08], type, volume, pitch);
  }
}

export const sounds = new SoundSystem();
