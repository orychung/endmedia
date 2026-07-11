import { SoundTouch, PitchShifter } from 'https://unpkg.com/soundtouchjs@0.2.0/dist/soundtouch.js';

// Register AudioWorkletProcessor
async function setupSoundtouchWorklet(options={}) {
  if (!options.container) throw 'container is missing from options';
  if (!options.context) throw 'context is missing from options';
  try {
    // Load the SoundTouch AudioWorkletProcessor
    await options.context.audioWorklet.addModule(
      'https://unpkg.com/@soundtouchjs/audio-worklet@0.2.0/dist/soundtouch-worklet.js'
    );
    
    // Create SoundTouch AudioWorkletNode (NOTE: this is not an AudioNode)
    let soundtouchNode = new AudioWorkletNode(options.context, 'soundtouch-processor', {
      processorOptions: {
        sampleRate: options.context.sampleRate,
        pitch: options.pitch ?? 1,
      },
    });
    
    const RAMP_SHARP_GAP = 0.01;
    soundtouchNode.setParam = function setParam(name, value, delay = 0) {
      this.parameters.get(name)
        .exponentialRampToValueAtTime(value, this.context.currentTime + RAMP_SHARP_GAP + delay);
    };
    
    // Connect to destination
    soundtouchNode.connect(options.context.destination);
    options.container.soundtouchNode = soundtouchNode;
  } catch (error) {
    console.error('Error setting up SoundTouch worklet:', error);
  }
}

g.audio = {context: new AudioContext({sampleRate: 96000})};
await setupSoundtouchWorklet({container: g.audio, context: g.audio.context});
g.audio.buffer = new MusicalBuffer(g.audio.context, {destination: g.audio.soundtouchNode});
g.audio.player = new AudioPlayer({buffer: g.audio.buffer, soundtouchNode: g.audio.soundtouchNode});
g.audio.buffer.addEventListener('ended', e=>{
  if (!g.audio.buffer.buffer) return;
  g.audio.player.donePlay('ended');
  g.audio.player.playNext();
});
