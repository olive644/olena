// Locally synthesized effects from the approved Saturn prototype.
export function createSaturnSound() {
  let audio: AudioContext | null = null,
    audioMaster: GainNode | null = null;
  let mixNodes: { source: AudioScheduledSourceNode; gain: GainNode }[] = [];
  async function ensureAudio() {
    const Constructor = globalThis.AudioContext;
    if (!Constructor) return false;
    try {
      if (!audio) {
        audio = new Constructor();
        audioMaster = audio.createGain();
        audioMaster.gain.value = 0.32;
        audioMaster.connect(audio.destination);
      }
      if (audio.state === "suspended") await audio.resume();
      return audio.state === "running";
    } catch {
      return false;
    }
  }
  function canSound() {
    return audio && audio.state === "running" && !document.hidden;
  }
  function noise(duration: number, frequency: number, level: number, delay = 0, track = false) {
    if (!audio || !audioMaster || !canSound()) return;
    const start = audio.currentTime + delay,
      buffer = audio.createBuffer(1, Math.ceil(duration * audio.sampleRate), audio.sampleRate),
      data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = audio.createBufferSource(),
      filter = audio.createBiquadFilter(),
      gain = audio.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + Math.min(0.02, duration * 0.15));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(audioMaster);
    source.start(start);
    source.stop(start + duration + 0.01);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
    if (track) mixNodes.push({ source, gain });
  }
  function tone(
    frequency: number,
    end: number,
    duration: number,
    level: number,
    delay = 0,
    type: OscillatorType = "sine",
    track = false,
  ) {
    if (!audio || !audioMaster || !canSound()) return;
    const start = audio.currentTime + delay,
      source = audio.createOscillator(),
      gain = audio.createGain();
    source.type = type;
    source.frequency.setValueAtTime(frequency, start);
    source.frequency.exponentialRampToValueAtTime(end, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(gain);
    gain.connect(audioMaster);
    source.start(start);
    source.stop(start + duration + 0.02);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    if (track) mixNodes.push({ source, gain });
  }
  function stopMix() {
    if (!audio) return;
    for (const { source, gain } of mixNodes) {
      try {
        gain.gain.cancelScheduledValues(audio.currentTime);
        gain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.035);
        source.stop(audio.currentTime + 0.12);
      } catch {
        // A source that has already ended needs no further stop.
      }
    }
    mixNodes = [];
  }
  function playMix() {
    stopMix();
    if (!audio || !audioMaster || !canSound()) return;
    noise(2.6, 730, 0.095, 0, true);
    for (let i = 0; i < 17; i++) {
      const delay = 0.05 + i * 0.13,
        level = 0.035 + Math.sin(i * 1.7) * 0.012;
      tone(190 + (i % 4) * 23, 75, 0.065, level, delay, "triangle", true);
      noise(0.035, 1000 + (i % 5) * 110, 0.027, delay, true);
    }
  }
  function playPick() {
    tone(420, 880, 0.16, 0.12, 0, "triangle");
    tone(660, 1180, 0.12, 0.05, 0.08, "sine");
  }
  function playExit() {
    tone(330, 125, 0.075, 0.17);
    noise(0.08, 1200, 0.12);
    tone(210, 90, 0.075, 0.12, 0.22);
    tone(175, 100, 0.09, 0.08, 0.4);
  }
  function playReveal() {
    tone(784, 784, 0.26, 0.14, 0, "triangle");
    tone(1046.5, 1046.5, 0.33, 0.12, 0.1, "triangle");
    tone(1318.5, 1318.5, 0.38, 0.055, 0.19, "sine");
  }
  function playLand() {
    tone(150, 65, 0.075, 0.11);
    noise(0.045, 520, 0.075);
  }

  return {
    unlock: ensureAudio,
    mix: playMix,
    pick: playPick,
    exit: playExit,
    reveal: playReveal,
    land: playLand,
    stop: stopMix,
    dispose() {
      stopMix();
      if (audio) void audio.close().catch(() => {});
      audio = null;
      audioMaster = null;
    },
  };
}
export type SaturnSound = ReturnType<typeof createSaturnSound>;
