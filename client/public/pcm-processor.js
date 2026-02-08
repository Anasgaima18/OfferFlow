/**
 * PCM Audio Processor Worklet
 * Converts Float32 audio samples to Int16 PCM and posts to main thread.
 * This runs on a dedicated audio thread for low-latency, glitch-free processing.
 */
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0]; // Mono channel
      
      // Convert Float32 to Int16
      const int16Buffer = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const s = Math.max(-1, Math.min(1, channelData[i]));
        int16Buffer[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      
      // Post data to main thread
      this.port.postMessage(int16Buffer.buffer, [int16Buffer.buffer]);
    }
    return true; // Keep processor alive
  }
}

registerProcessor('pcm-processor', PCMProcessor);
