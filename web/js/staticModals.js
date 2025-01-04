g.staticModals = {
  gridFilter: new ModalScreen({
    caption: 'Set Filter',
    fields: {
      title: {name: 'Title', type: 'text'},
      performer: {name: 'Performer', type: 'text'},
      quarter: {name: 'Quarter', type: 'text'},
      star: {name: 'Star', type: 'range', min: 1, max: 7},
    },
    actions: [
      ModalScreen.ACTION.CLOSE,
      {
        name: 'Apply',
        key: 'Enter',
        call: function(od){
          Object.assign(
            all.ui.fileGrid.filterCond,
            od.filterObject(x=>x!=null)
          );
          this.dismiss();
        },
      }
    ],
    ondismiss() {delete this.od;},
  }),
  playerConfig: new ModalScreen({
    caption: 'Player Configuration',
    fields: {
      volume: {name: 'Volume', type: 'range', min: 0, max: 100},
    },
    od: {
      get volume() {return Math.round(all.audio.buffer.gain.gain.value * 100);},
      set volume(value) {return all.audio.buffer.gain.gain.value = value / 100;},
    },
    actions: [
      ModalScreen.ACTION.CLOSE,
    ],
  }),
};