/* global AudioWorkletProcessor, registerProcessor, sampleRate */

class GdMicrophoneCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = options.processorOptions?.targetRate || 16000;
    this.sourceRate = sampleRate;
    this.sourceRatio = this.sourceRate / this.targetRate;
    this.sourceTotal = 0;
    this.sourceCount = 0;
    this.muted = false;
    this.port.onmessage = (event) => {
      if (event.data?.type === "mute") this.muted = Boolean(event.data.muted);
    };
  }

  process(inputs, outputs) {
    const input = inputs[0]?.[0];
    const output = outputs[0]?.[0];
    if (output) output.fill(0);
    if (!input) return true;

    const samples = [];
    for (const value of input) {
      this.sourceTotal += value;
      this.sourceCount += 1;
      if (this.sourceCount >= this.sourceRatio) {
        samples.push(Math.max(-1, Math.min(1, this.sourceTotal / this.sourceCount)) * 0x7fff);
        this.sourceTotal = 0;
        this.sourceCount = 0;
      }
    }

    if (!this.muted && samples.length) {
      const pcm = Int16Array.from(samples);
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}

registerProcessor("gd-microphone-capture", GdMicrophoneCaptureProcessor);
