function Inspector() {
  var that = this;
  this.overlays = {};
  this.impliedOverlays = [];
  this.rejectedOverlays = [];
  this.nextOverlayId = 1;
  this.$activeOverlay = new Overlay().activate().hide().click(this, function(event){
    that.overlayClick(event);
  });
  $.map(['html', 'head', 'base'], function(selector) {
    $(selector).addClass("f_ignore");
  });
  $("*").bind("mouseover", { that: that}, that.over);
  $("*").bind("mouseout", { that: that}, that.out);
  $(document).bind("keydown", {that: that}, that._trapArrows);  
  $(document).bind("keyup", {that: that}, that._moveSelection);
}

Inspector.prototype._moveSelection = function(event) {
  var that = event.data.that;

  if(!that.hasAnyOverlays()) {
    return true;
  }
  
  var $current = that.getFirstOverlay().overlaid$Element();
  var $next = $();
  
  if(event.keyCode == 37) {            //left
    $next = that._left($current);
  } else if(event.keyCode == 38) {     //up
    $next = that._up($current);
  } else if(event.keyCode == 39) {     //right
    $next = that._right($current);
  } else if(event.keyCode == 40) {     //down
    $next = that._down($current);
  }
  
  if($next.size() > 0) {
    that.clearAllOverlays();
    that._selectForOverlay($next);
  }
  
  event.preventDefault();
  return false;  
}

Inspector.prototype._left = function($element) {
  return $element.parent();
}

Inspector.prototype.getFirstOverlay = function() {
  var overlays = _.values(this.overlays)
  if(overlays.length == 0) {
    return null;
  }
  
  var sorted = _.sortBy(overlays, function(overlay) {
    var pos = overlay.$overlay.position();
    return pos.top * 1000 + pos.left;
  });
  
  return sorted[0];
}

Inspector.prototype._trapArrows = function(event) {
  var that = event.data.that;
  
  if(event.keyCode >= 37 && event.keyCode <= 40 && that.hasAnyOverlays()) {
    event.preventDefault();
    return false;
  }
}

Inspector.prototype.hasAnyOverlays = function() {
  for (var key in this.overlays) {
    if (this.overlays.hasOwnProperty(key)) {
      return true;
    }
  }
  
  return false;
}

Inspector.prototype.overlayClick = function(event) {
  var that = event.data.that;
  var $element = this.$activeOverlay.overlaid$Element();
  that._selectForOverlay($element);
}

Inspector.prototype._selectForOverlay = function($element) {
  var overlay = this.toggleStaticOverlay($element);
  this.updateImpliedSelector();
  this.$activeOverlay.hide();
  overlay.trigger("mouseover");
}

Inspector.prototype.onFlyoutClose = function() {}

Inspector.prototype.toggleStaticOverlay = function($element) {
  if(!$element.is(":visible")) {
    return null;
  }
  var that = this;
  var currentOverlayId = $element.data("overlay");
  var currentOverlay;
  if(!currentOverlayId) {
    currentOverlay = new Overlay().updateElement($element).closeClick(this, function(event){
      that.toggleStaticOverlay($element);
      that.updateImpliedSelector();
    });
    $element.data("overlay", this.nextOverlayId);
    this.overlays[this.nextOverlayId] = currentOverlay;
    this.nextOverlayId++;
  } else {
    currentOverlay = this.overlays[currentOverlayId];
    currentOverlay.cleanUp();
    delete(this.overlays[currentOverlayId]);
    $element.data("overlay", null);
  }
  this.rejectedOverlays = [];
  return currentOverlay;
}

Inspector.prototype.clearAllOverlays = function() {
  
  _.each(this.impliedOverlays, function(o){
    o.cleanUp();
  });
  
  _.each(_.values(this.overlays), function(o){
    o.cleanUp();
  });
  
  this.overlays = {};
  this.impliedOverlays = [];
  this.rejectedOverlays = [];
}

Inspector.prototype.selectNone = function(selector) {
  for (var key in this.overlays) {
    var overlay = this.overlays[key];
    var $element = overlay.overlaid$Element();
    this.toggleStaticOverlay($element);
  }
}

