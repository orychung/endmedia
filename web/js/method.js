import {setupSoundtouchWorklet} from 'https://cdn.jsdelivr.net/gh/orychung/endfw@0.8.6/client/integration/soundtouch.js';

g.audio = {context: new AudioContext({sampleRate: 96000})};
g.audio.soundtouchNode = await setupSoundtouchWorklet(g.audio.context);
g.audio.buffer = new MusicalBuffer(g.audio.context, {destination: g.audio.soundtouchNode});
g.audio.player = new AudioPlayer({buffer: g.audio.buffer, soundtouchNode: g.audio.soundtouchNode});
g.audio.buffer.addEventListener('ended', e=>{
  if (!g.audio.buffer.buffer) return;
  g.audio.player.donePlay('ended');
  g.audio.player.playNext();
});
