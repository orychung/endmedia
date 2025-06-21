import { SoundTouch, PitchShifter } from 'https://unpkg.com/soundtouchjs@0.2.0/dist/soundtouch.js';

g.audio = {ctx: new AudioContext({sampleRate: 96000})};
g.audio.player = new AudioPlayer();

// Register AudioWorkletProcessor
async function setupSoundtouchWorklet(options={}) {
  try {
    // Load the SoundTouch AudioWorkletProcessor
    await g.audio.ctx.audioWorklet.addModule(
      'https://unpkg.com/@soundtouchjs/audio-worklet@0.2.0/dist/soundtouch-worklet.js'
    );

    // Create SoundTouch AudioWorkletNode
    let soundtouchNode = new AudioWorkletNode(g.audio.ctx, 'soundtouch-processor', {
      processorOptions: {
        sampleRate: g.audio.ctx.sampleRate,
        tempo: options.tempo ?? 1,
        pitch: options.pitch ?? 1,
      },
    });

    // Connect to destination
    soundtouchNode.connect(options.destination || g.audio.ctx.destination);
    g.audio.soundtouchNode = soundtouchNode;
  } catch (error) {
    console.error('Error setting up SoundTouch worklet:', error);
  }
}
await setupSoundtouchWorklet();
g.audio.buffer = new MusicalBuffer(g.audio.ctx, {destination: g.audio.soundtouchNode});
g.audio.buffer.addEventListener('ended', e=>{
  if (!g.audio.buffer.buffer) return;
  g.audio.player.donePlay('ended');
  g.audio.player.playNext();
});