Inspector.prototype.selectAll = function(selector) {
  var that = this;
  $(selector).not(".f_ignore").each(function(){
    console.log("hai")
    var $element = $(this);
    if(!$element.data("overlay")) {
      that.toggleStaticOverlay($element);
    }
  });
  this.updateImpliedSelector();
}

Inspector.prototype.updateImpliedSelector = function() {
  var that = this;
  var dom = new DomPredictionHelper();
  var elements = []
  $.each(this.impliedOverlays, function(){
    this.cleanUp();
  });
  this.impliedOverlays = [];
  for (var key in this.overlays) {
    var overlay = this.overlays[key];
    elements.push(overlay.overlaid$Element()[0]);
  }

  var selector = dom.predictCss(elements, this.rejectedOverlays);

  var badSelector = false;
  var $impliedElements
  try {
    $impliedElements = $(selector).not(".f_ignore");
  } catch(err) {
    badSelector = true;
    $impliedElements = $();
    selector = "";
  }
  
  console.log("implied: "+selector);

  this.impliedSelector = selector;
  
  for (var key in this.overlays) {
    var overlay = this.overlays[key];
    var $element = overlay.overlaid$Element();
    if(!$element.is(selector) || badSelector) {
      $impliedElements = $();
    }
  }

  $impliedElements.each(function(){
  var $element = $(this);
    if($element.data("overlay")) {
      return;
    }
    
    if(!$element.data("overlay")) {
      var newOverlay = new Overlay().updateElement($element).implied();
      newOverlay.closeClick(this, function(event){
        that.rejectedOverlays.push($element[0]);
        that.updateImpliedSelector();
      });
      that.impliedOverlays.push(newOverlay);
    }
  })
}

Inspector.prototype.toggle = function() {
  var that = this;
  if (this.isInspecting) {
    this.disable();
    this.flyout.disable();
  } else {
    this.enable();
    this.flyout.enable(300, this);
    var template = window.mustaches.inspector;
    console.log(template + "!!");
    var html = Mustache.to_html(template, {});
    var $html = $(html);
    this.flyout.setContent(html);
    $("#selector").val(this.impliedSelector);
  }
}

Inspector.prototype.enable = function() {
  this.isInspecting = true;
}

Inspector.prototype.disable = function() {
  this.isInspecting = false;
  this.$activeOverlay.hide();
}

Inspector.prototype.over = function(event) {
  var that = event.data.that;
  // if(!that.isInspecting) {
  //   return false;
  // }
  that.$activeOverlay.updateEvent(event);
  return false;
}

Inspector.prototype.out = function(event) {
  var that = event.data.that;
  // if(!that.isInspecting) {
  //   return false;
  // }
  that.$activeOverlay.updateEvent(event);
  return false;
}

Inspector.prototype._selectable = function($e) {
  if($e.size() == 0){
    return true;
  }
  if($e.is(".f_ignore")) {
    return false;
  }
  if($e.css("display") == "none" || $e.height() < 1) {
    return false;
  }
  return true;
}

Inspector.prototype._prev = function($e) {
  console.log("p");
  var $out = $e;
  do {
    $out = $out.prev();
  } while (!this._selectable($out));
  return $out;
}

Inspector.prototype._next = function($e) {
  console.log("n");
  var $out = $e;
  do {
    $out = $out.next();
  } while (!this._selectable($out));
  return $out;
}

Inspector.prototype._parent = function($e) {
  console.log("pa");
  var $out = $e;
  do {
    $out = $out.parent();
  } while (!this._selectable($out));
  return $out;
}

Inspector.prototype._child = function($e) { //dfs
  console.log("c");
  var that = this;
  var $children = $e.children().filter(function(){
    console.log("candidate")
    console.log(this);
    return that._selectable($(this));
  });
  
  console.log($children);
  
  if($children.size() == 0) {
    var $allChildren = $e.children().not(".f_ignore_children");
    var results = $children.map(function(){
      return that._child($(this));
    })
    var answer = _.find(results, function($r){
      return $r.size() > 0;
    });
    return answer || $();
  } else {
    return $children.first();
  }
}