"use strict";

class AudioPlayer {
  history = []
  lyricsOverrides = {}
  showLyrics = true
  donePlay(type) {
    document.title = 'Automate';
    this.currentPlay?.wakeLock?.release();
    this.currentPlay?.fire(type);
    delete all.audio.player.currentPlay;
    delete all.audio.player.currentMediaFile;
    this.registerMediaSession();
  }
  focusPlaying() {
    let ele = document.querySelector(`grid-row span[title=${JSON.stringify(this.currentMediaFile.path)}]`);
    ele.scrollIntoView({ behavior: "smooth" });
  }
  async loadLyrics() {
    delete all.audio.player.lyrics;
    let lyricsJson;
    try {
      lyricsJson = JSON.parse(await http.get('/lyrics/KLJ/'+g.files[this.currentMediaFile.path].title+'.KLJ'));
    }
    catch (e) {};
    if (lyricsJson) {
      all.audio.player.lyrics = new LyricsSystem(Object.assign(lyricsJson, this.lyricsOverrides));
      LyricsSystem.linkBufferToLyrics(g.audio.buffer, this.lyrics);
      this.lyrics.reactive = all.audio.player.lyrics;
    }
  }
  refreshMediaSession(options) {
    // TODO: move this to a right await to avoid random success and timing issue
    setTimeout(async e=>{
      navigator.mediaSession.playbackState = options.playbackState;
      if (options.playbackState == 'none') return;
      navigator.mediaSession.setPositionState({
        playbackRate: options.playbackRate ?? 1,
        position: options.position ?? g.audio.buffer.playbackTime,
        duration: options.duration ?? g.audio.buffer.audioData.duration,
      });
    }, 500);
  }
  registerMediaSession(file, thumbnailURL) {
    if (navigator.mediaSession === undefined) return;
    if (file === undefined) {
      delete navigator.mediaSession.metadata;
      this.refreshMediaSession({playbackState:'none'});
      return;
    }
    
    // Set mediaSession metadata
    let artwork = [];
    if (g.thumbnails[file.path]) artwork.push({ src: g.thumbnails[file.path].dataURL, sizes: '80x80', type: 'image/jpeg' });
    if (thumbnailURL) artwork.push({ src: thumbnailURL, sizes: '300x300', type: 'image/jpeg' });
    navigator.mediaSession.metadata = new MediaMetadata({
      title: file.title,
      artist: file.performer,
      album: file.album,
      artwork: artwork,
    });
    
    // Define media session actions
    navigator.mediaSession.setActionHandler('pause', e=>this.pause());
    navigator.mediaSession.setActionHandler('play', e=>this.play());
    navigator.mediaSession.setActionHandler('stop', e=>this.stop());
    navigator.mediaSession.setActionHandler('nexttrack', e=>this.playNext());
    navigator.mediaSession.setActionHandler('seekto', e=>{
      this.playbackTime = e.seekTime;
      this.refreshMediaSession({playbackState:'playing'});
    });
    
    this.refreshMediaSession({playbackState:'playing'});
  }
  async wakeLock() {
    if (document.visibilityState!=='visible') return;
    if (this.currentPlay?.undergo(x=>x.fired===false)) {
      this.currentPlay.wakeLock = await navigator.wakeLock.request('screen');
      //console.log('wakeLock set!', this.currentPlay.wakeLock);
    };
  }
  async playMediaFile(mediaFile, ...args) {
    await mediaFile.load();
    
    this.history.push(mediaFile.path);
    const stat = g.stats.touch(mediaFile.path, { path: mediaFile.path, playCount: 0 });
    if (typeof stat.playCount == 'string') stat.playCount = parseInt(stat.playCount);
    stat.playCount += 1;
    stat.lastPlay = new Date().toISOString();
    if (this.history.length >= 3) this.uploadHistory();
    
    this.stop();
    this.currentMediaFile = mediaFile;
    
    await g.audio.buffer.load(mediaFile.data.slice());
    if (!('length' in mediaFile.metadata)) {
      mediaFile.setMetadata('length', g.audio.buffer.audioData.duration);
    }
    g.audio.buffer.restart(...args);
    
    let imgBlob;
    (async ()=>{
      delete all.audio.player.imageDataURL;
      let tags = (await mediaFile.mediaTags()).tags;
      if (tags.picture) {
        imgBlob = new Blob([new Uint8Array(tags.picture.data)],{type: tags.picture.format});
        all.audio.player.imageDataURL = URL.createObjectURL(imgBlob);
      }
      this.registerMediaSession(g.files[mediaFile.path], imgBlob && await browse.file.dataURL(imgBlob));
      this.loadLyrics();
    })();
    
    all.audio.player.currentPlay = triggerFactory();
    this.wakeLock();
    document.title = 'Automate: Playing ' + g.files[mediaFile.path].title;
    await this.currentPlay.promise;
  }
  playNext() {
    const now = new Date().getTime();
    let weights = g.ui.fileData.mapObject(x=>{
      let weight = 1;
      let daysNotPlayed = (now - new Date(x.stats?.lastPlay ?? '1970-01-01').getTime())/86400000;
      let oldFactor = Math.max(3, x.q.qAge ?? 2) / 4;
      weight *= 1.6 ** (x.metadata?.rating ?? 3);
      weight *= 0.9 ** oldFactor;
      weight *= Math.min(8 / oldFactor ** .5, daysNotPlayed + 1);
      weight *= Math.min(1, daysNotPlayed * 2) ** 3;
      weight *= Math.min(1, daysNotPlayed * 8) ** 2;
      return weight;
    });
    weights = new pmf(weights);
    g.debug.weights = weights;
    g.ui.fileData[weights.sample()].start();
  }
  play() {
    if (this.pausePlaybackTime) {
      g.audio.buffer.restart(0, this.pausePlaybackTime);
      delete all.audio.player.pausePlaybackTime;
      this.refreshMediaSession({playbackState:'playing'});
    } else {
      this.playNext();
    }
  }
  pause() {
    all.audio.player.pausePlaybackTime = g.audio.buffer.playbackTime;
    this.refreshMediaSession({
      playbackState:'paused',
      position: g.audio.player.pausePlaybackTime,
      duration: g.audio.buffer.audioData.duration,
    });
    g.audio.buffer.stop();
  }
  stop() {
    g.audio.buffer.stop();
    this.donePlay('stopped');
    delete this.pausePlaybackTime;
  }
  uploadHistory() {
    http.post('/metadata/stats', {
      dataset: this.history.mapKeyValue(
        (k,v)=>v,
        (v,k)=>g.stats[v]
      ),
    });
    this.history = [];
  }
  set playbackTime(value) {
    if (!this.currentPlay) return;
    if (this.pausePlaybackTime !== undefined) return this.pausePlaybackTime = value;
    all.audio.buffer.restart(0, value);
  }
};