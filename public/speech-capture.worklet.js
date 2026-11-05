/* global AudioWorkletProcessor, registerProcessor, sampleRate */
class EnglishCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(1600);
    this.at = 0;
    // No fim da gravação o cliente pede o que sobrou no bloco parcial: sem isso o final da
    // última palavra (até 100 ms) se perdia.
    this.port.onmessage = (event) => {
      if (event.data !== "flush") return;
      const rest = this.samples.slice(0, this.at);
      this.at = 0;
      this.port.postMessage({ samples: rest, sampleRate, flush: true }, [rest.buffer]);
    };
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (channel)
      for (const sample of channel) {
        this.samples[this.at++] = sample;
        if (this.at === this.samples.length) {
          this.port.postMessage({ samples: this.samples, sampleRate }, [this.samples.buffer]);
          this.samples = new Float32Array(1600);
          this.at = 0;
        }
      }
    return true;
  }
}
registerProcessor("english-capture", EnglishCapture);
