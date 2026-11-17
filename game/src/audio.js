// All sound is synthesised with WebAudio — no audio files, no network.
// Engine hum, siren, gunshots, punches, pickups and a simple bassline loop.
// Everything is created lazily on the first user gesture so browsers allow it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let musicTimer = 0;
  let musicStep = 0;
  let muted = false;

  // A slow, warm bassline in A minor that loops under the game.
  const BASSLINE = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 0, 73.42, 0];
  const BEAT = 0.24;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ctx || muted) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol || 0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start();
      osc.stop(ctx.currentTime + dur + 0.02);
    } catch { /* audio is cosmetic */ }
  }

  function noise(dur, vol, lowFreq) {
    if (!ctx || muted) return;
    try {
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowFreq || 1200;
      const gain = ctx.createGain();
      gain.gain.value = vol || 0.3;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      src.start();
    } catch { /* audio is cosmetic */ }
  }

  return {
    ensure,
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    /** Called every frame: engine pitch follows speed, siren follows wanted. */
    update(dt, speed, wanted) {
      if (!ctx || muted) return;
      try {
        const target = speed > 5 ? 0.045 + Math.min(0.09, speed / 520 * 0.09) : 0;
        engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
        engineOsc.frequency.setTargetAtTime(48 + speed * 0.16, ctx.currentTime, 0.08);
        if (wanted > 0) {
          sirenGain.gain.setTargetAtTime(0.035, ctx.currentTime, 0.2);
          const t = ctx.currentTime;
          sirenOsc.frequency.setTargetAtTime((Math.floor(t * 1.6) % 2 === 0 ? 660 : 880), t, 0.05);
        } else {
          sirenGain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        }
        // Music: one bass note per beat, quiet.
        musicTimer -= dt;
        if (musicTimer <= 0) {
          musicTimer += BEAT;
          const note = BASSLINE[musicStep % BASSLINE.length];
          musicStep += 1;
          if (note > 0) blip(note, BEAT * 0.9, 'triangle', 0.07);
        }
      } catch { /* audio is cosmetic */ }
    },
    shot() { noise(0.14, 0.5, 2600); blip(220, 0.08, 'square', 0.16, 60); },
    punch() { noise(0.08, 0.35, 700); },
    crash() { noise(0.25, 0.5, 500); },
    pickup() { blip(660, 0.1, 'sine', 0.22); blip(990, 0.16, 'sine', 0.2); },
    coin() { blip(880, 0.08, 'sine', 0.18); blip(1320, 0.12, 'sine', 0.16); },
    missionDone() {
      blip(523, 0.14, 'triangle', 0.22);
      setTimeout(() => blip(659, 0.14, 'triangle', 0.22), 130);
      setTimeout(() => blip(784, 0.24, 'triangle', 0.24), 260);
    },
    missionFail() { blip(330, 0.3, 'sawtooth', 0.18, 160); },
    busted() { blip(440, 0.4, 'sawtooth', 0.2, 110); },
    reload() { blip(300, 0.06, 'square', 0.14); setTimeout(() => blip(420, 0.06, 'square', 0.14), 120); },
    enterCar() { blip(180, 0.12, 'square', 0.16, 90); noise(0.1, 0.2, 900); },
  };
}
