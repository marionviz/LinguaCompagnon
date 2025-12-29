// public/microphone-processor.worklet.js
// AudioWorklet pour capture microphone (remplace ScriptProcessorNode)

class MicrophoneProcessor extends AudioWorkletProcessor {
  process(inputs, outputs) {
    const input = inputs[0];
    
    if (input && input.length > 0) {
      const channelData = input[0];
      
      // Convertir Float32Array en PCM16 Int16Array
      const pcm16 = new Int16Array(channelData.length);
      for (let i = 0; i < channelData.length; i++) {
        const sample = Math.max(-1, Math.min(1, channelData[i]));
        pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      }
      
      // Envoyer au thread principal
      this.port.postMessage({
        type: 'audiodata',
        data: pcm16.buffer
      }, [pcm16.buffer]);
    }
    
    return true; // Continue processing
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);