import { describe, expect, it } from "vitest";
import { createPenMeter } from "./handwriting-pen-meter";

describe("medidor da caneta", () => {
  it("não mostra nada antes do primeiro traço", () => {
    expect(createPenMeter().snapshot(100)).toBeNull();
  });

  it("conta entrada, fila, quadros lentos e desenho de um traço", () => {
    const meter = createPenMeter();
    meter.begin(1000);
    // Quatro eventos com dois pontos cada, o terceiro esperou 40 ms na fila.
    meter.recordEvent(1010, 2, 1012);
    meter.recordEvent(1020, 2, 1023);
    meter.recordEvent(1080, 2, 1120);
    meter.recordEvent(1090, 2, 1091);
    for (const at of [1000, 1016, 1032, 1100, 1116]) meter.recordFrame(at);
    meter.recordPaint(2);
    meter.recordPaint(6);
    meter.end(2000);
    const shot = meter.snapshot(9999)!;
    expect(shot.durationSeconds).toBe(1);
    expect(shot.eventsPerSecond).toBe(4);
    expect(shot.samplesPerSecond).toBe(8);
    expect(shot.deliveryMax).toBe(40);
    expect(shot.inputGapMax).toBe(60);
    expect(shot.frames).toBe(4);
    expect(shot.slowFrames).toBe(1);
    expect(shot.frameMax).toBe(68);
    expect(shot.paintAverage).toBe(4);
    expect(shot.paintMax).toBe(6);
  });

  it("depois de soltar a caneta os números ficam parados", () => {
    const meter = createPenMeter();
    meter.begin(0);
    meter.recordEvent(5, 1, 6);
    meter.end(1000);
    meter.recordEvent(1500, 5, 1501);
    meter.recordFrame(1600);
    expect(meter.snapshot(5000)?.eventsPerSecond).toBe(1);
    expect(meter.snapshot(5000)?.frames).toBe(0);
  });

  it("um traço novo zera o anterior", () => {
    const meter = createPenMeter();
    meter.begin(0);
    meter.recordEvent(5, 3, 6);
    meter.end(100);
    meter.begin(200);
    expect(meter.snapshot(300)?.samplesPerSecond).toBe(0);
  });
});
