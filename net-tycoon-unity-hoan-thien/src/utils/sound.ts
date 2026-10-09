/**
 * Web Audio API synthesizer for realistic Net Tycoon sound effects
 * No external audio files needed - pure zero-latency synthesis
 */

class SoundController {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Tiếng bật công tắc cơ học (Click / Thump)
  playPowerSwitch(turnOn: boolean) {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Click transient
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = turnOn ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(turnOn ? 420 : 280, now);
      osc.frequency.exponentialRampToValueAtTime(turnOn ? 880 : 120, now + 0.08);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);

      // Nếu bật máy: kèm tiếng quạt khởi động vù nhẹ
      if (turnOn) {
        const fanOsc = this.ctx.createOscillator();
        const fanGain = this.ctx.createGain();
        fanOsc.type = 'sine';
        fanOsc.frequency.setValueAtTime(220, now + 0.05);
        fanOsc.frequency.exponentialRampToValueAtTime(550, now + 0.35);

        fanGain.gain.setValueAtTime(0.08, now + 0.05);
        fanGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        fanOsc.connect(fanGain);
        fanGain.connect(this.ctx.destination);
        fanOsc.start(now + 0.05);
        fanOsc.stop(now + 0.4);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  // Tiếng cộng tiền nhảy Ting Ting (+5.000 VNĐ)
  playCashChime() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Two harmonic bell chime tones
      [987.77, 1318.51].forEach((freq, index) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        const delay = index * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.18, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + 0.45);
      });
    } catch {
      // Ignore audio error
    }
  }

  // Tiếng bước chân nhẹ
  playFootstep() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // Ignore
    }
  }
}

export const soundController = new SoundController();
