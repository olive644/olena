import { expect, it } from "vitest";
import { prepareSpeechAudio } from "./english-speech-audio";

const SAMPLE_RATE = 16000;
function capture(options: {
  lead: number;
  tone: number;
  tail: number;
  amplitude: number;
  dc?: number;
  noise?: number;
}) {
  const { lead, tone, tail, amplitude, dc = 0, noise = 0 } = options;
  const out = new Float32Array(Math.round((lead + tone + tail) * SAMPLE_RATE));
  let seed = 7;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 - 0.5) * 2;
  for (let n = 0; n < out.length; n++) {
    const t = n / SAMPLE_RATE;
    const speaking = t >= lead && t < lead + tone;
    out[n] =
      dc + noise * random() + (speaking ? amplitude * Math.sin(2 * Math.PI * 220 * (t - lead)) : 0);
  }
  return out;
}
const peak = (pcm: Float32Array) => pcm.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);

it("cuts the silence around the voice, keeping a short margin and padding", () => {
  const input = capture({ lead: 0.9, tone: 1.2, tail: 1, amplitude: 0.3, noise: 0.002 });
  const output = prepareSpeechAudio(input);
  const seconds = output.length / SAMPLE_RATE;
  // 1,2 s de voz + 2 x 280 ms de margem + 2 x 300 ms de silêncio, bem menos que os 3,1 s capturados.
  expect(seconds).toBeGreaterThan(1.2 + 0.56 + 0.6 - 0.1);
  expect(seconds).toBeLessThan(1.2 + 0.56 + 0.6 + 0.1);
  expect(output.length).toBeLessThan(input.length * 0.8);
});
it("raises a quiet phone recording to a usable level without exceeding full scale", () => {
  const output = prepareSpeechAudio(
    capture({ lead: 0.5, tone: 1, tail: 1, amplitude: 0.03, noise: 0.0005 }),
  );
  expect(peak(output)).toBeGreaterThan(0.85);
  expect(peak(output)).toBeLessThanOrEqual(0.9 + 1e-6);
});
it("limits the gain so that background noise is never turned into speech", () => {
  const input = capture({ lead: 0.5, tone: 1, tail: 1, amplitude: 0.004, noise: 0.0002 });
  const output = prepareSpeechAudio(input);
  expect(peak(output)).toBeLessThanOrEqual(0.004 * 1.1 * 31.6);
  expect(peak(output)).toBeLessThan(0.9);
});
it("does not make a loud recording louder and removes a constant offset", () => {
  const output = prepareSpeechAudio(
    capture({ lead: 0.4, tone: 1, tail: 0.6, amplitude: 0.95, dc: 0.02 }),
  );
  expect(peak(output)).toBeLessThanOrEqual(0.9 + 1e-6);
  const mean = output.reduce((sum, sample) => sum + sample, 0) / output.length;
  expect(Math.abs(mean)).toBeLessThan(0.01);
});
it("returns silence and tiny inputs untouched, as a copy, never as the caller's buffer", () => {
  const silence = new Float32Array(SAMPLE_RATE);
  const out = prepareSpeechAudio(silence);
  expect(out).not.toBe(silence);
  expect(out).toHaveLength(silence.length);
  expect(peak(out)).toBe(0);
  const tiny = new Float32Array([0.1, 0.2, 0.3]);
  const copy = prepareSpeechAudio(tiny);
  expect(copy).not.toBe(tiny);
  expect([...copy]).toEqual([...tiny]);
});
it("does not modify the captured buffer it reads from", () => {
  const input = capture({ lead: 0.6, tone: 0.8, tail: 0.8, amplitude: 0.2 });
  const before = input.slice();
  prepareSpeechAudio(input);
  expect([...input]).toEqual([...before]);
});
