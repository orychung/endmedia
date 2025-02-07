"use strict";
class LyricsLine {
  constructor(o) {
    if (!(o instanceof Array)) o = [500,0,0,[490,o]];
    Object.assign(this,o);
    this.computeRuby(1e+11);
    this.totalTime = 1e+11 - this.ruby.remainTime;
  }
  get startTime() {return this[0];}
  computeRuby(lineTime=0) {
    let stepData = this[3];
    let rubyList = [];
    let currentRubyIndex;
    let currentRubyRatio;
    let remainTime = lineTime;
    let i = 0;
    while (i<stepData.length) {
      if (stepData[i] instanceof Array) {
        let rubyData = stepData[i];
        let j = 1;
        while (j<rubyData.length) {
          if ((remainTime>=0) && (remainTime<rubyData[j])) {
            currentRubyIndex = rubyList.length;
            currentRubyRatio = remainTime / rubyData[j];
            currentRubyRatio = (currentRubyRatio*2 + j - 1)/(rubyData.length - 1);
            // TODO: size assumes each rubyData element has same text width, need refinement
          }
          remainTime -= rubyData[j];
          j += 2;
        }
        rubyList.push(rubyData);
        i += 1;
      } else {
        if ((remainTime>=0) && (remainTime<stepData[i])) {
          currentRubyIndex = rubyList.length;
          currentRubyRatio = remainTime / stepData[i];
        }
        remainTime -= stepData[i];
        rubyList.push(stepData[i+1]);
        i += 2;
      }
    }
    this.ruby = {
      rubyList,
      currentRubyIndex,
      currentRubyRatio,
      remainTime,
      lineTime,
      lineEnded: (remainTime >= 0),
      lineStarted: (lineTime >= 0),
    };
    return this.ruby;
  }
}
class LyricsTrail {
  constructor(o) {
    Object.assign(this,o);
    let virtualIndex = this.index^((this.index^this.lineIndex)&1);
    this.css = {
      bottom: 7*virtualIndex+'vw',
      right: (virtualIndex&1)?null:'0vw',
      left: (virtualIndex&1)?'0vw':null,
      "--lyrics-color": this.line.color || this.system.defaultColor,
    };
  }
  async refreshRemainWidth() {
    if (!this.line.vnode) return;
    let refs = this.line.vnode.$refs;
    if (!refs.widthFrom) return;
    let widthFrom = refs.widthFrom.offsetWidth;
    let widthTo = refs.widthTo.offsetWidth;
    if (!this.ruby.lineStarted) return delete this.remainWidth;
    if (this.ruby.lineEnded) return this.remainWidth = '0px';
    this.remainWidth = `${
      refs.widthFrom.offsetWidth*(1-this.ruby.currentRubyRatio)
      +refs.widthTo.offsetWidth*this.ruby.currentRubyRatio
    }px`;
  }
  set remainTime(value) {
    (async ()=>{
      this.ruby = this.line.computeRuby(value);
      await Vue.nextTick();
      this.refreshRemainWidth();
    })();
  }
}
class LyricsSystem {
  static linkedLyrics = Symbol('linkedLyrics')
  static linkedLyricsInterval = Symbol('linkedLyricsInterval')
  static linkBufferToLyrics(buffer, lyrics) {
    const {linkedLyrics, linkedLyricsInterval} = LyricsSystem;
    if (!buffer[linkedLyrics]) {
      buffer.addEventListener('started', ()=>{
        buffer[linkedLyricsInterval] = setInterval(()=>{
          if (!buffer[linkedLyrics]) return;
          buffer[linkedLyrics].reactive.updateDisplay(buffer.playbackTime);
        },20);
        console.log('setInterval for:', buffer[linkedLyricsInterval]);
      });
      buffer.addEventListener('stopped', ()=>{
        console.log('clearInterval for:', buffer[linkedLyricsInterval]);
        clearInterval(buffer[linkedLyricsInterval])
      });
    }
    buffer[linkedLyrics] = lyrics;
  }
  trails = []
  constructor(o) {
    Object.assign(this,o);
    this.lines = this.lines.map(line=>new LyricsLine(line));
  }
  clearInterval() {
    console.log('clearInterval for:', this.updateIntervalIndex);
    if (this.updateIntervalIndex) clearInterval(this.updateIntervalIndex);
    delete this.updateIntervalIndex;
  }
  async updateDisplay(playbackTime) {
    // BUG TO FIX: avoid update display calls when lyrics is not mounted (buffer is changed)
    let remainTime = playbackTime/this.timeScale;
    let startBuffer = 3.3/this.timeScale;
    let endBuffer = 0.3/this.timeScale;
    let lines = [];
    this.trails = [];
    this.lines.forEach((line,i)=>{
      if ((remainTime + startBuffer >= line[0])
        && (remainTime < line[0] + line.totalTime + endBuffer)) {
        this.trails.push(new LyricsTrail({
          system: this,
          line: line,
          index: this.trails.length,
          lineIndex: i,
        }));
        this.trails.at(-1).remainTime = remainTime - line[0];
      }
      remainTime -= line[0];
    });
    if (this.trails.length > 2) {
      if (this.trails[0].line.remainTime >= this.trails[0].line.totalTime) this.trails.shift(1);
      this.trails = this.trails.slice(0, 2);
    }
    this.reactive.trails = this.trails;
  }
}
