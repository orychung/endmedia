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
  })
};