/* global AudioWorkletProcessor, registerProcessor, sampleRate */
class EnglishCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(3200);
    this.at = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel)
      for (const sample of channel) {
        this.samples[this.at++] = sample;
        if (this.at === this.samples.length) {
          this.port.postMessage({ samples: this.samples, sampleRate }, [this.samples.buffer]);
          this.samples = new Float32Array(3200);
          this.at = 0;
        }
      }
    return true;
  }
}
registerProcessor("english-capture", EnglishCapture);
