function Factorial() {};

window.factorial_actions = {
  "append div": {
    script: function() {}
  },
  "add grid": {
    script: function() {}
  },
  "help": {
    script: function() {}
  },
  "fresh page with bootstrap": {
    script: function() {}
  },
  "show inspector": {
    script: function() {
      window.factorial_inspector.show();
    }
  },
  "hide inspector": {
    script: function() {
      window.factorial_inspector.hide();
    }
  }
  
}

Factorial.main = function(){
  // if(!window.factorial_box) {
  //   window.factorial_box = new Box();
  // } 
  if(!window.factorial_inspector) {
    window.factorial_inspector = new SimpleInspector();
  }
  
  // window.factorial_box.hide();
}