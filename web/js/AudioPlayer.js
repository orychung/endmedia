"use strict";

class AudioPlayer {
  _gain = 30
  _keyShift = 0
  _playbackRate = 1
  history = []
  lyricsOverrides = {}
  showLyrics = true
  constructor(data) {
    this.buffer = data.buffer;
    this.soundtouchNode = data.soundtouchNode;
    
    this.reactive = this; // must reassign this to Vue proxy version for reactivity
  }
  donePlay(type) {
    document.title = 'Automate';
    this.currentPlay?.wakeLock?.release();
    this.currentPlay?.fire(type);
    delete this.reactive.currentPlay;
    delete this.reactive.currentMediaFile;
    this.registerMediaSession();
  }
  focusPlaying() {
    let ele = document.querySelector(`grid-row span[title=${JSON.stringify(this.currentMediaFile.path)}]`)
      .parentNode.parentNode.parentNode.children;
    g.debug.lastFocus = ele;
    ele.thumbnail.scrollIntoView({ behavior: "smooth" });
  }
  async loadLyrics() {
    delete this.reactive.lyrics;
    let lyricsJson;
    try {
      lyricsJson = JSON.parse(await http.get('/lyrics/KLJ/'+g.files[this.currentMediaFile.path].title+'.KLJ'));
    }
    catch (e) {};
    if (lyricsJson) {
      this.reactive.lyrics = new LyricsSystem(Object.assign(lyricsJson, this.lyricsOverrides));
      LyricsSystem.linkBufferToLyrics(this.buffer, this.lyrics);
      this.lyrics.reactive = this.reactive.lyrics;
    }
  }
  refreshMediaSession(options) {
    navigator.mediaSession.playbackState = options.playbackState;
    this.reactive.paused = (options.playbackState == 'paused');
    if (options.playbackState == 'none') return;
    navigator.mediaSession.setPositionState({
      playbackRate: options.playbackRate ?? this._playbackRate,
      position: options.position ?? this.buffer.playbackTime,
      duration: options.duration ?? this.buffer.audioData.duration,
    });
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
    
    // TODO: move this to a right await to avoid random success and timing issue
    setTimeout(async e=>{
      this.refreshMediaSession({playbackState:'playing'});
    }, 500);
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
    
    await this.buffer.load(mediaFile.data.slice());
    if (!(mediaFile.metadata?.length)) {
      mediaFile.setMetadata('length', this.buffer.audioData.duration);
    }
    this.buffer.restart(...args);
    
    let imgBlob;
    let imgDataURL;
    (async ()=>{
      delete this.reactive.imageBlobURL;
      let tags = (await mediaFile.mediaTags()).tags;
      if (tags.picture) {
        imgBlob = new Blob([new Uint8Array(tags.picture.data)],{type: tags.picture.format});
        this.reactive.imageBlobURL = URL.createObjectURL(imgBlob);
        
        // resample image to 300x300:
        const canvas = document.createElement('canvas');
        await canvas.loadFile(this.imageBlobURL, {
          maxHeight: 300,
          maxWidth: 300,
        });
        imgDataURL = canvas.toDataURL('image/jpeg', 0.9);
      }
      this.registerMediaSession(g.files[mediaFile.path], imgBlob && imgDataURL);
      this.loadLyrics();
    })();
    
    this.reactive.currentPlay = triggerFactory();
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
    weights = new PMF(weights);
    g.debug.weights = weights;
    g.ui.fileData[weights.sample()].start(undefined, 0);
  }
  play() {
    if (this.buffer.pausePlaybackTime) {
      this.buffer.start();
      // TODO: move this to a right await to avoid random success and timing issue
      setTimeout(async e=>{
        this.refreshMediaSession({playbackState:'playing'});
      }, 500);
    } else {
      this.playNext();
    }
  }
  pause() {
    this.buffer.pause();
    this.refreshMediaSession({
      playbackState:'paused',
      position: this.buffer.pausePlaybackTime,
      duration: this.buffer.audioData.duration,
    });
  }
  stop() {
    this.buffer.stop();
    this.donePlay('stopped');
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
    this.buffer.restart(0, value);
  }
  get gain() {
    return this._gain;
  }
  set gain(value) {
    this.buffer.gain.setParam('gain', value/100);
    return this._gain = Math.round(value);
  }
  get keyShift() {
    return this._keyShift;
  }
  set keyShift(value) {
    this._keyShift = value
    this.soundtouchNode.setParam('pitch', 2**(this._keyShift/12) / this._playbackRate);
    return this._keyShift;
  }
  get playbackRate() {
    return this._playbackRate;
  }
  set playbackRate(value) {
    this._playbackRate = value
    this.buffer.buffer.setParam('playbackRate', this._playbackRate);
    this.soundtouchNode.setParam('pitch', 2**(this._keyShift/12) / this._playbackRate);
    return this._playbackRate;
  }
};
