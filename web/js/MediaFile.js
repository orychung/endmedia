"use strict";

class MediaFile {
  constructor(...args) {
    Object.assign(this, ...args);
  }
  get ext() {return this.filename.split('.').slice(1).at(-1).toUpperCase();}
  get filename() {return this.path.split(/[\/\\]/).at(-1);}
  get fileInfo() {return g.files[this.path];}
  get metadata() {return g.metadata[this.path];}
  get mimeType() {return {
    'MP3': 'audio/mpeg; charset=utf-8',
  }[this.ext];}
  get thumbnail() {return g.thumbnails[this.path];}
  info() {
    console.log(this);
    console.log(this.library.replace(/\//g,　'\\') + '\\' +　this.path);
    g.debug.file = this;
  }
  async load() {
    if (this.data == undefined)
      this.data = await http.post.asBinary('/mediaFile/readFile', {library: this.library, path: this.path});
    g.loadedQueue.push(this);
    return this;
  }
  async register() {
    let tags = (await this.mediaTags()).tags; //TODO: wrap this in try block
    all.files[this.path] = {
      path: this.path,
      title: tags.title,
      performer: tags.artist,
      year: tags.TDRC?.data,
      album: tags.album,
      'track#': tags.track?.split('/')?.[0],
    };
    
    if (tags.picture) {
      const THUMBNAIL_SIZE = 80;
      let blob = new Blob([new Uint8Array(tags.picture.data)],{type: tags.picture.format});
      let url = URL.createObjectURL(blob);
      let canvas = document.createElement('canvas');
      g.debug.canvas = canvas;
      await canvas.loadFile(url, {
        height: THUMBNAIL_SIZE,
        width: THUMBNAIL_SIZE,
      });
      all.thumbnails[this.path] = {
        path: this.path,
        dataURL: canvas.toDataURL('image/jpeg', 0.99),
      };
      await http.post('/metadata/thumbnails', {dataset: {
        [this.path]: all.thumbnails[this.path],
      }});
    }
    
    await http.post('/metadata/files', {dataset: {
      [this.path]: all.files[this.path],
    }});
  }
  async start(...args) {
    g.audio.player.playMediaFile(this, ...args);
  }
  async mediaTags() {
    await this.load();
    let c = triggerFactory();
    window.jsmediatags.read(new Blob([this.data], {type: this.mimeType}),{
      onSuccess:(tags)=>c.fire(tags),
      onError:(e)=>c.cancel(e)
    });
    return c.promise;
  }
}