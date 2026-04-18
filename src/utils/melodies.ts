export type MelodyId = "classic" | "chime" | "digital" | "pulse" | "arpeggio" | "bell";

export const MELODY_OPTIONS: { id: MelodyId; label: string; icon: string }[] = [
  { id: "classic", label: "Классика", icon: "Music" },
  { id: "chime", label: "Колокольчик", icon: "Bell" },
  { id: "digital", label: "Цифровой", icon: "Radio" },
  { id: "pulse", label: "Импульс", icon: "Activity" },
  { id: "arpeggio", label: "Арпеджио", icon: "Music2" },
  { id: "bell", label: "Звонок", icon: "BellRing" },
];

type Note = { freq: number; start: number; dur: number; vol?: number; type?: OscillatorType };

const MELODIES: Record<MelodyId, Note[]> = {
  classic: [
    { freq: 523, start: 0.0, dur: 0.18, vol: 1.0, type: "triangle" },
    { freq: 659, start: 0.22, dur: 0.18, vol: 1.0, type: "triangle" },
    { freq: 784, start: 0.44, dur: 0.22, vol: 1.0, type: "triangle" },
    { freq: 1047, start: 0.7, dur: 0.35, vol: 1.0, type: "triangle" },
  ],
  chime: [
    { freq: 880, start: 0.0, dur: 0.35, vol: 0.9, type: "sine" },
    { freq: 1175, start: 0.15, dur: 0.4, vol: 0.8, type: "sine" },
    { freq: 1568, start: 0.35, dur: 0.5, vol: 0.7, type: "sine" },
  ],
  digital: [
    { freq: 1000, start: 0.0, dur: 0.08, vol: 1.0, type: "square" },
    { freq: 1500, start: 0.12, dur: 0.08, vol: 1.0, type: "square" },
    { freq: 1000, start: 0.24, dur: 0.08, vol: 1.0, type: "square" },
    { freq: 1500, start: 0.36, dur: 0.08, vol: 1.0, type: "square" },
    { freq: 2000, start: 0.48, dur: 0.2, vol: 1.0, type: "square" },
  ],
  pulse: [
    { freq: 440, start: 0.0, dur: 0.12, vol: 1.0, type: "sawtooth" },
    { freq: 440, start: 0.2, dur: 0.12, vol: 1.0, type: "sawtooth" },
    { freq: 440, start: 0.4, dur: 0.12, vol: 1.0, type: "sawtooth" },
    { freq: 880, start: 0.6, dur: 0.3, vol: 1.0, type: "sawtooth" },
  ],
  arpeggio: [
    { freq: 392, start: 0.0, dur: 0.1, vol: 0.9, type: "triangle" },
    { freq: 494, start: 0.1, dur: 0.1, vol: 0.9, type: "triangle" },
    { freq: 587, start: 0.2, dur: 0.1, vol: 0.9, type: "triangle" },
    { freq: 784, start: 0.3, dur: 0.1, vol: 0.9, type: "triangle" },
    { freq: 988, start: 0.4, dur: 0.1, vol: 0.9, type: "triangle" },
    { freq: 1175, start: 0.5, dur: 0.3, vol: 1.0, type: "triangle" },
  ],
  bell: [
    { freq: 1760, start: 0.0, dur: 0.25, vol: 0.9, type: "sine" },
    { freq: 1320, start: 0.05, dur: 0.5, vol: 0.6, type: "sine" },
    { freq: 1760, start: 0.5, dur: 0.25, vol: 0.9, type: "sine" },
    { freq: 1320, start: 0.55, dur: 0.6, vol: 0.6, type: "sine" },
  ],
};

export function playMelody(id: MelodyId = "classic", repeat = false) {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const notes = MELODIES[id] || MELODIES.classic;
    const now = ctx.currentTime;
    let totalDur = 0;

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = n.type || "triangle";
      osc.frequency.value = n.freq;
      const t = now + n.start;
      const vol = n.vol ?? 1;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.03);
      gain.gain.linearRampToValueAtTime(vol * 0.8, t + n.dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, t + n.dur);
      osc.start(t);
      osc.stop(t + n.dur);
      totalDur = Math.max(totalDur, n.start + n.dur);
    }

    if (repeat) setTimeout(() => playMelody(id, false), Math.max(1500, totalDur * 1000 + 500));
  } catch {
    /* AudioContext недоступен */
  }
}
