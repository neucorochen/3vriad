const AeroAudio = (() => {
  let ctx = null;
  let musicEnabled = false;
  let musicTimer = null;
  let stepIndex = 0;

  // Воздушные аккорды в духе Frutiger Aero (Cmaj9, Am9, Fmaj9, G6)
  const CHORDS = [
    [261.63, 329.63, 392.0, 493.88, 587.33],
    [220.0,  261.63, 329.63, 392.0, 493.88],
    [174.61, 220.0,  261.63, 329.63, 392.0],
    [196.0,  246.94, 293.66, 329.63, 440.0]
  ];

  const ARP_NOTES = [523.25, 659.25, 783.99, 987.77, 1174.66, 987.77, 783.99, 659.25];

  function ensureContext() {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // Мягкий желейный «бульк» при клике/свайпе
  function playSquish(pitch = 1) {
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(520 * pitch, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(340 * pitch, now + 0.14);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Звонкий пузырьковый звук совпадения с ростом тона от комбо
  function playPop(combo = 1) {
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const baseFreq = 420 * Math.pow(1.09, Math.min(combo, 10));

    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.65, now + 0.12);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Мягкий звук ошибки (если ход не дал 3 в ряд)
  function playInvalid() {
    const audio = ensureContext();
    if (!audio) return;

    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const gain = audio.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  function scheduleMusicStep() {
    if (!musicEnabled || !ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;

    // Раз в 4 шага играем мягкий аккорд-пэд
    if (stepIndex % 4 === 0) {
      const chord = CHORDS[(stepIndex / 4) % CHORDS.length];
      chord.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.018, now + 0.35);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 2.15);
      });
    }

    // Стеклянный колокольчик-арпеджио
    const note = ARP_NOTES[stepIndex % ARP_NOTES.length];
    const bell = ctx.createOscillator();
    const bellGain = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(note, now);

    bellGain.gain.setValueAtTime(0.0001, now);
    bellGain.gain.linearRampToValueAtTime(0.026, now + 0.03);
    bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    bell.connect(bellGain);
    bellGain.connect(ctx.destination);
    bell.start(now);
    bell.stop(now + 0.68);

    stepIndex++;
  }

  function setMusic(enabled) {
    musicEnabled = enabled;
    Storage.saveMusicPref(enabled);

    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }

    if (musicEnabled) {
      ensureContext();
      scheduleMusicStep();
      musicTimer = setInterval(scheduleMusicStep, 520);
    }
  }

  function isMusicEnabled() {
    return musicEnabled;
  }

  return {
    ensureContext,
    playSquish,
    playPop,
    playInvalid,
    setMusic,
    isMusicEnabled
  };
})();
