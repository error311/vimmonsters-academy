// Owns: lightweight Web Audio music and sound effects. Does not own: game
// rules, rendering, or input routing beyond exposing mute/unlock methods.

const THEMES = {
  house: [261.63, 329.63, 392.0, 329.63],
  meadow: [392.0, 440.0, 523.25, 659.25],
  ridge: [220.0, 246.94, 293.66, 329.63],
  grove: [293.66, 349.23, 392.0, 440.0],
  tower: [174.61, 220.0, 261.63, 311.13],
  battle: [261.63, 311.13, 392.0, 523.25],
};

function toneSpec(kind) {
  if (kind === "step") {
    return { freq: 520, duration: 0.05, type: "square", gain: 0.045 };
  }
  if (kind === "blocked") {
    return { freq: 150, duration: 0.08, type: "square", gain: 0.04 };
  }
  if (kind === "reward") {
    return { freq: 740, duration: 0.16, type: "triangle", gain: 0.07 };
  }
  if (kind === "capture") {
    return { freq: 660, duration: 0.22, type: "sine", gain: 0.08 };
  }
  if (kind === "vimOrb") {
    return { freq: 480, duration: 0.12, type: "triangle", gain: 0.06 };
  }
  if (kind === "focus-throw") {
    return { freq: 560, duration: 0.18, type: "triangle", gain: 0.075 };
  }
  if (kind === "player-hit") {
    return { freq: 420, duration: 0.12, type: "sawtooth", gain: 0.06 };
  }
  if (kind === "enemy-hit") {
    return { freq: 240, duration: 0.12, type: "square", gain: 0.06 };
  }
  if (kind === "quick") {
    return { freq: 620, duration: 0.09, type: "square", gain: 0.055 };
  }
  if (kind === "heavy") {
    return { freq: 210, duration: 0.18, type: "square", gain: 0.07 };
  }
  if (kind === "focus") {
    return { freq: 540, duration: 0.14, type: "sine", gain: 0.05 };
  }
  if (kind === "encounter") {
    return { freq: 300, duration: 0.22, type: "sawtooth", gain: 0.06 };
  }
  if (kind === "switch") {
    return { freq: 460, duration: 0.08, type: "triangle", gain: 0.05 };
  }
  return { freq: 360, duration: 0.08, type: "triangle", gain: 0.045 };
}

export function createAudioRuntime(deps) {
  const { state } = deps;
  let audioContext = null;
  let masterGain = null;
  let musicGain = null;
  let fxGain = null;
  let unlocked = false;
  let muted = false;
  let themeId = "";
  let nextBeatAt = 0;
  let beatIndex = 0;

  function ensureAudioContext() {
    if (audioContext) {
      return audioContext;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    audioContext = new AudioCtor();
    masterGain = audioContext.createGain();
    musicGain = audioContext.createGain();
    fxGain = audioContext.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    musicGain.gain.value = 0.12;
    fxGain.gain.value = 0.18;
    musicGain.connect(masterGain);
    fxGain.connect(masterGain);
    masterGain.connect(audioContext.destination);
    return audioContext;
  }

  function playTone(targetGain, freq, when, duration, type, gainValue) {
    if (!audioContext || !targetGain || !freq) {
      return;
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type || "square";
    oscillator.frequency.setValueAtTime(freq, when);
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(gainValue, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(gain);
    gain.connect(targetGain);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.02);
  }

  async function unlockAudio() {
    const ctx = ensureAudioContext();
    if (!ctx) {
      return false;
    }
    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    unlocked = true;
    return true;
  }

  function currentTheme() {
    if (state.mode === "battle") {
      return "battle";
    }
    return state.map || "house";
  }

  function tickAudio() {
    const ctx = ensureAudioContext();
    if (!ctx || !unlocked || muted) {
      return;
    }
    const nextTheme = currentTheme();
    if (nextTheme !== themeId) {
      themeId = nextTheme;
      nextBeatAt = ctx.currentTime + 0.04;
      beatIndex = 0;
    }
    const pattern = THEMES[themeId] || THEMES.house;
    const beatLength = themeId === "battle" ? 0.21 : 0.33;
    while (nextBeatAt < ctx.currentTime + 0.25) {
      const note = pattern[beatIndex % pattern.length];
      playTone(musicGain, note, nextBeatAt, beatLength * 0.72, themeId === "battle" ? "square" : "triangle", 0.04);
      playTone(musicGain, note / 2, nextBeatAt, beatLength * 0.58, "sine", 0.018);
      nextBeatAt += beatLength;
      beatIndex += 1;
    }
  }

  function playSound(kind) {
    const ctx = ensureAudioContext();
    if (!ctx || !unlocked || muted) {
      return;
    }
    const spec = toneSpec(kind);
    playTone(fxGain, spec.freq, ctx.currentTime, spec.duration, spec.type, spec.gain);
    if (kind === "reward" || kind === "capture") {
      playTone(fxGain, spec.freq * 1.25, ctx.currentTime + 0.04, spec.duration * 0.85, "triangle", spec.gain * 0.75);
    }
  }

  function toggleMute() {
    muted = !muted;
    if (masterGain && audioContext) {
      masterGain.gain.setValueAtTime(muted ? 0 : 1, audioContext.currentTime);
    }
    return muted;
  }

  return {
    unlockAudio,
    tickAudio,
    playSound,
    toggleMute,
    isMuted() {
      return muted;
    },
  };
}
