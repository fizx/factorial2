function SimpleInspector() {
  var that = this;
  this.update($("body"));
  $(document).keyup(function(event){
    if(that.$activeOverlay) that.$activeOverlay.hide();
    if(event.keyCode == 37 || event.keyCode == 72) {
      return that._left(1);
    } else if(event.keyCode == 38 || event.keyCode == 75) {
      return that._up(1);
    } else if(event.keyCode == 39 || event.keyCode == 76) {
      return that._right(1);
    } else if(event.keyCode == 40 || event.keyCode == 74) {
      return that._down(1);
    } else if(event.keyCode == 73) {//i
      return that._in();
    } else if(event.keyCode == 79) {//o
      return that._out();
    }
    if(that.$activeOverlay) that.$activeOverlay.show();
  });
  
  var ar=new Array(33,34,35,36,37,38,39,40);
  $(document).keydown(function(e) {
    var key = e.which;
    if($.inArray(key,ar) > -1) {
      e.preventDefault();
      return false;
    }
    return true;
  });
}

SimpleInspector.prototype._in = function() {
  var $children = this.$current.children(":visible").filter(function() {
    var $e = $(this)
    return $e.width() > 0 && $e.height() > 0;
  });
  this.update($children[0]);
}

SimpleInspector.prototype._out = function() {
  this.update(this.$current.parent()[0]);
}

SimpleInspector.prototype.update = function(element) {
  if(!element || element == window || element == window.document || element.nodeName == "HTML") {
    return;
  }
  if(this.$activeOverlay) {
    this.$activeOverlay.cleanUp();
  }
  this.$current = $(element);
  console.log(this.$current);
  
  var scroll = function (element, parent){
       $(parent).animate({ scrollTop: $(parent).scrollTop() + $(element).offset().top - $(parent).offset().top }, { duration: 'slow', easing: 'swing'});
       $('html,body').animate({ scrollTop: $(parent).offset().top - ($(window).height()/3) }, { duration: 1000, easing: 'swing'});
  }
  
  scroll(this.$current[0], this.$current.parent()[0])
  
  this.$activeOverlay = new Overlay().uncloseable().updateElement(this.$current);
}

SimpleInspector.prototype._isAncestor = function(parent, child) {
  while(child != null) {
    if(child == parent) {
      return true;
    }
    child = child.parentNode
  }
  return false;
}

SimpleInspector.prototype._left = function(delta) {
  var x = this.$current.offset().left - delta;
  var y = this.$current.offset().top + this.$current.outerHeight() / 2;
  var element = document.elementFromPoint(x, y);
  if(delta > 1000) { return false; }
  if(!element || this._isAncestor(element, this.$current[0])) {
    this._left(delta * 1.1);
  } else {
    this.update(element);
  }
}

SimpleInspector.prototype._right = function(delta) {
  var x = this.$current.offset().left + this.$current.outerWidth() + delta;
  var y = this.$current.offset().top + this.$current.outerHeight() / 2;
  var element = document.elementFromPoint(x, y);
  if(delta > 1000) { return false; }
  if(!element || this._isAncestor(element, this.$current[0])) {
    this._right(delta * 1.1);
  } else {
    this.update(element);
  }
}

SimpleInspector.prototype._up = function(delta) {
  var x = this.$current.offset().left + this.$current.outerWidth() / 2;
  var y = this.$current.offset().top - delta;
  var element = document.elementFromPoint(x, y);
  if(delta > 1000) { return false; }
  if(!element || this._isAncestor(element, this.$current[0])) {
    this._up(delta * 1.1);
  } else {
    this.update(element);
  }
}

SimpleInspector.prototype._down = function(delta) {
  var x = this.$current.offset().left + this.$current.outerWidth() / 2;
  var y = this.$current.offset().top + this.$current.outerHeight() + delta;
  var element = document.elementFromPoint(x, y);
  if(delta > 1000) { return false; }
  if(!element || this._isAncestor(element, this.$current[0])) {
    this._down(delta * 1.1);
  } else {
    this.update(element);
  }
}