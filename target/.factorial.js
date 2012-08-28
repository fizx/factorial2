window.f_mustaches = {"box":"<div id=\"f_modal\" class=\"f_ignore f_ignore_children\">\n  <div class=\"f_box\">\n    <div class=\"f_title\">\n      <span id=\"f_f\">&fnof;</span><span id=\"f_bang\">!</span>\n    </div>\n\n    <div class=\"f_input\">\n      <input type=\"text\">\n    </div>\n\n    <div class=\"f_more\">\n      <div class=\"f_more-inner\">\n        <ul>\n        </ul>\n      </div>\n    </div>\n  </div>\n</div>\n"};
function Box() {
  var that = this;
  this.$element = $(window.f_mustaches.box);
  $("body").append(this.$element);
  this.$input = $("#f_modal input");
  
  $(document).keyup(function(e){
    if(e.keyCode == 13) {
      that.toggle();
    }
  });
  
  $("#f_modal").click(function() {
    that.hide();
  })
  
  $("#f_modal .box").click(function() {
    return false;
  })
  
  this.$input.keydown(function(e){
    console.log("input keydown");
    if(!$("#f_modal").is(":visible")) {
      return true;
    }
    if(e.keyCode == 38) { //
      var $selected = $("#f_modal li.selected");
      var $prev = $selected.prev();
      if($prev.length == 0) {
        $prev = $selected.siblings().andSelf().filter(":last-child");
      }
      $selected.removeClass("f_selected");
      $prev.addClass("f_selected");
      e.preventDefault();
      return false;
    } else if (e.keyCode == 40 || e.keyCode == 9) {
      var $selected = $("#f_modal li.f_selected");
      var $next = $selected.next();
      if($next.length == 0) {
        $next = $selected.siblings().andSelf().filter(":first-child");
      }
      $selected.removeClass("f_selected");
      $next.addClass("f_selected");   
      e.preventDefault();
      return false;
    } else if (e.keyCode == 13) {
      var found = false;
      var $selected = $("#f_modal li.f_selected");
      var name = $selected.text();
      var keepOpen = false
      _.each(window.factorial_actions, function(actionName){
        if(actionName == name) {
          var action = window.factorial_actions[actionName];
          console.log("executing "+name);
          action.script();
          found = true;
          keepOpen = action.keepOpen;
        }
      });
      if(!keepOpen) {
        that.ignoreNextKeyUp = true;
        that.hide();  
      }
      return false;
    }
  });
  
  this.$input.keyup(function(e) {
    if(that.ignoreNextKeyUp) {
      that.ignoreNextKeyUp = false;
      e.preventDefault();
      return false;
    }
    if(!$("#f_modal").is(":visible")) {
      return true;
    }
    if(e.keyCode == 38 || e.keyCode == 40 || e.keyCode == 9 || e.keyCode == 13) {
      return false;
    } else{
      that.update();
    }
  });
  
  that.update();
  this.$element.focus().select();  
}

Box.prototype.update = function() {
  var str = $("#f_modal input").val().toLowerCase();
  var chars = str.match(/[a-z]/g);
  var actions = _.clone(window.factorial_actions);
  if(chars) {
    var pattern = new RegExp(chars.join(".*"));
    _.each(_.keys(actions), function(key){
      if(!key.match(pattern)) {
        delete actions[key];
      }
    }); 
  }
  
  var $list = $("#f_modal ul");
  console.log($list);
  $list.find("li").remove();
  
  _.each(_.keys(actions), function(name) {
    var action = actions[key];
    var $element = $("<li></li>");
    var $link = $("<a></a>");
    $element.append($link);
    var start = 0;
    _.each(chars, function(c) {
      var repl = "<span class=f_matching>"+c+"</span>";
      var index = name.indexOf(c, start);
      name = name.substring(0, index) + repl + name.substring(index+1);
      start = index + repl.length;
    });
    $link.html(name);
    $link.attr("href", "#");
    $link.click(function(){
      action.script();
      return false;
    })
    $list.append($element);
  });
  $list.find("li:nth-child(1)").addClass("f_selected");
}

Box.prototype.isVisible = function() {
  return $("#f_modal").is(":visible");
}

Box.prototype.toggle = function() {
  if($("#f_modal").is(":visible")) {
    this.hide();
  } else {
    this.show();
  }
  return this;
}

Box.prototype.show = function() {
  this.$element.show();
  $("#f_modal input").focus().select();
  return this;
}

Box.prototype.hide = function() {
  this.$element.hide();
  console.log("blurring");
  console.log(this.$input);
  this.$input.blur();
  $(document).focus();
  return this;
}
;
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
;
function Overlay() {
  var that = this;
  this.$frameDocument = document;
  this.$parent = $("html");
  this.$overlay = $("<div></div>", this.$parent).addClass("f_overlay").addClass("f_ignore");
  this.$shader = $("<div></div>", this.$parent).addClass("f_ignore");
  this.$overlay.append(this.$shader);
  this.$parent.append(this.$overlay);
  this.$element = $();
  this.$close = $("<a>x</a>", this.$parent).addClass("f_close").addClass("f_ignore");
  this.$parent.append(this.$close);
  this.closable = true;
  
  this.$overlay.bind("mouseover.factorial", function(){
    that.$close.css({ opacity: 1 });
  });
  
  this.$overlay.bind("mouseout.factorial", function(){
    that.$close.css({ opacity: 0.1 });
  });
  
  this.$close.bind("mouseover.factorial", function(){
    that.$close.css({ opacity: 1 });
  });
  
  this.$close.bind("mouseout.factorial", function(){
    that.$close.css({ opacity: 0.1 });
  });
}

Overlay.prototype.updateElement = function($newElement) {
  if($newElement.size() == 1 && !$newElement.hasClass("f_ignore") && $) {
    this.$element = $newElement;
    this.$overlay.show();
    this.$overlay.css("left", $newElement.offset().left);
    this.$overlay.css("top", $newElement.offset().top);
    this.$overlay.width($newElement.outerWidth());
    this.$overlay.height($newElement.outerHeight());

    this.$close.css("left", $newElement.offset().left + $newElement.outerWidth());
    this.$close.css("top", $newElement.offset().top);
  } else {
    this.$element = $();
  }
  return this;
}

Overlay.prototype.activate = function() {
  var that = this;
  this.$overlay.addClass("f_active");
  this.$overlay.bind("mousemove.factorial", { that: that}, function(event){
    that.updateEvent(event);
  });
  this.uncloseable();
  return this; 
}

Overlay.prototype.implied = function() {
  this.$overlay.addClass("f_implied");
  console.log("implied")
  return this;
}

Overlay.prototype.error = function() {
  this.$overlay.addClass("f_error");
  console.log("error")
  return this;
}

Overlay.prototype.unselectable = function() {
  this.$overlay.addClass("f_unselectable");
  console.log("unselectable");
  return this;
}

Overlay.prototype.warn = function() {
  this.$overlay.addClass("f_warn");
  return this; 
}


Overlay.prototype.deactivate = function() {
  this.$overlay.removeClass("active");
  this.$overlay.unbind("mousemove.factorial");
  if(this.closable) {
    this.$close.show();
  }
  return this;
}

Overlay.prototype.uncloseable = function() {
  this.$close.hide();
  this.closable = false;
  return this;
}

Overlay.prototype.overlaid$Element = function() {
  return this.$element;
}

Overlay.prototype.updateEvent = function(event) {
  this.hide();
  var $newElement = $(this.$frameDocument.elementFromPoint(event.pageX, event.pageY));
  if(this.$parent.has($newElement[0]).size() == 0) {
    this.$element = $();
  } else if ($newElement.hasClass("f_ignore")) {
    // yup, ignoring.
  } else {
    this.updateElement($newElement);
  }
  return this;
}

Overlay.prototype.hide = function() {
  this.$overlay.hide();
  this.$close.hide();
  return this;
}

Overlay.prototype.click = function(context, cb) {
  this.$overlay.bind("click.factorial", {that: context}, cb);
  return this;
}

Overlay.prototype.trigger = function(event) {
  this.$overlay.trigger(event);
  return this;
}

Overlay.prototype.closeClick = function(context, cb) {
  this.$close.bind("click.factorial", {that: context}, cb);
  return this;
}

Overlay.prototype.show = function() {
  this.$overlay.show();
  if(this.closable) {
    this.$close.show();
  }
  return this;
}

Overlay.prototype.cleanUp = function() {
  this.$overlay.remove();
  this.$close.remove();
  return this;
}

;
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
;
(function(){function g(a){if(typeof requirejs!="undefined"){var e=b.define;b.define=function(a,b,c){return typeof c!="function"?e.apply(this,arguments):e(a,b,function(a,d,e){return b[2]=="module"&&(e.packaged=!0),c.apply(this,arguments)})},b.define.packaged=!0;return}var f=function(a,b){return d("",a,b)};f.packaged=!0;var g=b;a&&(b[a]||(b[a]={}),g=b[a]),g.define&&(c.original=g.define),g.define=c,g.require&&(d.original=g.require),g.require=f}var a="",b=function(){return this}(),c=function(a,b,d){if(typeof a!="string"){c.original?c.original.apply(window,arguments):(console.error("dropping module because define wasn't a string."),console.trace());return}arguments.length==2&&(d=b),c.modules||(c.modules={}),c.modules[a]=d},d=function(a,b,c){if(Object.prototype.toString.call(b)==="[object Array]"){var e=[];for(var g=0,h=b.length;g<h;++g){var i=f(a,b[g]);if(!i&&d.original)return d.original.apply(window,arguments);e.push(i)}c&&c.apply(null,e)}else{if(typeof b=="string"){var j=f(a,b);return!j&&d.original?d.original.apply(window,arguments):(c&&c(),j)}if(d.original)return d.original.apply(window,arguments)}},e=function(a,b){if(b.indexOf("!")!==-1){var c=b.split("!");return e(a,c[0])+"!"+e(a,c[1])}if(b.charAt(0)=="."){var d=a.split("/").slice(0,-1).join("/");b=d+"/"+b;while(b.indexOf(".")!==-1&&f!=b){var f=b;b=b.replace(/\/\.\//,"/").replace(/[^\/]+\/\.\.\//,"")}}return b},f=function(a,b){b=e(a,b);var f=c.modules[b];if(!f)return null;if(typeof f=="function"){var g={},h={id:b,uri:"",exports:g,packaged:!0},i=function(a,c){return d(b,a,c)},j=f(i,g,h);return g=j||h.exports,c.modules[b]=g,g}return f};g(a)})(),define("ace/ace",["require","exports","module","ace/lib/fixoldbrowsers","ace/lib/dom","ace/lib/event","ace/editor","ace/edit_session","ace/undomanager","ace/virtual_renderer","ace/multi_select","ace/worker/worker_client","ace/keyboard/hash_handler","ace/keyboard/state_handler","ace/placeholder","ace/config","ace/theme/textmate"],function(a,b,c){"use strict",a("./lib/fixoldbrowsers");var d=a("./lib/dom"),e=a("./lib/event"),f=a("./editor").Editor,g=a("./edit_session").EditSession,h=a("./undomanager").UndoManager,i=a("./virtual_renderer").VirtualRenderer,j=a("./multi_select").MultiSelect;a("./worker/worker_client"),a("./keyboard/hash_handler"),a("./keyboard/state_handler"),a("./placeholder"),a("./config").init(),b.edit=function(b){typeof b=="string"&&(b=document.getElementById(b));var c=new g(d.getInnerText(b));c.setUndoManager(new h),b.innerHTML="";var k=new f(new i(b,a("./theme/textmate")));new j(k),k.setSession(c);var l={};return l.document=c,l.editor=k,k.resize(),e.addListener(window,"resize",function(){k.resize()}),b.env=l,k.env=l,k}}),define("ace/lib/fixoldbrowsers",["require","exports","module","ace/lib/regexp","ace/lib/es5-shim"],function(a,b,c){"use strict",a("./regexp"),a("./es5-shim")}),define("ace/lib/regexp",["require","exports","module"],function(a,b,c){function g(a){return(a.global?"g":"")+(a.ignoreCase?"i":"")+(a.multiline?"m":"")+(a.extended?"x":"")+(a.sticky?"y":"")}function h(a,b,c){if(Array.prototype.indexOf)return a.indexOf(b,c);for(var d=c||0;d<a.length;d++)if(a[d]===b)return d;return-1}"use strict";var d={exec:RegExp.prototype.exec,test:RegExp.prototype.test,match:String.prototype.match,replace:String.prototype.replace,split:String.prototype.split},e=d.exec.call(/()??/,"")[1]===undefined,f=function(){var a=/^/g;return d.test.call(a,""),!a.lastIndex}();RegExp.prototype.exec=function(a){var b=d.exec.apply(this,arguments),c,i;if(typeof a=="string"&&b){!e&&b.length>1&&h(b,"")>-1&&(i=RegExp(this.source,d.replace.call(g(this),"g","")),d.replace.call(a.slice(b.index),i,function(){for(var a=1;a<arguments.length-2;a++)arguments[a]===undefined&&(b[a]=undefined)}));if(this._xregexp&&this._xregexp.captureNames)for(var j=1;j<b.length;j++)c=this._xregexp.captureNames[j-1],c&&(b[c]=b[j]);!f&&this.global&&!b[0].length&&this.lastIndex>b.index&&this.lastIndex--}return b},f||(RegExp.prototype.test=function(a){var b=d.exec.call(this,a);return b&&this.global&&!b[0].length&&this.lastIndex>b.index&&this.lastIndex--,!!b})}),define("ace/lib/es5-shim",["require","exports","module"],function(a,b,c){function p(a){try{return Object.defineProperty(a,"sentinel",{}),"sentinel"in a}catch(b){}}Function.prototype.bind||(Function.prototype.bind=function(b){var c=this;if(typeof c!="function")throw new TypeError;var d=g.call(arguments,1),e=function(){if(this instanceof e){var a=function(){};a.prototype=c.prototype;var f=new a,h=c.apply(f,d.concat(g.call(arguments)));return h!==null&&Object(h)===h?h:f}return c.apply(b,d.concat(g.call(arguments)))};return e});var d=Function.prototype.call,e=Array.prototype,f=Object.prototype,g=e.slice,h=d.bind(f.toString),i=d.bind(f.hasOwnProperty),j,k,l,m,n;if(n=i(f,"__defineGetter__"))j=d.bind(f.__defineGetter__),k=d.bind(f.__defineSetter__),l=d.bind(f.__lookupGetter__),m=d.bind(f.__lookupSetter__);Array.isArray||(Array.isArray=function(b){return h(b)=="[object Array]"}),Array.prototype.forEach||(Array.prototype.forEach=function(b){var c=G(this),d=arguments[1],e=0,f=c.length>>>0;if(h(b)!="[object Function]")throw new TypeError;while(e<f)e in c&&b.call(d,c[e],e,c),e++}),Array.prototype.map||(Array.prototype.map=function(b){var c=G(this),d=c.length>>>0,e=Array(d),f=arguments[1];if(h(b)!="[object Function]")throw new TypeError;for(var g=0;g<d;g++)g in c&&(e[g]=b.call(f,c[g],g,c));return e}),Array.prototype.filter||(Array.prototype.filter=function(b){var c=G(this),d=c.length>>>0,e=[],f=arguments[1];if(h(b)!="[object Function]")throw new TypeError;for(var g=0;g<d;g++)g in c&&b.call(f,c[g],g,c)&&e.push(c[g]);return e}),Array.prototype.every||(Array.prototype.every=function(b){var c=G(this),d=c.length>>>0,e=arguments[1];if(h(b)!="[object Function]")throw new TypeError;for(var f=0;f<d;f++)if(f in c&&!b.call(e,c[f],f,c))return!1;return!0}),Array.prototype.some||(Array.prototype.some=function(b){var c=G(this),d=c.length>>>0,e=arguments[1];if(h(b)!="[object Function]")throw new TypeError;for(var f=0;f<d;f++)if(f in c&&b.call(e,c[f],f,c))return!0;return!1}),Array.prototype.reduce||(Array.prototype.reduce=function(b){var c=G(this),d=c.length>>>0;if(h(b)!="[object Function]")throw new TypeError;if(!d&&arguments.length==1)throw new TypeError;var e=0,f;if(arguments.length>=2)f=arguments[1];else do{if(e in c){f=c[e++];break}if(++e>=d)throw new TypeError}while(!0);for(;e<d;e++)e in c&&(f=b.call(void 0,f,c[e],e,c));return f}),Array.prototype.reduceRight||(Array.prototype.reduceRight=function(b){var c=G(this),d=c.length>>>0;if(h(b)!="[object Function]")throw new TypeError;if(!d&&arguments.length==1)throw new TypeError;var e,f=d-1;if(arguments.length>=2)e=arguments[1];else do{if(f in c){e=c[f--];break}if(--f<0)throw new TypeError}while(!0);do f in this&&(e=b.call(void 0,e,c[f],f,c));while(f--);return e}),Array.prototype.indexOf||(Array.prototype.indexOf=function(b){var c=G(this),d=c.length>>>0;if(!d)return-1;var e=0;arguments.length>1&&(e=E(arguments[1])),e=e>=0?e:Math.max(0,d+e);for(;e<d;e++)if(e in c&&c[e]===b)return e;return-1}),Array.prototype.lastIndexOf||(Array.prototype.lastIndexOf=function(b){var c=G(this),d=c.length>>>0;if(!d)return-1;var e=d-1;arguments.length>1&&(e=Math.min(e,E(arguments[1]))),e=e>=0?e:d-Math.abs(e);for(;e>=0;e--)if(e in c&&b===c[e])return e;return-1}),Object.getPrototypeOf||(Object.getPrototypeOf=function(b){return b.__proto__||(b.constructor?b.constructor.prototype:f)});if(!Object.getOwnPropertyDescriptor){var o="Object.getOwnPropertyDescriptor called on a non-object: ";Object.getOwnPropertyDescriptor=function(b,c){if(typeof b!="object"&&typeof b!="function"||b===null)throw new TypeError(o+b);if(!i(b,c))return;var d,e,g;d={enumerable:!0,configurable:!0};if(n){var h=b.__proto__;b.__proto__=f;var e=l(b,c),g=m(b,c);b.__proto__=h;if(e||g)return e&&(d.get=e),g&&(d.set=g),d}return d.value=b[c],d}}Object.getOwnPropertyNames||(Object.getOwnPropertyNames=function(b){return Object.keys(b)}),Object.create||(Object.create=function(b,c){var d;if(b===null)d={__proto__:null};else{if(typeof b!="object")throw new TypeError("typeof prototype["+typeof b+"] != 'object'");var e=function(){};e.prototype=b,d=new e,d.__proto__=b}return c!==void 0&&Object.defineProperties(d,c),d});if(Object.defineProperty){var q=p({}),r=typeof document=="undefined"||p(document.createElement("div"));if(!q||!r)var s=Object.defineProperty}if(!Object.defineProperty||s){var t="Property description must be an object: ",u="Object.defineProperty called on non-object: ",v="getters & setters can not be defined on this javascript engine";Object.defineProperty=function(b,c,d){if(typeof b!="object"&&typeof b!="function"||b===null)throw new TypeError(u+b);if(typeof d!="object"&&typeof d!="function"||d===null)throw new TypeError(t+d);if(s)try{return s.call(Object,b,c,d)}catch(e){}if(i(d,"value"))if(n&&(l(b,c)||m(b,c))){var g=b.__proto__;b.__proto__=f,delete b[c],b[c]=d.value,b.__proto__=g}else b[c]=d.value;else{if(!n)throw new TypeError(v);i(d,"get")&&j(b,c,d.get),i(d,"set")&&k(b,c,d.set)}return b}}Object.defineProperties||(Object.defineProperties=function(b,c){for(var d in c)i(c,d)&&Object.defineProperty(b,d,c[d]);return b}),Object.seal||(Object.seal=function(b){return b}),Object.freeze||(Object.freeze=function(b){return b});try{Object.freeze(function(){})}catch(w){Object.freeze=function(b){return function(c){return typeof c=="function"?c:b(c)}}(Object.freeze)}Object.preventExtensions||(Object.preventExtensions=function(b){return b}),Object.isSealed||(Object.isSealed=function(b){return!1}),Object.isFrozen||(Object.isFrozen=function(b){return!1}),Object.isExtensible||(Object.isExtensible=function(b){if(Object(b)===b)throw new TypeError;var c="";while(i(b,c))c+="?";b[c]=!0;var d=i(b,c);return delete b[c],d});if(!Object.keys){var x=!0,y=["toString","toLocaleString","valueOf","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","constructor"],z=y.length;for(var A in{toString:null})x=!1;Object.keys=function H(a){if(typeof a!="object"&&typeof a!="function"||a===null)throw new TypeError("Object.keys called on a non-object");var H=[];for(var b in a)i(a,b)&&H.push(b);if(x)for(var c=0,d=z;c<d;c++){var e=y[c];i(a,e)&&H.push(e)}return H}}if(!Date.prototype.toISOString||(new Date(-621987552e5)).toISOString().indexOf("-000001")===-1)Date.prototype.toISOString=function(){var b,c,d,e;if(!isFinite(this))throw new RangeError;b=[this.getUTCMonth()+1,this.getUTCDate(),this.getUTCHours(),this.getUTCMinutes(),this.getUTCSeconds()],e=this.getUTCFullYear(),e=(e<0?"-":e>9999?"+":"")+("00000"+Math.abs(e)).slice(0<=e&&e<=9999?-4:-6),c=b.length;while(c--)d=b[c],d<10&&(b[c]="0"+d);return e+"-"+b.slice(0,2).join("-")+"T"+b.slice(2).join(":")+"."+("000"+this.getUTCMilliseconds()).slice(-3)+"Z"};Date.now||(Date.now=function(){return(new Date).getTime()}),Date.prototype.toJSON||(Date.prototype.toJSON=function(b){if(typeof this.toISOString!="function")throw new TypeError;return this.toISOString()}),Date.parse("+275760-09-13T00:00:00.000Z")!==864e13&&(Date=function(a){var b=function e(b,c,d,f,g,h,i){var j=arguments.length;if(this instanceof a){var k=j==1&&String(b)===b?new a(e.parse(b)):j>=7?new a(b,c,d,f,g,h,i):j>=6?new a(b,c,d,f,g,h):j>=5?new a(b,c,d,f,g):j>=4?new a(b,c,d,f):j>=3?new a(b,c,d):j>=2?new a(b,c):j>=1?new a(b):new a;return k.constructor=e,k}return a.apply(this,arguments)},c=new RegExp("^(\\d{4}|[+-]\\d{6})(?:-(\\d{2})(?:-(\\d{2})(?:T(\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{3}))?)?(?:Z|(?:([-+])(\\d{2}):(\\d{2})))?)?)?)?$");for(var d in a)b[d]=a[d];return b.now=a.now,b.UTC=a.UTC,b.prototype=a.prototype,b.prototype.constructor=b,b.parse=function(d){var e=c.exec(d);if(e){e.shift();for(var f=1;f<7;f++)e[f]=+(e[f]||(f<3?1:0)),f==1&&e[f]--;var g=+e.pop(),h=+e.pop(),i=e.pop(),j=0;if(i){if(h>23||g>59)return NaN;j=(h*60+g)*6e4*(i=="+"?-1:1)}var k=+e[0];return 0<=k&&k<=99?(e[0]=k+400,a.UTC.apply(this,e)+j-126227808e5):a.UTC.apply(this,e)+j}return a.parse.apply(this,arguments)},b}(Date));var B="	\n\f\r   ᠎             　\u2028\u2029﻿";if(!String.prototype.trim||B.trim()){B="["+B+"]";var C=new RegExp("^"+B+B+"*"),D=new RegExp(B+B+"*$");String.prototype.trim=function(){return String(this).replace(C,"").replace(D,"")}}var E=function(a){return a=+a,a!==a?a=0:a!==0&&a!==1/0&&a!==-Infinity&&(a=(a>0||-1)*Math.floor(Math.abs(a))),a},F="a"[0]!="a",G=function(a){if(a==null)throw new TypeError;return F&&typeof a=="string"&&a?a.split(""):Object(a)}}),define("ace/lib/dom",["require","exports","module"],function(a,b,c){"use strict";var d="http://www.w3.org/1999/xhtml";b.createElement=function(a,b){return document.createElementNS?document.createElementNS(b||d,a):document.createElement(a)},b.setText=function(a,b){a.innerText!==undefined&&(a.innerText=b),a.textContent!==undefined&&(a.textContent=b)},b.hasCssClass=function(a,b){var c=a.className.split(/\s+/g);return c.indexOf(b)!==-1},b.addCssClass=function(a,c){b.hasCssClass(a,c)||(a.className+=" "+c)},b.removeCssClass=function(a,b){var c=a.className.split(/\s+/g);for(;;){var d=c.indexOf(b);if(d==-1)break;c.splice(d,1)}a.className=c.join(" ")},b.toggleCssClass=function(a,b){var c=a.className.split(/\s+/g),d=!0;for(;;){var e=c.indexOf(b);if(e==-1)break;d=!1,c.splice(e,1)}return d&&c.push(b),a.className=c.join(" "),d},b.setCssClass=function(a,c,d){d?b.addCssClass(a,c):b.removeCssClass(a,c)},b.hasCssString=function(a,b){var c=0,d;b=b||document;if(b.createStyleSheet&&(d=b.styleSheets)){while(c<d.length)if(d[c++].owningElement.id===a)return!0}else if(d=b.getElementsByTagName("style"))while(c<d.length)if(d[c++].id===a)return!0;return!1},b.importCssString=function(c,e,f){f=f||document;if(e&&b.hasCssString(e,f))return null;var g;if(f.createStyleSheet)g=f.createStyleSheet(),g.cssText=c,e&&(g.owningElement.id=e);else{g=f.createElementNS?f.createElementNS(d,"style"):f.createElement("style"),g.appendChild(f.createTextNode(c)),e&&(g.id=e);var h=f.getElementsByTagName("head")[0]||f.documentElement;h.appendChild(g)}},b.importCssStylsheet=function(a,c){if(c.createStyleSheet)c.createStyleSheet(a);else{var d=b.createElement("link");d.rel="stylesheet",d.href=a;var e=c.getElementsByTagName("head")[0]||c.documentElement;e.appendChild(d)}},b.getInnerWidth=function(a){return parseInt(b.computedStyle(a,"paddingLeft"),10)+parseInt(b.computedStyle(a,"paddingRight"),10)+a.clientWidth},b.getInnerHeight=function(a){return parseInt(b.computedStyle(a,"paddingTop"),10)+parseInt(b.computedStyle(a,"paddingBottom"),10)+a.clientHeight},window.pageYOffset!==undefined?(b.getPageScrollTop=function(){return window.pageYOffset},b.getPageScrollLeft=function(){return window.pageXOffset}):(b.getPageScrollTop=function(){return document.body.scrollTop},b.getPageScrollLeft=function(){return document.body.scrollLeft}),window.getComputedStyle?b.computedStyle=function(a,b){return b?(window.getComputedStyle(a,"")||{})[b]||"":window.getComputedStyle(a,"")||{}}:b.computedStyle=function(a,b){return b?a.currentStyle[b]:a.currentStyle},b.scrollbarWidth=function(a){var c=b.createElement("p");c.style.width="100%",c.style.minWidth="0px",c.style.height="200px";var d=b.createElement("div"),e=d.style;e.position="absolute",e.left="-10000px",e.overflow="hidden",e.width="200px",e.minWidth="0px",e.height="150px",d.appendChild(c);var f=a.body||a.documentElement;f.appendChild(d);var g=c.offsetWidth;e.overflow="scroll";var h=c.offsetWidth;return g==h&&(h=d.clientWidth),f.removeChild(d),g-h},b.setInnerHtml=function(a,b){var c=a.cloneNode(!1);return c.innerHTML=b,a.parentNode.replaceChild(c,a),c},b.setInnerText=function(a,b){var c=a.ownerDocument;c.body&&"textContent"in c.body?a.textContent=b:a.innerText=b},b.getInnerText=function(a){var b=a.ownerDocument;return b.body&&"textContent"in b.body?a.textContent:a.innerText||a.textContent||""},b.getParentWindow=function(a){return a.defaultView||a.parentWindow}}),define("ace/lib/event",["require","exports","module","ace/lib/keys","ace/lib/useragent","ace/lib/dom"],function(a,b,c){function g(a,b,c){var f=0;e.isOpera&&e.isMac?f=0|(b.metaKey?1:0)|(b.altKey?2:0)|(b.shiftKey?4:0)|(b.ctrlKey?8:0):f=0|(b.ctrlKey?1:0)|(b.altKey?2:0)|(b.shiftKey?4:0)|(b.metaKey?8:0);if(c in d.MODIFIER_KEYS){switch(d.MODIFIER_KEYS[c]){case"Alt":f=2;break;case"Shift":f=4;break;case"Ctrl":f=1;break;default:f=8}c=0}return f&8&&(c==91||c==93)&&(c=0),!!f||c in d.FUNCTION_KEYS||c in d.PRINTABLE_KEYS?a(b,f,c):!1}"use strict";var d=a("./keys"),e=a("./useragent"),f=a("./dom");b.addListener=function(a,b,c){if(a.addEventListener)return a.addEventListener(b,c,!1);if(a.attachEvent){var d=function(){c(window.event)};c._wrapper=d,a.attachEvent("on"+b,d)}},b.removeListener=function(a,b,c){if(a.removeEventListener)return a.removeEventListener(b,c,!1);a.detachEvent&&a.detachEvent("on"+b,c._wrapper||c)},b.stopEvent=function(a){return b.stopPropagation(a),b.preventDefault(a),!1},b.stopPropagation=function(a){a.stopPropagation?a.stopPropagation():a.cancelBubble=!0},b.preventDefault=function(a){a.preventDefault?a.preventDefault():a.returnValue=!1},b.getButton=function(a){return a.type=="dblclick"?0:a.type=="contextmenu"?2:a.preventDefault?a.button:{1:0,2:2,4:1}[a.button]},document.documentElement.setCapture?b.capture=function(a,c,d){function e(a){return c(a),b.stopPropagation(a)}function g(e){c(e),f||(f=!0,d(e)),b.removeListener(a,"mousemove",c),b.removeListener(a,"mouseup",g),b.removeListener(a,"losecapture",g),a.releaseCapture()}var f=!1;b.addListener(a,"mousemove",c),b.addListener(a,"mouseup",g),b.addListener(a,"losecapture",g),a.setCapture()}:b.capture=function(a,b,c){function d(a){b(a),a.stopPropagation()}function e(a){b&&b(a),c&&c(a),document.removeEventListener("mousemove",d,!0),document.removeEventListener("mouseup",e,!0),a.stopPropagation()}document.addEventListener("mousemove",d,!0),document.addEventListener("mouseup",e,!0)},b.addMouseWheelListener=function(a,c){var d=8,e=function(a){a.wheelDelta!==undefined?a.wheelDeltaX!==undefined?(a.wheelX=-a.wheelDeltaX/d,a.wheelY=-a.wheelDeltaY/d):(a.wheelX=0,a.wheelY=-a.wheelDelta/d):a.axis&&a.axis==a.HORIZONTAL_AXIS?(a.wheelX=(a.detail||0)*5,a.wheelY=0):(a.wheelX=0,a.wheelY=(a.detail||0)*5),c(a)};b.addListener(a,"DOMMouseScroll",e),b.addListener(a,"mousewheel",e)},b.addMultiMouseDownListener=function(a,c,d,f,g){var h=0,i,j,k=function(a){h+=1,h==1&&(i=a.clientX,j=a.clientY,setTimeout(function(){h=0},f||600));var e=b.getButton(a)==c;if(!e||Math.abs(a.clientX-i)>5||Math.abs(a.clientY-j)>5)h=0;h==d&&(h=0,g(a));if(e)return b.preventDefault(a)};b.addListener(a,"mousedown",k),e.isOldIE&&b.addListener(a,"dblclick",k)},b.addCommandKeyListener=function(a,c){var d=b.addListener;if(e.isOldGecko||e.isOpera){var f=null;d(a,"keydown",function(a){f=a.keyCode}),d(a,"keypress",function(a){return g(c,a,f)})}else{var h=null;d(a,"keydown",function(a){return h=a.keyIdentifier||a.keyCode,g(c,a,a.keyCode)})}};if(window.postMessage){var h=1;b.nextTick=function(a,c){c=c||window;var d="zero-timeout-message-"+h;b.addListener(c,"message",function e(f){f.data==d&&(b.stopPropagation(f),b.removeListener(c,"message",e),a())}),c.postMessage(d,"*")}}else b.nextTick=function(a,b){b=b||window,window.setTimeout(a,0)}}),define("ace/lib/keys",["require","exports","module","ace/lib/oop"],function(a,b,c){"use strict";var d=a("./oop"),e=function(){var a={MODIFIER_KEYS:{16:"Shift",17:"Ctrl",18:"Alt",224:"Meta"},KEY_MODS:{ctrl:1,alt:2,option:2,shift:4,meta:8,command:8},FUNCTION_KEYS:{8:"Backspace",9:"Tab",13:"Return",19:"Pause",27:"Esc",32:"Space",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"Left",38:"Up",39:"Right",40:"Down",44:"Print",45:"Insert",46:"Delete",96:"Numpad0",97:"Numpad1",98:"Numpad2",99:"Numpad3",100:"Numpad4",101:"Numpad5",102:"Numpad6",103:"Numpad7",104:"Numpad8",105:"Numpad9",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"Numlock",145:"Scrolllock"},PRINTABLE_KEYS:{32:" ",48:"0",49:"1",50:"2",51:"3",52:"4",53:"5",54:"6",55:"7",56:"8",57:"9",59:";",61:"=",65:"a",66:"b",67:"c",68:"d",69:"e",70:"f",71:"g",72:"h",73:"i",74:"j",75:"k",76:"l",77:"m",78:"n",79:"o",80:"p",81:"q",82:"r",83:"s",84:"t",85:"u",86:"v",87:"w",88:"x",89:"y",90:"z",107:"+",109:"-",110:".",188:",",190:".",191:"/",192:"`",219:"[",220:"\\",221:"]",222:'"'}};for(var b in a.FUNCTION_KEYS){var c=a.FUNCTION_KEYS[b].toUpperCase();a[c]=parseInt(b,10)}return d.mixin(a,a.MODIFIER_KEYS),d.mixin(a,a.PRINTABLE_KEYS),d.mixin(a,a.FUNCTION_KEYS),a}();d.mixin(b,e),b.keyCodeToString=function(a){return(e[a]||String.fromCharCode(a)).toLowerCase()}}),define("ace/lib/oop",["require","exports","module"],function(a,b,c){"use strict",b.inherits=function(){var a=function(){};return function(b,c){a.prototype=c.prototype,b.super_=c.prototype,b.prototype=new a,b.prototype.constructor=b}}(),b.mixin=function(a,b){for(var c in b)a[c]=b[c]},b.implement=function(a,c){b.mixin(a,c)}}),define("ace/lib/useragent",["require","exports","module"],function(a,b,c){"use strict";var d=(navigator.platform.match(/mac|win|linux/i)||["other"])[0].toLowerCase(),e=navigator.userAgent;b.isWin=d=="win",b.isMac=d=="mac",b.isLinux=d=="linux",b.isIE=navigator.appName=="Microsoft Internet Explorer"&&parseFloat(navigator.userAgent.match(/MSIE ([0-9]+[\.0-9]+)/)[1]),b.isOldIE=b.isIE&&b.isIE<9,b.isGecko=b.isMozilla=window.controllers&&window.navigator.product==="Gecko",b.isOldGecko=b.isGecko&&parseInt((navigator.userAgent.match(/rv\:(\d+)/)||[])[1],10)<4,b.isOpera=window.opera&&Object.prototype.toString.call(window.opera)=="[object Opera]",b.isWebKit=parseFloat(e.split("WebKit/")[1])||undefined,b.isChrome=parseFloat(e.split(" Chrome/")[1])||undefined,b.isAIR=e.indexOf("AdobeAIR")>=0,b.isIPad=e.indexOf("iPad")>=0,b.isTouchPad=e.indexOf("TouchPad")>=0,b.OS={LINUX:"LINUX",MAC:"MAC",WINDOWS:"WINDOWS"},b.getOS=function(){return b.isMac?b.OS.MAC:b.isLinux?b.OS.LINUX:b.OS.WINDOWS}}),define("ace/editor",["require","exports","module","ace/lib/fixoldbrowsers","ace/lib/oop","ace/lib/lang","ace/lib/useragent","ace/keyboard/textinput","ace/mouse/mouse_handler","ace/mouse/fold_handler","ace/keyboard/keybinding","ace/edit_session","ace/search","ace/range","ace/lib/event_emitter","ace/commands/command_manager","ace/commands/default_commands"],function(a,b,c){"use strict",a("./lib/fixoldbrowsers");var d=a("./lib/oop"),e=a("./lib/lang"),f=a("./lib/useragent"),g=a("./keyboard/textinput").TextInput,h=a("./mouse/mouse_handler").MouseHandler,i=a("./mouse/fold_handler").FoldHandler,j=a("./keyboard/keybinding").KeyBinding,k=a("./edit_session").EditSession,l=a("./search").Search,m=a("./range").Range,n=a("./lib/event_emitter").EventEmitter,o=a("./commands/command_manager").CommandManager,p=a("./commands/default_commands").commands,q=function(a,b){var c=a.getContainerElement();this.container=c,this.renderer=a,this.commands=new o(f.isMac?"mac":"win",p),this.textInput=new g(a.getTextAreaContainer(),this),this.renderer.textarea=this.textInput.getElement(),this.keyBinding=new j(this),f.isIPad||(this.$mouseHandler=new h(this),new i(this)),this.$blockScrolling=0,this.$search=(new l).set({wrap:!0}),this.setSession(b||new k(""))};(function(){d.implement(this,n),this.setKeyboardHandler=function(a){this.keyBinding.setKeyboardHandler(a)},this.getKeyboardHandler=function(){return this.keyBinding.getKeyboardHandler()},this.setSession=function(a){if(this.session==a)return;if(this.session){var b=this.session;this.session.removeEventListener("change",this.$onDocumentChange),this.session.removeEventListener("changeMode",this.$onChangeMode),this.session.removeEventListener("tokenizerUpdate",this.$onTokenizerUpdate),this.session.removeEventListener("changeTabSize",this.$onChangeTabSize),this.session.removeEventListener("changeWrapLimit",this.$onChangeWrapLimit),this.session.removeEventListener("changeWrapMode",this.$onChangeWrapMode),this.session.removeEventListener("onChangeFold",this.$onChangeFold),this.session.removeEventListener("changeFrontMarker",this.$onChangeFrontMarker),this.session.removeEventListener("changeBackMarker",this.$onChangeBackMarker),this.session.removeEventListener("changeBreakpoint",this.$onChangeBreakpoint),this.session.removeEventListener("changeAnnotation",this.$onChangeAnnotation),this.session.removeEventListener("changeOverwrite",this.$onCursorChange),this.session.removeEventListener("changeScrollTop",this.$onScrollTopChange),this.session.removeEventListener("changeLeftTop",this.$onScrollLeftChange);var c=this.session.getSelection();c.removeEventListener("changeCursor",this.$onCursorChange),c.removeEventListener("changeSelection",this.$onSelectionChange)}this.session=a,this.$onDocumentChange=this.onDocumentChange.bind(this),a.addEventListener("change",this.$onDocumentChange),this.renderer.setSession(a),this.$onChangeMode=this.onChangeMode.bind(this),a.addEventListener("changeMode",this.$onChangeMode),this.$onTokenizerUpdate=this.onTokenizerUpdate.bind(this),a.addEventListener("tokenizerUpdate",this.$onTokenizerUpdate),this.$onChangeTabSize=this.renderer.updateText.bind(this.renderer),a.addEventListener("changeTabSize",this.$onChangeTabSize),this.$onChangeWrapLimit=this.onChangeWrapLimit.bind(this),a.addEventListener("changeWrapLimit",this.$onChangeWrapLimit),this.$onChangeWrapMode=this.onChangeWrapMode.bind(this),a.addEventListener("changeWrapMode",this.$onChangeWrapMode),this.$onChangeFold=this.onChangeFold.bind(this),a.addEventListener("changeFold",this.$onChangeFold),this.$onChangeFrontMarker=this.onChangeFrontMarker.bind(this),this.session.addEventListener("changeFrontMarker",this.$onChangeFrontMarker),this.$onChangeBackMarker=this.onChangeBackMarker.bind(this),this.session.addEventListener("changeBackMarker",this.$onChangeBackMarker),this.$onChangeBreakpoint=this.onChangeBreakpoint.bind(this),this.session.addEventListener("changeBreakpoint",this.$onChangeBreakpoint),this.$onChangeAnnotation=this.onChangeAnnotation.bind(this),this.session.addEventListener("changeAnnotation",this.$onChangeAnnotation),this.$onCursorChange=this.onCursorChange.bind(this),this.session.addEventListener("changeOverwrite",this.$onCursorChange),this.$onScrollTopChange=this.onScrollTopChange.bind(this),this.session.addEventListener("changeScrollTop",this.$onScrollTopChange),this.$onScrollLeftChange=this.onScrollLeftChange.bind(this),this.session.addEventListener("changeScrollLeft",this.$onScrollLeftChange),this.selection=a.getSelection(),this.selection.addEventListener("changeCursor",this.$onCursorChange),this.$onSelectionChange=this.onSelectionChange.bind(this),this.selection.addEventListener("changeSelection",this.$onSelectionChange),this.onChangeMode(),this.$blockScrolling+=1,this.onCursorChange(),this.$blockScrolling-=1,this.onScrollTopChange(),this.onScrollLeftChange(),this.onSelectionChange(),this.onChangeFrontMarker(),this.onChangeBackMarker(),this.onChangeBreakpoint(),this.onChangeAnnotation(),this.session.getUseWrapMode()&&this.renderer.adjustWrapLimit(),this.renderer.updateFull(),this._emit("changeSession",{session:a,oldSession:b})},this.getSession=function(){return this.session},this.getSelection=function(){return this.selection},this.resize=function(){this.renderer.onResize()},this.setTheme=function(a){this.renderer.setTheme(a)},this.getTheme=function(){return this.renderer.getTheme()},this.setStyle=function(a){this.renderer.setStyle(a)},this.unsetStyle=function(a){this.renderer.unsetStyle(a)},this.setFontSize=function(a){this.container.style.fontSize=a,this.renderer.updateFontSize()},this.$highlightBrackets=function(){this.session.$bracketHighlight&&(this.session.removeMarker(this.session.$bracketHighlight),this.session.$bracketHighlight=null);if(this.$highlightPending)return;var a=this;this.$highlightPending=!0,setTimeout(function(){a.$highlightPending=!1;var b=a.session.findMatchingBracket(a.getCursorPosition());if(b){var c=new m(b.row,b.column,b.row,b.column+1);a.session.$bracketHighlight=a.session.addMarker(c,"ace_bracket","text")}},10)},this.focus=function(){var a=this;setTimeout(function(){a.textInput.focus()}),this.textInput.focus()},this.isFocused=function(){return this.textInput.isFocused()},this.blur=function(){this.textInput.blur()},this.onFocus=function(){this.renderer.showCursor(),this.renderer.visualizeFocus(),this._emit("focus")},this.onBlur=function(){this.renderer.hideCursor(),this.renderer.visualizeBlur(),this._emit("blur")},this.$cursorChange=function(){this.renderer.updateCursor()},this.onDocumentChange=function(a){var b=a.data,c=b.range,d;c.start.row==c.end.row&&b.action!="insertLines"&&b.action!="removeLines"?d=c.end.row:d=Infinity,this.renderer.updateLines(c.start.row,d),this._emit("change",a),this.$cursorChange()},this.onTokenizerUpdate=function(a){var b=a.data;this.renderer.updateLines(b.first,b.last)},this.onScrollTopChange=function(){this.renderer.scrollToY(this.session.getScrollTop())},this.onScrollLeftChange=function(){this.renderer.scrollToX(this.session.getScrollLeft())},this.onCursorChange=function(){this.$cursorChange(),this.$blockScrolling||this.renderer.scrollCursorIntoView(),this.$highlightBrackets(),this.$updateHighlightActiveLine()},this.$updateHighlightActiveLine=function(){var a=this.getSession();a.$highlightLineMarker&&a.removeMarker(a.$highlightLineMarker),a.$highlightLineMarker=null;if(this.$highlightActiveLine){var b=this.getCursorPosition(),c=this.session.getFoldLine(b.row);if(this.getSelectionStyle()!="line"||!this.selection.isMultiLine()){var d;c?d=new m(c.start.row,0,c.end.row+1,0):d=new m(b.row,0,b.row+1,0),a.$highlightLineMarker=a.addMarker(d,"ace_active_line","background")}}},this.onSelectionChange=function(a){var b=this.getSession();b.$selectionMarker&&b.removeMarker(b.$selectionMarker),b.$selectionMarker=null;if(!this.selection.isEmpty()){var c=this.selection.getRange(),d=this.getSelectionStyle();b.$selectionMarker=b.addMarker(c,"ace_selection",d)}else this.$updateHighlightActiveLine();this.$highlightSelectedWord&&this.session.getMode().highlightSelection(this)},this.onChangeFrontMarker=function(){this.renderer.updateFrontMarkers()},this.onChangeBackMarker=function(){this.renderer.updateBackMarkers()},this.onChangeBreakpoint=function(){this.renderer.setBreakpoints(this.session.getBreakpoints())},this.onChangeAnnotation=function(){this.renderer.setAnnotations(this.session.getAnnotations())},this.onChangeMode=function(){this.renderer.updateText()},this.onChangeWrapLimit=function(){this.renderer.updateFull()},this.onChangeWrapMode=function(){this.renderer.onResize(!0)},this.onChangeFold=function(){this.$updateHighlightActiveLine(),this.renderer.updateFull()},this.getCopyText=function(){var a="";return this.selection.isEmpty()||(a=this.session.getTextRange(this.getSelectionRange())),this._emit("copy",a),a},this.onCopy=function(){this.commands.exec("copy",this)},this.onCut=function(){this.commands.exec("cut",this)},this.onPaste=function(a){this._emit("paste",a),this.insert(a)},this.insert=function(a){var b=this.session,c=b.getMode(),d=this.getCursorPosition();if(this.getBehavioursEnabled()){var e=c.transformAction(b.getState(d.row),"insertion",this,b,a);e&&(a=e.text)}a=a.replace("	",this.session.getTabString());if(!this.selection.isEmpty())d=this.session.remove(this.getSelectionRange()),this.clearSelection();else if(this.session.getOverwrite()){var f=new m.fromPoints(d,d);f.end.column+=a.length,this.session.remove(f)}this.clearSelection();var g=d.column,h=b.getState(d.row),i=c.checkOutdent(h,b.getLine(d.row),a),j=b.getLine(d.row),k=c.getNextLineIndent(h,j.slice(0,d.column),b.getTabString()),l=b.insert(d,a);e&&e.selection&&(e.selection.length==2?this.selection.setSelectionRange(new m(d.row,g+e.selection[0],d.row,g+e.selection[1])):this.selection.setSelectionRange(new m(d.row+e.selection[0],e.selection[1],d.row+e.selection[2],e.selection[3])));var h=b.getState(d.row);if(b.getDocument().isNewLine(a)){this.moveCursorTo(d.row+1,0);var n=b.getTabSize(),o=Number.MAX_VALUE;for(var p=d.row+1;p<=l.row;++p){var q=0;j=b.getLine(p);for(var r=0;r<j.length;++r)if(j.charAt(r)=="	")q+=n;else{if(j.charAt(r)!=" ")break;q+=1}/[^\s]/.test(j)&&(o=Math.min(q,o))}for(var p=d.row+1;p<=l.row;++p){var s=o;j=b.getLine(p);for(var r=0;r<j.length&&s>0;++r)j.charAt(r)=="	"?s-=n:j.charAt(r)==" "&&(s-=1);b.remove(new m(p,0,p,r))}b.indentRows(d.row+1,l.row,k)}i&&c.autoOutdent(h,b,d.row)},this.onTextInput=function(a){this.keyBinding.onTextInput(a)},this.onCommandKey=function(a,b,c){this.keyBinding.onCommandKey(a,b,c)},this.setOverwrite=function(a){this.session.setOverwrite(a)},this.getOverwrite=function(){return this.session.getOverwrite()},this.toggleOverwrite=function(){this.session.toggleOverwrite()},this.setScrollSpeed=function(a){this.$mouseHandler.setScrollSpeed(a)},this.getScrollSpeed=function(){return this.$mouseHandler.getScrollSpeed()},this.setDragDelay=function(a){this.$mouseHandler.setDragDelay(a)},this.getDragDelay=function(){return this.$mouseHandler.getDragDelay()},this.$selectionStyle="line",this.setSelectionStyle=function(a){if(this.$selectionStyle==a)return;this.$selectionStyle=a,this.onSelectionChange(),this._emit("changeSelectionStyle",{data:a})},this.getSelectionStyle=function(){return this.$selectionStyle},this.$highlightActiveLine=!0,this.setHighlightActiveLine=function(a){if(this.$highlightActiveLine==a)return;this.$highlightActiveLine=a,this.$updateHighlightActiveLine()},this.getHighlightActiveLine=function(){return this.$highlightActiveLine},this.$highlightGutterLine=!0,this.setHighlightGutterLine=function(a){if(this.$highlightGutterLine==a)return;this.renderer.setHighlightGutterLine(a)},this.getHighlightGutterLine=function(){return this.$highlightGutterLine},this.$highlightSelectedWord=!0,this.setHighlightSelectedWord=function(a){if(this.$highlightSelectedWord==a)return;this.$highlightSelectedWord=a,a?this.session.getMode().highlightSelection(this):this.session.getMode().clearSelectionHighlight(this)},this.getHighlightSelectedWord=function(){return this.$highlightSelectedWord},this.setAnimatedScroll=function(a){this.renderer.setAnimatedScroll(a)},this.getAnimatedScroll=function(){return this.renderer.getAnimatedScroll()},this.setShowInvisibles=function(a){if(this.getShowInvisibles()==a)return;this.renderer.setShowInvisibles(a)},this.getShowInvisibles=function(){return this.renderer.getShowInvisibles()},this.setShowPrintMargin=function(a){this.renderer.setShowPrintMargin(a)},this.getShowPrintMargin=function(){return this.renderer.getShowPrintMargin()},this.setPrintMarginColumn=function(a){this.renderer.setPrintMarginColumn(a)},this.getPrintMarginColumn=function(){return this.renderer.getPrintMarginColumn()},this.$readOnly=!1,this.setReadOnly=function(a){this.$readOnly=a},this.getReadOnly=function(){return this.$readOnly},this.$modeBehaviours=!0,this.setBehavioursEnabled=function(a){this.$modeBehaviours=a},this.getBehavioursEnabled=function(){return this.$modeBehaviours},this.setShowFoldWidgets=function(a){var b=this.renderer.$gutterLayer;if(b.getShowFoldWidgets()==a)return;this.renderer.$gutterLayer.setShowFoldWidgets(a),this.$showFoldWidgets=a,this.renderer.updateFull()},this.getShowFoldWidgets=function(){return this.renderer.$gutterLayer.getShowFoldWidgets()},this.setFadeFoldWidgets=function(a){this.renderer.setFadeFoldWidgets(a)},this.getFadeFoldWidgets=function(){return this.renderer.getFadeFoldWidgets()},this.remove=function(a){this.selection.isEmpty()&&(a=="left"?this.selection.selectLeft():this.selection.selectRight());var b=this.getSelectionRange();if(this.getBehavioursEnabled()){var c=this.session,d=c.getState(b.start.row),e=c.getMode().transformAction(d,"deletion",this,c,b);e&&(b=e)}this.session.remove(b),this.clearSelection()},this.removeWordRight=function(){this.selection.isEmpty()&&this.selection.selectWordRight(),this.session.remove(this.getSelectionRange()),this.clearSelection()},this.removeWordLeft=function(){this.selection.isEmpty()&&this.selection.selectWordLeft(),this.session.remove(this.getSelectionRange()),this.clearSelection()},this.removeToLineStart=function(){this.selection.isEmpty()&&this.selection.selectLineStart(),this.session.remove(this.getSelectionRange()),this.clearSelection()},this.removeToLineEnd=function(){this.selection.isEmpty()&&this.selection.selectLineEnd();var a=this.getSelectionRange();a.start.column==a.end.column&&a.start.row==a.end.row&&(a.end.column=0,a.end.row++),this.session.remove(a),this.clearSelection()},this.splitLine=function(){this.selection.isEmpty()||(this.session.remove(this.getSelectionRange()),this.clearSelection());var a=this.getCursorPosition();this.insert("\n"),this.moveCursorToPosition(a)},this.transposeLetters=function(){if(!this.selection.isEmpty())return;var a=this.getCursorPosition(),b=a.column;if(b===0)return;var c=this.session.getLine(a.row),d,e;b<c.length?(d=c.charAt(b)+c.charAt(b-1),e=new m(a.row,b-1,a.row,b+1)):(d=c.charAt(b-1)+c.charAt(b-2),e=new m(a.row,b-2,a.row,b)),this.session.replace(e,d)},this.toLowerCase=function(){var a=this.getSelectionRange();this.selection.isEmpty()&&this.selection.selectWord();var b=this.getSelectionRange(),c=this.session.getTextRange(b);this.session.replace(b,c.toLowerCase()),this.selection.setSelectionRange(a)},this.toUpperCase=function(){var a=this.getSelectionRange();this.selection.isEmpty()&&this.selection.selectWord();var b=this.getSelectionRange(),c=this.session.getTextRange(b);this.session.replace(b,c.toUpperCase()),this.selection.setSelectionRange(a)},this.indent=function(){var a=this.session,b=this.getSelectionRange();if(!(b.start.row<b.end.row||b.start.column<b.end.column)){var d;if(this.session.getUseSoftTabs()){var f=a.getTabSize(),g=this.getCursorPosition(),h=a.documentToScreenColumn(g.row,g.column),i=f-h%f;d=e.stringRepeat(" ",i)}else d="	";return this.insert(d)}var c=this.$getSelectedRows();a.indentRows(c.first,c.last,"	")},this.blockOutdent=function(){var a=this.session.getSelection();this.session.outdentRows(a.getRange())},this.toggleCommentLines=function(){var a=this.session.getState(this.getCursorPosition().row),b=this.$getSelectedRows();this.session.getMode().toggleCommentLines(a,this.session,b.first,b.last)},this.removeLines=function(){var a=this.$getSelectedRows(),b;a.first===0||a.last+1<this.session.getLength()?b=new m(a.first,0,a.last+1,0):b=new m(a.first-1,this.session.getLine(a.first-1).length,a.last,this.session.getLine(a.last).length),this.session.remove(b),this.clearSelection()},this.moveLinesDown=function(){this.$moveLines(function(a,b){return this.session.moveLinesDown(a,b)})},this.moveLinesUp=function(){this.$moveLines(function(a,b){return this.session.moveLinesUp(a,b)})},this.moveText=function(a,b){return this.$readOnly?null:this.session.moveText(a,b)},this.copyLinesUp=function(){this.$moveLines(function(a,b){return this.session.duplicateLines(a,b),0})},this.copyLinesDown=function(){this.$moveLines(function(a,b){return this.session.duplicateLines(a,b)})},this.$moveLines=function(a){var b=this.$getSelectedRows(),c=this.selection;if(!c.isMultiLine())var d=c.getRange(),e=c.isBackwards();var f=a.call(this,b.first,b.last);d?(d.start.row+=f,d.end.row+=f,c.setSelectionRange(d,e)):(c.setSelectionAnchor(b.last+f+1,0),c.$moveSelection(function(){c.moveCursorTo(b.first+f,0)}))},this.$getSelectedRows=function(){var a=this.getSelectionRange().collapseRows();return{first:a.start.row,last:a.end.row}},this.onCompositionStart=function(a){this.renderer.showComposition(this.getCursorPosition())},this.onCompositionUpdate=function(a){this.renderer.setCompositionText(a)},this.onCompositionEnd=function(){this.renderer.hideComposition()},this.getFirstVisibleRow=function(){return this.renderer.getFirstVisibleRow()},this.getLastVisibleRow=function(){return this.renderer.getLastVisibleRow()},this.isRowVisible=function(a){return a>=this.getFirstVisibleRow()&&a<=this.getLastVisibleRow()},this.isRowFullyVisible=function(a){return a>=this.renderer.getFirstFullyVisibleRow()&&a<=this.renderer.getLastFullyVisibleRow()},this.$getVisibleRowCount=function(){return this.renderer.getScrollBottomRow()-this.renderer.getScrollTopRow()+1},this.$moveByPage=function(a,b){var c=this.renderer,d=this.renderer.layerConfig,e=a*Math.floor(d.height/d.lineHeight);this.$blockScrolling++,b==1?this.selection.$moveSelection(function(){this.moveCursorBy(e,0)}):b==0&&(this.selection.moveCursorBy(e,0),this.selection.clearSelection()),this.$blockScrolling--;var f=c.scrollTop;c.scrollBy(0,e*d.lineHeight),b!=null&&c.scrollCursorIntoView(null,.5),c.animateScrolling(f)},this.selectPageDown=function(){this.$moveByPage(1,!0)},this.selectPageUp=function(){this.$moveByPage(-1,!0)},this.gotoPageDown=function(){this.$moveByPage(1,!1)},this.gotoPageUp=function(){this.$moveByPage(-1,!1)},this.scrollPageDown=function(){this.$moveByPage(1)},this.scrollPageUp=function(){this.$moveByPage(-1)},this.scrollToRow=function(a){this.renderer.scrollToRow(a)},this.scrollToLine=function(a,b,c,d){this.renderer.scrollToLine(a,b,c,d)},this.centerSelection=function(){var a=this.getSelectionRange(),b=Math.floor(a.start.row+(a.end.row-a.start.row)/2);this.renderer.scrollToLine(b,!0)},this.getCursorPosition=function(){return this.selection.getCursor()},this.getCursorPositionScreen=function(){return this.session.documentToScreenPosition(this.getCursorPosition())},this.getSelectionRange=function(){return this.selection.getRange()},this.selectAll=function(){this.$blockScrolling+=1,this.selection.selectAll(),this.$blockScrolling-=1},this.clearSelection=function(){this.selection.clearSelection()},this.moveCursorTo=function(a,b){this.selection.moveCursorTo(a,b)},this.moveCursorToPosition=function(a){this.selection.moveCursorToPosition(a)},this.jumpToMatching=function(){var a=this.getCursorPosition(),b=this.session.findMatchingBracket(a);b||(a.column+=1,b=this.session.findMatchingBracket(a)),b||(a.column-=2,b=this.session.findMatchingBracket(a)),b&&(this.clearSelection(),this.moveCursorTo(b.row,b.column))},this.gotoLine=function(a,b,c){this.selection.clearSelection(),this.session.unfold({row:a-1,column:b||0}),this.$blockScrolling+=1,this.moveCursorTo(a-1,b||0),this.$blockScrolling-=1,this.isRowFullyVisible(a-1)||this.scrollToLine(a-1,!0,c)},this.navigateTo=function(a,b){this.clearSelection(),this.moveCursorTo(a,b)},this.navigateUp=function(a){this.selection.clearSelection(),a=a||1,this.selection.moveCursorBy(-a,0)},this.navigateDown=function(a){this.selection.clearSelection(),a=a||1,this.selection.moveCursorBy(a,0)},this.navigateLeft=function(a){if(!this.selection.isEmpty()){var b=this.getSelectionRange().start;this.moveCursorToPosition(b)}else{a=a||1;while(a--)this.selection.moveCursorLeft()}this.clearSelection()},this.navigateRight=function(a){if(!this.selection.isEmpty()){var b=this.getSelectionRange().end;this.moveCursorToPosition(b)}else{a=a||1;while(a--)this.selection.moveCursorRight()}this.clearSelection()},this.navigateLineStart=function(){this.selection.moveCursorLineStart(),this.clearSelection()},this.navigateLineEnd=function(){this.selection.moveCursorLineEnd(),this.clearSelection()},this.navigateFileEnd=function(){var a=this.renderer.scrollTop;this.selection.moveCursorFileEnd(),this.clearSelection(),this.renderer.animateScrolling(a)},this.navigateFileStart=function(){var a=this.renderer.scrollTop;this.selection.moveCursorFileStart(),this.clearSelection(),this.renderer.animateScrolling(a)},this.navigateWordRight=function(){this.selection.moveCursorWordRight(),this.clearSelection()},this.navigateWordLeft=function(){this.selection.moveCursorWordLeft(),this.clearSelection()},this.replace=function(a,b){b&&this.$search.set(b);var c=this.$search.find(this.session),d=0;return c?(this.$tryReplace(c,a)&&(d=1),c!==null&&(this.selection.setSelectionRange(c),this.renderer.scrollSelectionIntoView(c.start,c.end)),d):d},this.replaceAll=function(a,b){b&&this.$search.set(b);var c=this.$search.findAll(this.session),d=0;if(!c.length)return d;this.$blockScrolling+=1;var e=this.getSelectionRange();this.clearSelection(),this.selection.moveCursorTo(0,0);for(var f=c.length-1;f>=0;--f)this.$tryReplace(c[f],a)&&d++;return this.selection.setSelectionRange(e),this.$blockScrolling-=1,d},this.$tryReplace=function(a,b){var c=this.session.getTextRange(a);return b=this.$search.replace(c,b),b!==null?(a.end=this.session.replace(a,b),a):null},this.getLastSearchOptions=function(){return this.$search.getOptions()},this.find=function(a,b,c){this.clearSelection(),b=b||{},b.needle=a,this.$search.set(b),this.$find(!1,c)},this.findNext=function(a,b){a=a||{},this.$search.set(a),this.$find(!1,b)},this.findPrevious=function(a,b){a=a||{},this.$search.set(a),this.$find(!0,b)},this.$find=function(a,b){this.selection.isEmpty()||this.$search.set({needle:this.session.getTextRange(this.getSelectionRange())}),typeof a!="undefined"&&this.$search.set({backwards:a});var c=this.$search.find(this.session);if(c){this.$blockScrolling+=1,this.session.unfold(c),this.selection.setSelectionRange(c),this.$blockScrolling-=1;var d=this.renderer.scrollTop;this.renderer.scrollSelectionIntoView(c.start,c.end,.5),this.renderer.animateScrolling(d)}},this.undo=function(){this.$blockScrolling++,this.session.getUndoManager().undo(),this.$blockScrolling--,this.renderer.scrollCursorIntoView(null,.5)},this.redo=function(){this.$blockScrolling++,this.session.getUndoManager().redo(),this.$blockScrolling--,this.renderer.scrollCursorIntoView(null,.5)},this.destroy=function(){this.renderer.destroy()}}).call(q.prototype),b.Editor=q}),define("ace/lib/lang",["require","exports","module"],function(a,b,c){"use strict",b.stringReverse=function(a){return a.split("").reverse().join("")},b.stringRepeat=function(a,b){return(new Array(b+1)).join(a)};var d=/^\s\s*/,e=/\s\s*$/;b.stringTrimLeft=function(a){return a.replace(d,"")},b.stringTrimRight=function(a){return a.replace(e,"")},b.copyObject=function(a){var b={};for(var c in a)b[c]=a[c];return b},b.copyArray=function(a){var b=[];for(var c=0,d=a.length;c<d;c++)a[c]&&typeof a[c]=="object"?b[c]=this.copyObject(a[c]):b[c]=a[c];return b},b.deepCopy=function(a){if(typeof a!="object")return a;var b=a.constructor();for(var c in a)typeof a[c]=="object"?b[c]=this.deepCopy(a[c]):b[c]=a[c];return b},b.arrayToMap=function(a){var b={};for(var c=0;c<a.length;c++)b[a[c]]=1;return b},b.arrayRemove=function(a,b){for(var c=0;c<=a.length;c++)b===a[c]&&a.splice(c,1)},b.escapeRegExp=function(a){return a.replace(/([.*+?^${}()|[\]\/\\])/g,"\\$1")},b.deferredCall=function(a){var b=null,c=function(){b=null,a()},d=function(a){return d.cancel(),b=setTimeout(c,a||0),d};return d.schedule=d,d.call=function(){return this.cancel(),a(),d},d.cancel=function(){return clearTimeout(b),b=null,d},d}}),define("ace/keyboard/textinput",["require","exports","module","ace/lib/event","ace/lib/useragent","ace/lib/dom"],function(a,b,c){"use strict";var d=a("../lib/event"),e=a("../lib/useragent"),f=a("../lib/dom"),g=function(a,b){function l(){try{c.select()}catch(a){}}function m(a){if(!i){var d=a||c.value;if(d){d.length>1&&(d.charAt(0)==g?d=d.substr(1):d.charAt(d.length-1)==g&&(d=d.slice(0,-1))),d&&d!=g&&(j?b.onPaste(d):b.onTextInput(d));if(!v())return!1}}i=!1,j=!1,c.value=g,l()}function v(){return document.activeElement===c}var c=f.createElement("textarea");e.isTouchPad&&c.setAttribute("x-palm-disable-auto-cap",!0),c.setAttribute("wrap","off"),c.style.left="-10000px",c.style.position="fixed",a.insertBefore(c,a.firstChild);var g=String.fromCharCode(0);m();var h=!1,i=!1,j=!1,k="",n=function(a){setTimeout(function(){h||m(a.data)},0)},o=function(a){if(e.isOldIE&&c.value.charCodeAt(0)>128)return;setTimeout(function(){h||m()},0)},p=function(a){h=!0,b.onCompositionStart(),e.isGecko||setTimeout(q,0)},q=function(){if(!h)return;b.onCompositionUpdate(c.value)},r=function(a){h=!1,b.onCompositionEnd()},s=function(a){i=!0;var d=b.getCopyText();d?c.value=d:a.preventDefault(),l(),setTimeout(function(){m()},0)},t=function(a){i=!0;var d=b.getCopyText();d?(c.value=d,b.onCut()):a.preventDefault(),l(),setTimeout(function(){m()},0)};d.addCommandKeyListener(c,b.onCommandKey.bind(b));if(e.isOldIE){var u={13:1,27:1};d.addListener(c,"keyup",function(a){h&&(!c.value||u[a.keyCode])&&setTimeout(r,0);if((c.value.charCodeAt(0)|0)<129)return;h?q():p()})}"onpropertychange"in c&&!("oninput"in c)?d.addListener(c,"propertychange",o):d.addListener(c,"input",n),d.addListener(c,"paste",function(a){j=!0,a.clipboardData&&a.clipboardData.getData?(m(a.clipboardData.getData("text/plain")),a.preventDefault()):o()}),"onbeforecopy"in c&&typeof clipboardData!="undefined"?(d.addListener(c,"beforecopy",function(a){var c=b.getCopyText();c?clipboardData.setData("Text",c):a.preventDefault()}),d.addListener(a,"keydown",function(a){if(a.ctrlKey&&a.keyCode==88){var c=b.getCopyText();c&&(clipboardData.setData("Text",c),b.onCut()),d.preventDefault(a)}})):(d.addListener(c,"copy",s),d.addListener(c,"cut",t)),d.addListener(c,"compositionstart",p),e.isGecko&&d.addListener(c,"text",q),e.isWebKit&&d.addListener(c,"keyup",q),d.addListener(c,"compositionend",r),d.addListener(c,"blur",function(){b.onBlur()}),d.addListener(c,"focus",function(){b.onFocus(),l()}),this.focus=function(){b.onFocus(),l(),c.focus()},this.blur=function(){c.blur()},this.isFocused=v,this.getElement=function(){return c},this.onContextMenu=function(a,b){a&&(k||(k=c.style.cssText),c.style.cssText="position:fixed; z-index:1000;left:"+(a.x-2)+"px; top:"+(a.y-2)+"px;"),b&&(c.value="")},this.onContextMenuClose=function(){setTimeout(function(){k&&(c.style.cssText=k,k=""),m()},0)}};b.TextInput=g}),define("ace/mouse/mouse_handler",["require","exports","module","ace/lib/event","ace/mouse/default_handlers","ace/mouse/default_gutter_handler","ace/mouse/mouse_event"],function(a,b,c){"use strict";var d=a("../lib/event"),e=a("./default_handlers").DefaultHandlers,f=a("./default_gutter_handler").GutterHandler,g=a("./mouse_event").MouseEvent,h=function(a){this.editor=a,new e(this),new f(this),d.addListener(a.container,"mousedown",function(b){return a.focus(),d.preventDefault(b)}),d.addListener(a.container,"selectstart",function(a){return d.preventDefault(a)});var b=a.renderer.getMouseEventTarget();d.addListener(b,"mousedown",this.onMouseEvent.bind(this,"mousedown")),d.addListener(b,"click",this.onMouseEvent.bind(this,"click")),d.addListener(b,"mousemove",this.onMouseMove.bind(this,"mousemove")),d.addMultiMouseDownListener(b,0,2,500,this.onMouseEvent.bind(this,"dblclick")),d.addMultiMouseDownListener(b,0,3,600,this.onMouseEvent.bind(this,"tripleclick")),d.addMultiMouseDownListener(b,0,4,600,this.onMouseEvent.bind(this,"quadclick")),d.addMouseWheelListener(a.container,this.onMouseWheel.bind(this,"mousewheel"));var c=a.renderer.$gutter;d.addListener(c,"mousedown",this.onMouseEvent.bind(this,"guttermousedown")),d.addListener(c,"click",this.onMouseEvent.bind(this,"gutterclick")),d.addListener(c,"dblclick",this.onMouseEvent.bind(this,"gutterdblclick")),d.addListener(c,"mousemove",this.onMouseMove.bind(this,"gutter"))};(function(){this.$scrollSpeed=1,this.setScrollSpeed=function(a){this.$scrollSpeed=a},this.getScrollSpeed=function(){return this.$scrollSpeed},this.onMouseEvent=function(a,b){this.editor._emit(a,new g(b,this.editor))},this.$dragDelay=250,this.setDragDelay=function(a){this.$dragDelay=a},this.getDragDelay=function(){return this.$dragDelay},this.onMouseMove=function(a,b){var c=this.editor._eventRegistry&&this.editor._eventRegistry.mousemove;if(!c||!c.length)return;this.editor._emit(a,new g(b,this.editor))},this.onMouseWheel=function(a,b){var c=new g(b,this.editor);c.speed=this.$scrollSpeed*2,c.wheelX=b.wheelX,c.wheelY=b.wheelY,this.editor._emit(a,c)},this.setState=function(a){this.state=a},this.captureMouse=function(a,b){b&&this.setState(b),this.x=a.x,this.y=a.y;var c=this.editor.renderer.$keepTextAreaAtCursor;this.editor.renderer.$keepTextAreaAtCursor=!1;var e=this,f=function(a){e.x=a.clientX,e.y=a.clientY},g=function(a){clearInterval(i),e[e.state+"End"]&&e[e.state+"End"](a),e.$clickSelection=null,e.editor.renderer.$keepTextAreaAtCursor=c,e.editor.renderer.$moveTextAreaToCursor()},h=function(){e[e.state]&&e[e.state]()};d.capture(this.editor.container,f,g);var i=setInterval(h,20);a.preventDefault()}}).call(h.prototype),b.MouseHandler=h}),define("ace/mouse/default_handlers",["require","exports","module","ace/lib/dom","ace/lib/browser_focus"],function(a,b,c){function g(a){a.$clickSelection=null,a.browserFocus=new e;var b=a.editor;b.setDefaultHandler("mousedown",this.onMouseDown.bind(a)),b.setDefaultHandler("dblclick",this.onDoubleClick.bind(a)),b.setDefaultHandler("tripleclick",this.onTripleClick.bind(a)),b.setDefaultHandler("quadclick",this.onQuadClick.bind(a)),b.setDefaultHandler("mousewheel",this.onScroll.bind(a));var c=["select","startSelect","drag","dragEnd","dragWait","dragWaitEnd","startDrag"];c.forEach(function(b){a[b]=this[b]},this),a.selectByLines=this.extendSelectionBy.bind(a,"getLineRange"),a.selectByWords=this.extendSelectionBy.bind(a,"getWordRange")}function h(a,b,c,d){return Math.sqrt(Math.pow(c-a,2)+Math.pow(d-b,2))}"use strict";var d=a("../lib/dom"),e=a("../lib/browser_focus").BrowserFocus,f=5;(function(){this.onMouseDown=function(a){this.mousedownEvent=a;var b=a.inSelection(),c=a.getDocumentPosition(),d=this.editor,e=this;this.ev=a;var f=d.getSelectionRange(),g=f.isEmpty(),h=a.getButton();if(h!==0){g&&(d.moveCursorToPosition(c),d.selection.clearSelection()),this.moveTextarea=function(){d.textInput.onContextMenu({x:e.x,y:e.y})},this.moveTextareaEnd=d.textInput.onContextMenuClose,d.textInput.onContextMenu({x:this.x,y:this.y},g),this.captureMouse(a,"moveTextarea");return}if(b&&!d.isFocused()){d.focus();return}if(!b||this.$clickSelection||a.getShiftKey())this.startSelect(c);else if(b){var i=a.domEvent;i.ctrlKey||i.altKey?this.startDrag():(this.mousedownEvent.time=(new Date).getTime(),this.setState("dragWait"))}this.captureMouse(a)},this.startSelect=function(a){a=a||this.editor.renderer.screenToTextCoordinates(this.x,this.y),this.mousedownEvent.getShiftKey()?this.editor.selection.selectToPosition(a):this.$clickSelection||(this.editor.moveCursorToPosition(a),this.editor.selection.clearSelection()),this.setState("select")},this.select=function(){var a,b=this.editor,c=b.renderer.screenToTextCoordinates(this.x,this.y);if(this.$clickSelection){var d=this.$clickSelection.comparePoint(c);d==-1?a=this.$clickSelection.end:d==1?a=this.$clickSelection.start:(c=this.$clickSelection.end,a=this.$clickSelection.start),b.selection.setSelectionAnchor(a.row,a.column)}b.selection.selectToPosition(c),b.renderer.scrollCursorIntoView()},this.extendSelectionBy=function(a){var b,c=this.editor,d=c.renderer.screenToTextCoordinates(this.x,this.y),e=c.selection[a](d.row,d.column);if(this.$clickSelection){var f=this.$clickSelection.comparePoint(e.start),g=this.$clickSelection.comparePoint(e.end);f==-1&&g<=0?(b=this.$clickSelection.end,d=e.start):g==1&&f>=0?(b=this.$clickSelection.start,d=e.end):f==-1&&g==1?(d=e.end,b=e.start):(d=this.$clickSelection.end,b=this.$clickSelection.start),c.selection.setSelectionAnchor(b.row,b.column)}c.selection.selectToPosition(d),c.renderer.scrollCursorIntoView()},this.startDrag=function(){var a=this.editor;this.setState("drag"),this.dragRange=a.getSelectionRange();var b=a.getSelectionStyle();this.dragSelectionMarker=a.session.addMarker(this.dragRange,"ace_selection",b),a.clearSelection(),d.addCssClass(a.container,"ace_dragging"),this.$dragKeybinding||(this.$dragKeybinding={handleKeyboard:function(a,b,c,d){if(c=="esc")return{command:this.command}},command:{exec:function(a){var b=a.$mouseHandler;b.dragCursor=null,b.dragEnd(),b.startSelect()}}}),a.keyBinding.addKeyboardHandler(this.$dragKeybinding)},this.dragWait=function(){var a=h(this.mousedownEvent.x,this.mousedownEvent.y,this.x,this.y),b=(new Date).getTime(),c=this.editor;a>f?this.startSelect():b-this.mousedownEvent.time>c.getDragDelay()&&this.startDrag()},this.dragWaitEnd=function(a){this.mousedownEvent.domEvent=a,this.startSelect()},this.drag=function(){var a=this.editor;this.dragCursor=a.renderer.screenToTextCoordinates(this.x,this.y),a.moveCursorToPosition(this.dragCursor),a.renderer.scrollCursorIntoView()},this.dragEnd=function(a){var b=this.editor,c=this.dragCursor,e=this.dragRange;d.removeCssClass(b.container,"ace_dragging"),b.session.removeMarker(this.dragSelectionMarker),b.keyBinding.removeKeyboardHandler(this.$dragKeybinding);if(!c)return;b.clearSelection();if(a&&(a.ctrlKey||a.altKey)){var f=b.session,g=e;g.end=f.insert(c,f.getTextRange(e)),g.start=c}else{if(e.contains(c.row,c.column))return;var g=b.moveText(e,c)}if(!g)return;b.selection.setSelectionRange(g)},this.onDoubleClick=function(a){var b=a.getDocumentPosition(),c=this.editor;this.setState("selectByWords"),c.moveCursorToPosition(b),c.selection.selectWord(),this.$clickSelection=c.getSelectionRange()},this.onTripleClick=function(a){var b=a.getDocumentPosition(),c=this.editor;this.setState("selectByLines"),c.moveCursorToPosition(b),c.selection.selectLine(),this.$clickSelection=c.getSelectionRange()},this.onQuadClick=function(a){var b=this.editor;b.selectAll(),this.$clickSelection=b.getSelectionRange(),this.setState("select")},this.onScroll=function(a){var b=this.editor,c=b.renderer.isScrollableBy(a.wheelX*a.speed,a.wheelY*a.speed);if(c)this.$passScrollEvent=!1;else{if(this.$passScrollEvent)return;if(!this.$scrollStopTimeout){var d=this;this.$scrollStopTimeout=setTimeout(function(){d.$passScrollEvent=!0,d.$scrollStopTimeout=null},200)}}return b.renderer.scrollBy(a.wheelX*a.speed,a.wheelY*a.speed),a.preventDefault()}}).call(g.prototype),b.DefaultHandlers=g}),define("ace/lib/browser_focus",["require","exports","module","ace/lib/oop","ace/lib/event","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("./oop"),e=a("./event"),f=a("./event_emitter").EventEmitter,g=function(a){a=a||window,this.lastFocus=(new Date).getTime(),this._isFocused=!0;var b=this;"onfocusin"in a.document?(e.addListener(a.document,"focusin",function(a){b._setFocused(!0)}),e.addListener(a.document,"focusout",function(a){b._setFocused(!!a.toElement)})):(e.addListener(a,"blur",function(a){b._setFocused(!1)}),e.addListener(a,"focus",function(a){b._setFocused(!0)}))};(function(){d.implement(this,f),this.isFocused=function(){return this._isFocused},this._setFocused=function(a){if(this._isFocused==a)return;a&&(this.lastFocus=(new Date).getTime()),this._isFocused=a,this._emit("changeFocus")}}).call(g.prototype),b.BrowserFocus=g}),define("ace/lib/event_emitter",["require","exports","module"],function(a,b,c){"use strict";var d={};d._emit=d._dispatchEvent=function(a,b){this._eventRegistry=this._eventRegistry||{},this._defaultHandlers=this._defaultHandlers||{};var c=this._eventRegistry[a]||[],d=this._defaultHandlers[a];if(!c.length&&!d)return;b=b||{},b.type=a,b.stopPropagation||(b.stopPropagation=function(){this.propagationStopped=!0}),b.preventDefault||(b.preventDefault=function(){this.defaultPrevented=!0});for(var e=0;e<c.length;e++){c[e](b);if(b.propagationStopped)break}if(d&&!b.defaultPrevented)return d(b)},d.setDefaultHandler=function(a,b){this._defaultHandlers=this._defaultHandlers||{};if(this._defaultHandlers[a])throw new Error("The default handler for '"+a+"' is already set");this._defaultHandlers[a]=b},d.on=d.addEventListener=function(a,b){this._eventRegistry=this._eventRegistry||{};var c=this._eventRegistry[a];if(!c)var c=this._eventRegistry[a]=[];c.indexOf(b)==-1&&c.push(b)},d.removeListener=d.removeEventListener=function(a,b){this._eventRegistry=this._eventRegistry||{};var c=this._eventRegistry[a];if(!c)return;var d=c.indexOf(b);d!==-1&&c.splice(d,1)},d.removeAllListeners=function(a){this._eventRegistry&&(this._eventRegistry[a]=[])},b.EventEmitter=d}),define("ace/mouse/default_gutter_handler",["require","exports","module"],function(a,b,c){function d(a){var b=a.editor;a.editor.setDefaultHandler("guttermousedown",function(c){if(c.domEvent.target.className.indexOf("ace_gutter-cell")==-1)return;if(!b.isFocused())return;var d=c.getDocumentPosition().row,e=b.session.selection;e.moveCursorTo(d,0),e.selectLine(),a.$clickSelection=e.getRange(),a.captureMouse(c,"selectByLines")})}"use strict",b.GutterHandler=d}),define("ace/mouse/mouse_event",["require","exports","module","ace/lib/event"],function(a,b,c){"use strict";var d=a("../lib/event"),e=b.MouseEvent=function(a,b){this.domEvent=a,this.editor=b,this.x=this.clientX=a.clientX,this.y=this.clientY=a.clientY,this.$pos=null,this.$inSelection=null,this.propagationStopped=!1,this.defaultPrevented=!1};(function(){this.stopPropagation=function(){d.stopPropagation(this.domEvent),this.propagationStopped=!0},this.preventDefault=function(){d.preventDefault(this.domEvent),this.defaultPrevented=!0},this.stop=function(){this.stopPropagation(),this.preventDefault()},this.getDocumentPosition=function(){return this.$pos?this.$pos:(this.$pos=this.editor.renderer.screenToTextCoordinates(this.clientX,this.clientY),this.$pos)},this.inSelection=function(){if(this.$inSelection!==null)return this.$inSelection;var a=this.editor;if(a.getReadOnly())this.$inSelection=!1;else{var b=a.getSelectionRange();if(b.isEmpty())this.$inSelection=!1;else{var c=this.getDocumentPosition();this.$inSelection=b.contains(c.row,c.column)}}return this.$inSelection},this.getButton=function(){return d.getButton(this.domEvent)},this.getShiftKey=function(){return this.domEvent.shiftKey},this.getAccelKey=function(){return this.domEvent.ctrlKey||this.domEvent.metaKey}}).call(e.prototype)}),define("ace/mouse/fold_handler",["require","exports","module"],function(a,b,c){function d(a){a.on("click",function(b){var c=b.getDocumentPosition(),d=a.session,e=d.getFoldAt(c.row,c.column,1);e&&(b.getAccelKey()?d.removeFold(e):d.expandFold(e),b.stop())}),a.on("gutterclick",function(b){if(b.domEvent.target.className.indexOf("ace_fold-widget")!=-1){var c=b.getDocumentPosition().row;a.session.onFoldWidgetClick(c,b.domEvent),b.stop()}})}"use strict",b.FoldHandler=d}),define("ace/keyboard/keybinding",["require","exports","module","ace/lib/keys","ace/lib/event","ace/commands/default_commands"],function(a,b,c){"use strict";var d=a("../lib/keys"),e=a("../lib/event");a("../commands/default_commands");var f=function(a){this.$editor=a,this.$data={},this.$handlers=[],this.setDefaultHandler(a.commands)};(function(){this.setDefaultHandler=function(a){this.removeKeyboardHandler(this.$defaultHandler),this.$defaultHandler=a,a&&this.$handlers.unshift(a),this.$data={}},this.setKeyboardHandler=function(a){if(this.$handlers[this.$handlers.length-1]==a)return;this.$data={},this.$handlers=[],this.setDefaultHandler(this.$defaultHandler),a&&this.$handlers.push(a)},this.addKeyboardHandler=function(a){this.removeKeyboardHandler(a),this.$handlers.push(a)},this.removeKeyboardHandler=function(a){var b=this.$handlers.indexOf(a);return b==-1?!1:(this.$handlers.splice(b,1),!0)},this.getKeyboardHandler=function(){return this.$handlers[this.$handlers.length-1]},this.$callKeyboardHandlers=function(a,b,c,d){var f;for(var g=this.$handlers.length;g--;){f=this.$handlers[g].handleKeyboard(this.$data,a,b,c,d);if(f&&f.command)break}if(!f||!f.command)return!1;var h=!1,i=this.$editor.commands;return f.command!="null"?h=i.exec(f.command,this.$editor,f.args,d):h=!0,h&&d&&e.stopEvent(d),h},this.onCommandKey=function(a,b,c){var e=d.keyCodeToString(c);this.$callKeyboardHandlers(b,e,c,a)},this.onTextInput=function(a){var b=!1;a.length==1&&(b=this.$callKeyboardHandlers(0,a)),b||this.$editor.commands.exec("insertstring",this.$editor,a)}}).call(f.prototype),b.KeyBinding=f}),define("ace/commands/default_commands",["require","exports","module","ace/lib/lang"],function(a,b,c){function e(a,b){return{win:a,mac:b}}"use strict";var d=a("../lib/lang");b.commands=[{name:"selectall",bindKey:e("Ctrl-A","Command-A"),exec:function(a){a.selectAll()},readOnly:!0},{name:"centerselection",bindKey:e(null,"Ctrl-L"),exec:function(a){a.centerSelection()},readOnly:!0},{name:"gotoline",bindKey:e("Ctrl-L","Command-L"),exec:function(a){var b=parseInt(prompt("Enter line number:"),10);isNaN(b)||a.gotoLine(b)},readOnly:!0},{name:"fold",bindKey:e("Alt-L","Alt-L"),exec:function(a){a.session.toggleFold(!1)},readOnly:!0},{name:"unfold",bindKey:e("Alt-Shift-L","Alt-Shift-L"),exec:function(a){a.session.toggleFold(!0)},readOnly:!0},{name:"foldall",bindKey:e("Alt-0","Alt-0"),exec:function(a){a.session.foldAll()},readOnly:!0},{name:"unfoldall",bindKey:e("Alt-Shift-0","Alt-Shift-0"),exec:function(a){a.session.unfold()},readOnly:!0},{name:"findnext",bindKey:e("Ctrl-K","Command-G"),exec:function(a){a.findNext()},readOnly:!0},{name:"findprevious",bindKey:e("Ctrl-Shift-K","Command-Shift-G"),exec:function(a){a.findPrevious()},readOnly:!0},{name:"find",bindKey:e("Ctrl-F","Command-F"),exec:function(a){var b=prompt("Find:",a.getCopyText());a.find(b)},readOnly:!0},{name:"overwrite",bindKey:e("Insert","Insert"),exec:function(a){a.toggleOverwrite()},readOnly:!0},{name:"selecttostart",bindKey:e("Ctrl-Shift-Home|Alt-Shift-Up","Command-Shift-Up"),exec:function(a){a.getSelection().selectFileStart()},readOnly:!0},{name:"gotostart",bindKey:e("Ctrl-Home|Ctrl-Up","Command-Home|Command-Up"),exec:function(a){a.navigateFileStart()},readOnly:!0},{name:"selectup",bindKey:e("Shift-Up","Shift-Up"),exec:function(a){a.getSelection().selectUp()},multiSelectAction:"forEach",readOnly:!0},{name:"golineup",bindKey:e("Up","Up|Ctrl-P"),exec:function(a,b){a.navigateUp(b.times)},multiSelectAction:"forEach",readOnly:!0},{name:"selecttoend",bindKey:e("Ctrl-Shift-End|Alt-Shift-Down","Command-Shift-Down"),exec:function(a){a.getSelection().selectFileEnd()},multiSelectAction:"forEach",readOnly:!0},{name:"gotoend",bindKey:e("Ctrl-End|Ctrl-Down","Command-End|Command-Down"),exec:function(a){a.navigateFileEnd()},multiSelectAction:"forEach",readOnly:!0},{name:"selectdown",bindKey:e("Shift-Down","Shift-Down"),exec:function(a){a.getSelection().selectDown()},multiSelectAction:"forEach",readOnly:!0},{name:"golinedown",bindKey:e("Down","Down|Ctrl-N"),exec:function(a,b){a.navigateDown(b.times)},multiSelectAction:"forEach",readOnly:!0},{name:"selectwordleft",bindKey:e("Ctrl-Shift-Left","Option-Shift-Left"),exec:function(a){a.getSelection().selectWordLeft()},multiSelectAction:"forEach",readOnly:!0},{name:"gotowordleft",bindKey:e("Ctrl-Left","Option-Left"),exec:function(a){a.navigateWordLeft()},multiSelectAction:"forEach",readOnly:!0},{name:"selecttolinestart",bindKey:e("Alt-Shift-Left","Command-Shift-Left"),exec:function(a){a.getSelection().selectLineStart()},multiSelectAction:"forEach",readOnly:!0},{name:"gotolinestart",bindKey:e("Alt-Left|Home","Command-Left|Home|Ctrl-A"),exec:function(a){a.navigateLineStart()},multiSelectAction:"forEach",readOnly:!0},{name:"selectleft",bindKey:e("Shift-Left","Shift-Left"),exec:function(a){a.getSelection().selectLeft()},multiSelectAction:"forEach",readOnly:!0},{name:"gotoleft",bindKey:e("Left","Left|Ctrl-B"),exec:function(a,b){a.navigateLeft(b.times)},multiSelectAction:"forEach",readOnly:!0},{name:"selectwordright",bindKey:e("Ctrl-Shift-Right","Option-Shift-Right"),exec:function(a){a.getSelection().selectWordRight()},multiSelectAction:"forEach",readOnly:!0},{name:"gotowordright",bindKey:e("Ctrl-Right","Option-Right"),exec:function(a){a.navigateWordRight()},multiSelectAction:"forEach",readOnly:!0},{name:"selecttolineend",bindKey:e("Alt-Shift-Right","Command-Shift-Right"),exec:function(a){a.getSelection().selectLineEnd()},multiSelectAction:"forEach",readOnly:!0},{name:"gotolineend",bindKey:e("Alt-Right|End","Command-Right|End|Ctrl-E"),exec:function(a){a.navigateLineEnd()},multiSelectAction:"forEach",readOnly:!0},{name:"selectright",bindKey:e("Shift-Right","Shift-Right"),exec:function(a){a.getSelection().selectRight()},multiSelectAction:"forEach",readOnly:!0},{name:"gotoright",bindKey:e("Right","Right|Ctrl-F"),exec:function(a,b){a.navigateRight(b.times)},multiSelectAction:"forEach",readOnly:!0},{name:"selectpagedown",bindKey:e("Shift-PageDown","Shift-PageDown"),exec:function(a){a.selectPageDown()},readOnly:!0},{name:"pagedown",bindKey:e(null,"PageDown"),exec:function(a){a.scrollPageDown()},readOnly:!0},{name:"gotopagedown",bindKey:e("PageDown","Option-PageDown|Ctrl-V"),exec:function(a){a.gotoPageDown()},readOnly:!0},{name:"selectpageup",bindKey:e("Shift-PageUp","Shift-PageUp"),exec:function(a){a.selectPageUp()},readOnly:!0},{name:"pageup",bindKey:e(null,"PageUp"),exec:function(a){a.scrollPageUp()},readOnly:!0},{name:"gotopageup",bindKey:e("PageUp","Option-PageUp"),exec:function(a){a.gotoPageUp()},readOnly:!0},{name:"selectlinestart",bindKey:e("Shift-Home","Shift-Home"),exec:function(a){a.getSelection().selectLineStart()},multiSelectAction:"forEach",readOnly:!0},{name:"selectlineend",bindKey:e("Shift-End","Shift-End"),exec:function(a){a.getSelection().selectLineEnd()},multiSelectAction:"forEach",readOnly:!0},{name:"togglerecording",bindKey:e("Ctrl-Alt-E","Command-Option-E"),exec:function(a){a.commands.toggleRecording()},readOnly:!0},{name:"replaymacro",bindKey:e("Ctrl-Shift-E","Command-Shift-E"),exec:function(a){a.commands.replay(a)},readOnly:!0},{name:"jumptomatching",bindKey:e("Ctrl-Shift-P","Ctrl-Shift-P"),exec:function(a){a.jumpToMatching()},multiSelectAction:"forEach",readOnly:!0},{name:"cut",exec:function(a){var b=a.getSelectionRange();a._emit("cut",b),a.selection.isEmpty()||(a.session.remove(b),a.clearSelection())},multiSelectAction:"forEach"},{name:"removeline",bindKey:e("Ctrl-D","Command-D"),exec:function(a){a.removeLines()},multiSelectAction:"forEach"},{name:"togglecomment",bindKey:e("Ctrl-/","Command-/"),exec:function(a){a.toggleCommentLines()},multiSelectAction:"forEach"},{name:"replace",bindKey:e("Ctrl-R","Command-Option-F"),exec:function(a){var b=prompt("Find:",a.getCopyText());if(!b)return;var c=prompt("Replacement:");if(!c)return;a.replace(c,{needle:b})}},{name:"replaceall",bindKey:e("Ctrl-Shift-R","Command-Shift-Option-F"),exec:function(a){var b=prompt("Find:");if(!b)return;var c=prompt("Replacement:");if(!c)return;a.replaceAll(c,{needle:b})}},{name:"undo",bindKey:e("Ctrl-Z","Command-Z"),exec:function(a){a.undo()}},{name:"redo",bindKey:e("Ctrl-Shift-Z|Ctrl-Y","Command-Shift-Z|Command-Y"),exec:function(a){a.redo()}},{name:"copylinesup",bindKey:e("Ctrl-Alt-Up","Command-Option-Up"),exec:function(a){a.copyLinesUp()}},{name:"movelinesup",bindKey:e("Alt-Up","Option-Up"),exec:function(a){a.moveLinesUp()}},{name:"copylinesdown",bindKey:e("Ctrl-Alt-Down","Command-Option-Down"),exec:function(a){a.copyLinesDown()}},{name:"movelinesdown",bindKey:e("Alt-Down","Option-Down"),exec:function(a){a.moveLinesDown()}},{name:"del",bindKey:e("Delete","Delete|Ctrl-D"),exec:function(a){a.remove("right")},multiSelectAction:"forEach"},{name:"backspace",bindKey:e("Command-Backspace|Option-Backspace|Shift-Backspace|Backspace","Ctrl-Backspace|Command-Backspace|Shift-Backspace|Backspace|Ctrl-H"),exec:function(a){a.remove("left")},multiSelectAction:"forEach"},{name:"removetolinestart",bindKey:e("Alt-Backspace","Command-Backspace"),exec:function(a){a.removeToLineStart()},multiSelectAction:"forEach"},{name:"removetolineend",bindKey:e("Alt-Delete","Ctrl-K"),exec:function(a){a.removeToLineEnd()},multiSelectAction:"forEach"},{name:"removewordleft",bindKey:e("Ctrl-Backspace","Alt-Backspace|Ctrl-Alt-Backspace"),exec:function(a){a.removeWordLeft()},multiSelectAction:"forEach"},{name:"removewordright",bindKey:e("Ctrl-Delete","Alt-Delete"),exec:function(a){a.removeWordRight()},multiSelectAction:"forEach"},{name:"outdent",bindKey:e("Shift-Tab","Shift-Tab"),exec:function(a){a.blockOutdent()},multiSelectAction:"forEach"},{name:"indent",bindKey:e("Tab","Tab"),exec:function(a){a.indent()},multiSelectAction:"forEach"},{name:"insertstring",exec:function(a,b){a.insert(b)},multiSelectAction:"forEach"},{name:"inserttext",exec:function(a,b){a.insert(d.stringRepeat(b.text||"",b.times||1))},multiSelectAction:"forEach"},{name:"splitline",bindKey:e(null,"Ctrl-O"),exec:function(a){a.splitLine()},multiSelectAction:"forEach"},{name:"transposeletters",bindKey:e("Ctrl-T","Ctrl-T"),exec:function(a){a.transposeLetters()},multiSelectAction:function(a){a.transposeSelections(1)}},{name:"touppercase",bindKey:e("Ctrl-U","Ctrl-U"),exec:function(a){a.toUpperCase()},multiSelectAction:"forEach"},{name:"tolowercase",bindKey:e("Ctrl-Shift-U","Ctrl-Shift-U"),exec:function(a){a.toLowerCase()},multiSelectAction:"forEach"}]}),define("ace/edit_session",["require","exports","module","ace/config","ace/lib/oop","ace/lib/lang","ace/lib/net","ace/lib/event_emitter","ace/selection","ace/mode/text","ace/range","ace/document","ace/background_tokenizer","ace/edit_session/folding","ace/edit_session/bracket_match"],function(a,b,c){"use strict";var d=a("./config"),e=a("./lib/oop"),f=a("./lib/lang"),g=a("./lib/net"),h=a("./lib/event_emitter").EventEmitter,i=a("./selection").Selection,j=a("./mode/text").Mode,k=a("./range").Range,l=a("./document").Document,m=a("./background_tokenizer").BackgroundTokenizer,n=function(a,b){this.$modified=!0,this.$breakpoints=[],this.$frontMarkers={},this.$backMarkers={},this.$markerId=1,this.$rowCache=[],this.$wrapData=[],this.$foldData=[],this.$undoSelect=!0,this.$foldData.toString=function(){var a="";return this.forEach(function(b){a+="\n"+b.toString()}),a},a instanceof l?this.setDocument(a):this.setDocument(new l(a)),this.selection=new i(this),this.setMode(b)};(function(){function r(a){return a<4352?!1:a>=4352&&a<=4447||a>=4515&&a<=4519||a>=4602&&a<=4607||a>=9001&&a<=9002||a>=11904&&a<=11929||a>=11931&&a<=12019||a>=12032&&a<=12245||a>=12272&&a<=12283||a>=12288&&a<=12350||a>=12353&&a<=12438||a>=12441&&a<=12543||a>=12549&&a<=12589||a>=12593&&a<=12686||a>=12688&&a<=12730||a>=12736&&a<=12771||a>=12784&&a<=12830||a>=12832&&a<=12871||a>=12880&&a<=13054||a>=13056&&a<=19903||a>=19968&&a<=42124||a>=42128&&a<=42182||a>=43360&&a<=43388||a>=44032&&a<=55203||a>=55216&&a<=55238||a>=55243&&a<=55291||a>=63744&&a<=64255||a>=65040&&a<=65049||a>=65072&&a<=65106||a>=65108&&a<=65126||a>=65128&&a<=65131||a>=65281&&a<=65376||a>=65504&&a<=65510}e.implement(this,h),this.setDocument=function(a){if(this.doc)throw new Error("Document is already set");this.doc=a,a.on("change",this.onChange.bind(this)),this.on("changeFold",this.onChangeFold.bind(this)),this.bgTokenizer&&(this.bgTokenizer.setDocument(this.getDocument()),this.bgTokenizer.start(0))},this.getDocument=function(){return this.doc},this.$resetRowCache=function(a){if(a==0){this.$rowCache=[];return}var b=this.$rowCache;for(var c=0;c<b.length;c++)if(b[c].docRow>=a){b.splice(c,b.length);return}},this.onChangeFold=function(a){var b=a.data;this.$resetRowCache(b.start.row)},this.onChange=function(a){var b=a.data;this.$modified=!0,this.$resetRowCache(b.range.start.row);var c=this.$updateInternalDataOnChange(a);!this.$fromUndo&&this.$undoManager&&!b.ignore&&(this.$deltasDoc.push(b),c&&c.length!=0&&this.$deltasFold.push({action:"removeFolds",folds:c}),this.$informUndoManager.schedule()),this.bgTokenizer.start(b.range.start.row),this._emit("change",a)},this.setValue=function(a){this.doc.setValue(a),this.selection.moveCursorTo(0,0),this.selection.clearSelection(),this.$resetRowCache(0),this.$deltas=[],this.$deltasDoc=[],this.$deltasFold=[],this.getUndoManager().reset()},this.getValue=this.toString=function(){return this.doc.getValue()},this.getSelection=function(){return this.selection},this.getState=function(a){return this.bgTokenizer.getState(a)},this.getTokens=function(a,b){return this.bgTokenizer.getTokens(a,b)},this.getTokenAt=function(a,b){var c=this.bgTokenizer.getTokens(a,a)[0].tokens,d,e=0;if(b==null)f=c.length-1,e=this.getLine(a).length;else for(var f=0;f<c.length;f++){e+=c[f].value.length;if(e>=b)break}return d=c[f],d?(d.index=f,d.start=e-d.value.length,d):null},this.setUndoManager=function(a){this.$undoManager=a,this.$resetRowCache(0),this.$deltas=[],this.$deltasDoc=[],this.$deltasFold=[],this.$informUndoManager&&this.$informUndoManager.cancel();if(a){var b=this;this.$syncInformUndoManager=function(){b.$informUndoManager.cancel(),b.$deltasFold.length&&(b.$deltas.push({group:"fold",deltas:b.$deltasFold}),b.$deltasFold=[]),b.$deltasDoc.length&&(b.$deltas.push({group:"doc",deltas:b.$deltasDoc}),b.$deltasDoc=[]),b.$deltas.length>0&&a.execute({action:"aceupdate",args:[b.$deltas,b]}),b.$deltas=[]},this.$informUndoManager=f.deferredCall(this.$syncInformUndoManager)}},this.$defaultUndoManager={undo:function(){},redo:function(){},reset:function(){}},this.getUndoManager=function(){return this.$undoManager||this.$defaultUndoManager},this.getTabString=function(){return this.getUseSoftTabs()?f.stringRepeat(" ",this.getTabSize()):"	"},this.$useSoftTabs=!0,this.setUseSoftTabs=function(a){if(this.$useSoftTabs===a)return;this.$useSoftTabs=a},this.getUseSoftTabs=function(){return this.$useSoftTabs},this.$tabSize=4,this.setTabSize=function(a){if(isNaN(a)||this.$tabSize===a)return;this.$modified=!0,this.$tabSize=a,this._emit("changeTabSize")},this.getTabSize=function(){return this.$tabSize},this.isTabStop=function(a){return this.$useSoftTabs&&a.column%this.$tabSize==0},this.$overwrite=!1,this.setOverwrite=function(a){if(this.$overwrite==a)return;this.$overwrite=a,this._emit("changeOverwrite")},this.getOverwrite=function(){return this.$overwrite},this.toggleOverwrite=function(){this.setOverwrite(!this.$overwrite)},this.getBreakpoints=function(){return this.$breakpoints},this.setBreakpoints=function(a){this.$breakpoints=[];for(var b=0;b<a.length;b++)this.$breakpoints[a[b]]=!0;this._emit("changeBreakpoint",{})},this.clearBreakpoints=function(){this.$breakpoints=[],this._emit("changeBreakpoint",{})},this.setBreakpoint=function(a){this.$breakpoints[a]=!0,this._emit("changeBreakpoint",{})},this.clearBreakpoint=function(a){delete this.$breakpoints[a],this._emit("changeBreakpoint",{})},this.addMarker=function(a,b,c,d){var e=this.$markerId++,f={range:a,type:c||"line",renderer:typeof c=="function"?c:null,clazz:b,inFront:!!d};return d?(this.$frontMarkers[e]=f,this._emit("changeFrontMarker")):(this.$backMarkers[e]=f,this._emit("changeBackMarker")),e},this.removeMarker=function(a){var b=this.$frontMarkers[a]||this.$backMarkers[a];if(!b)return;var c=b.inFront?this.$frontMarkers:this.$backMarkers;b&&(delete c[a],this._emit(b.inFront?"changeFrontMarker":"changeBackMarker"))},this.getMarkers=function(a){return a?this.$frontMarkers:this.$backMarkers},this.setAnnotations=function(a){this.$annotations={};for(var b=0;b<a.length;b++){var c=a[b],d=c.row;this.$annotations[d]?this.$annotations[d].push(c):this.$annotations[d]=[c]}this._emit("changeAnnotation",{})},this.getAnnotations=function(){return this.$annotations||{}},this.clearAnnotations=function(){this.$annotations={},this._emit("changeAnnotation",{})},this.$detectNewLine=function(a){var b=a.match(/^.*?(\r?\n)/m);b?this.$autoNewLine=b[1]:this.$autoNewLine="\n"},this.getWordRange=function(a,b){var c=this.getLine(a),d=!1;b>0&&(d=!!c.charAt(b-1).match(this.tokenRe)),d||(d=!!c.charAt(b).match(this.tokenRe));var e=d?this.tokenRe:this.nonTokenRe,f=b;if(f>0){do f--;while(f>=0&&c.charAt(f).match(e));f++}var g=b;while(g<c.length&&c.charAt(g).match(e))g++;return new k(a,f,a,g)},this.getAWordRange=function(a,b){var c=this.getWordRange(a,b),d=this.getLine(c.end.row);while(d.charAt(c.end.column).match(/[ \t]/))c.end.column+=1;return c},this.setNewLineMode=function(a){this.doc.setNewLineMode(a)},this.getNewLineMode=function(){return this.doc.getNewLineMode()},this.$useWorker=!0,this.setUseWorker=function(a){if(this.$useWorker==a)return;this.$useWorker=a,this.$stopWorker(),a&&this.$startWorker()},this.getUseWorker=function(){return this.$useWorker},this.onReloadTokenizer=function(a){var b=a.data;this.bgTokenizer.start(b.first),this._emit("tokenizerUpdate",a)},this.$modes={},this._loadMode=function(b,c){function i(a){if(e.$modes[b])return c(e.$modes[b]);e.$modes[b]=new a.Mode,e.$modes[b].$id=b,e._emit("loadmode",{name:b,mode:e.$modes[b]}),c(e.$modes[b])}function j(a){if(!d.get("packaged"))return a();var c=b.split("/").pop(),e=d.get("modePath")+"/mode-"+c+d.get("suffix");g.loadScript(e,a)}if(this.$modes[b])return c(this.$modes[b]);var e=this,f;try{f=a(b)}catch(h){}if(f)return i(f);j(function(){a([b],i)})},this.$mode=null,this.$modeId=null,this.setMode=function(a){if(typeof a=="string"){if(this.$modeId==a)return;this.$modeId=a;var b=this;this._loadMode(a,function(c){if(b.$modeId!==a)return;b.setMode(c)});return}if(a==null){a="ace/mode/text",this.$modeId=a,this.$modes[a]=this.$modes[a]||new j,this.setMode(this.$modes[a]);return}if(this.$mode===a)return;this.$mode=a,this.$modeId=a.$id,this.$stopWorker(),this.$useWorker&&this.$startWorker();var c=a.getTokenizer();if(c.addEventListener!==undefined){var d=this.onReloadTokenizer.bind(this);c.addEventListener("update",d)}if(!this.bgTokenizer){this.bgTokenizer=new m(c);var b=this;this.bgTokenizer.addEventListener("update",function(a){b._emit("tokenizerUpdate",a)})}else this.bgTokenizer.setTokenizer(c);this.bgTokenizer.setDocument(this.getDocument()),this.bgTokenizer.start(0),this.tokenRe=a.tokenRe,this.nonTokenRe=a.nonTokenRe,this.$setFolding(a.foldingRules),this._emit("changeMode")},this.$stopWorker=function(){this.$worker&&this.$worker.terminate(),this.$worker=null},this.$startWorker=function(){if(typeof Worker!="undefined"&&!a.noWorker)try{this.$worker=this.$mode.createWorker(this)}catch(b){console.log("Could not load worker"),console.log(b),this.$worker=null}else this.$worker=null},this.getMode=function(){return this.$mode},this.$scrollTop=0,this.setScrollTop=function(a){a=Math.round(Math.max(0,a));if(this.$scrollTop===a)return;this.$scrollTop=a,this._emit("changeScrollTop",a)},this.getScrollTop=function(){return this.$scrollTop},this.$scrollLeft=0,this.setScrollLeft=function(a){a=Math.round(Math.max(0,a));if(this.$scrollLeft===a)return;this.$scrollLeft=a,this._emit("changeScrollLeft",a)},this.getScrollLeft=function(){return this.$scrollLeft},this.getWidth=function(){return this.$computeWidth(),this.width},this.getScreenWidth=function(){return this.$computeWidth(),this.screenWidth},this.$computeWidth=function(a){if(this.$modified||a){this.$modified=!1;var b=this.doc.getAllLines(),c=0,d=0;for(var e=0;e<b.length;e++){var f=this.getFoldLine(e),g,h;g=b[e];if(f){var i=f.range.end;g=this.getFoldDisplayLine(f),e=i.row}h=g.length,c=Math.max(c,h),this.$useWrapMode||(d=Math.max(d,this.$getStringScreenWidth(g)[0]))}this.width=c,this.$useWrapMode?this.screenWidth=this.$wrapLimit:this.screenWidth=d}},this.getLine=function(a){return this.doc.getLine(a)},this.getLines=function(a,b){return this.doc.getLines(a,b)},this.getLength=function(){return this.doc.getLength()},this.getTextRange=function(a){return this.doc.getTextRange(a)},this.insert=function(a,b){return this.doc.insert(a,b)},this.remove=function(a){return this.doc.remove(a)},this.undoChanges=function(a,b){if(!a.length)return;this.$fromUndo=!0;var c=null;for(var d=a.length-1;d!=-1;d--){var e=a[d];e.group=="doc"?(this.doc.revertDeltas(e.deltas),c=this.$getUndoSelection(e.deltas,!0,c)):e.deltas.forEach(function(a){this.addFolds(a.folds)},this)}return this.$fromUndo=!1,c&&this.$undoSelect&&!b&&this.selection.setSelectionRange(c),c},this.redoChanges=function(a,b){if(!a.length)return;this.$fromUndo=!0;var c=null;for(var d=0;d<a.length;d++){var e=a[d];e.group=="doc"&&(this.doc.applyDeltas(e.deltas),c=this.$getUndoSelection(e.deltas,!1,c))}return this.$fromUndo=!1,c&&this.$undoSelect&&!b&&this.selection.setSelectionRange(c),c},this.setUndoSelect=function(a){this.$undoSelect=a},this.$getUndoSelection=function(a,b,c){function d(a){var c=a.action=="insertText"||a.action=="insertLines";return b?!c:c}var e=a[0],f,g,h=!1;d(e)?(f=e.range.clone(),h=!0):(f=k.fromPoints(e.range.start,e.range.start),h=!1);for(var i=1;i<a.length;i++)e=a[i],d(e)?(g=e.range.start,f.compare(g.row,g.column)==-1&&f.setStart(e.range.start),g=e.range.end,f.compare(g.row,g.column)==1&&f.setEnd(e.range.end),h=!0):(g=e.range.start,f.compare(g.row,g.column)==-1&&(f=k.fromPoints(e.range.start,e.range.start)),h=!1);if(c!=null){var j=c.compareRange(f);j==1?f.setStart(c.start):j==-1&&f.setEnd(c.end)}return f},this.replace=function(a,b){return this.doc.replace(a,b)},this.moveText=function(a,b){var c=this.getTextRange(a);this.remove(a);var d=b.row,e=b.column;!a.isMultiLine()&&a.start.row==d&&a.end.column<e&&(e-=c.length);if(a.isMultiLine()&&a.end.row<d){var f=this.doc.$split(c);d-=f.length-1}var g=d+a.end.row-a.start.row,h=a.isMultiLine()?a.end.column:e+a.end.column-a.start.column,i=new k(d,e,g,h);return this.insert(i.start,c),i},this.indentRows=function(a,b,c){c=c.replace(/\t/g,this.getTabString());for(var d=a;d<=b;d++)this.insert({row:d,column:0},c)},this.outdentRows=function(a){var b=a.collapseRows(),c=new k(0,0,0,0),d=this.getTabSize();for(var e=b.start.row;e<=b.end.row;++e){var f=this.getLine(e);c.start.row=e,c.end.row=e;for(var g=0;g<d;++g)if(f.charAt(g)!=" ")break;g<d&&f.charAt(g)=="	"?(c.start.column=g,c.end.column=g+1):(c.start.column=0,c.end.column=g),this.remove(c)}},this.moveLinesUp=function(a,b){if(a<=0)return 0;var c=this.doc.removeLines(a,b);return this.doc.insertLines(a-1,c),-1},this.moveLinesDown=function(a,b){if(b>=this.doc.getLength()-1)return 0;var c=this.doc.removeLines(a,b);return this.doc.insertLines(a+1,c),1},this.duplicateLines=function(a,b){var a=this.$clipRowToDocument(a),b=this.$clipRowToDocument(b),c=this.getLines(a,b);this.doc.insertLines(a,c);var d=b-a+1;return d},this.$clipRowToDocument=function(a){return Math.max(0,Math.min(a,this.doc.getLength()-1))},this.$clipColumnToRow=function(a,b){return b<0?0:Math.min(this.doc.getLine(a).length,b)},this.$clipPositionToDocument=function(a,b){b=Math.max(0,b);if(a<0)a=0,b=0;else{var c=this.doc.getLength();a>=c?(a=c-1,b=this.doc.getLine(c-1).length):b=Math.min(this.doc.getLine(a).length,b)}return{row:a,column:b}},this.$clipRangeToDocument=function(a){a.start.row<0?(a.start.row=0,a.start.column=0):a.start.column=this.$clipColumnToRow(a.start.row,a.start.column);var b=this.doc.getLength()-1;return a.end.row>b?(a.end.row=b,a.end.column=this.doc.getLine(b).length):a.end.column=this.$clipColumnToRow(a.end.row,a.end.column),a},this.$wrapLimit=80,this.$useWrapMode=!1,this.$wrapLimitRange={min:null,max:null},this.setUseWrapMode=function(a){if(a!=this.$useWrapMode){this.$useWrapMode=a,this.$modified=!0,this.$resetRowCache(0);if(a){var b=this.getLength();this.$wrapData=[];for(var c=0;c<b;c++)this.$wrapData.push([]);this.$updateWrapData(0,b-1)}this._emit("changeWrapMode")}},this.getUseWrapMode=function(){return this.$useWrapMode},this.setWrapLimitRange=function(a,b){if(this.$wrapLimitRange.min!==a||this.$wrapLimitRange.max!==b)this.$wrapLimitRange.min=a,this.$wrapLimitRange.max=b,this.$modified=!0,this._emit("changeWrapMode")},this.adjustWrapLimit=function(a){var b=this.$constrainWrapLimit(a);return b!=this.$wrapLimit&&b>0?(this.$wrapLimit=b,this.$modified=!0,this.$useWrapMode&&(this.$updateWrapData(0,this.getLength()-1),this.$resetRowCache(0),this._emit("changeWrapLimit")),!0):!1},this.$constrainWrapLimit=function(a){var b=this.$wrapLimitRange.min;b&&(a=Math.max(b,a));var c=this.$wrapLimitRange.max;return c&&(a=Math.min(c,a)),Math.max(1,a)},this.getWrapLimit=function(){return this.$wrapLimit},this.getWrapLimitRange=function(){return{min:this.$wrapLimitRange.min,max:this.$wrapLimitRange.max}},this.$updateInternalDataOnChange=function(a){var b=this.$useWrapMode,c,d=a.data.action,e=a.data.range.start.row,f=a.data.range.end.row,g=a.data.range.start,h=a.data.range.end,i=null;d.indexOf("Lines")!=-1?(d=="insertLines"?f=e+a.data.lines.length:f=e,c=a.data.lines?a.data.lines.length:f-e):c=f-e;if(c!=0)if(d.indexOf("remove")!=-1){b&&this.$wrapData.splice(e,c);var j=this.$foldData;i=this.getFoldsInRange(a.data.range),this.removeFolds(i);var k=this.getFoldLine(h.row),l=0;if(k){k.addRemoveChars(h.row,h.column,g.column-h.column),k.shiftRow(-c);var m=this.getFoldLine(e);m&&m!==k&&(m.merge(k),k=m),l=j.indexOf(k)+1}for(l;l<j.length;l++){var k=j[l];k.start.row>=h.row&&k.shiftRow(-c)}f=e}else{var n;if(b){n=[e,0];for(var o=0;o<c;o++)n.push([]);this.$wrapData.splice.apply(this.$wrapData,n)}var j=this.$foldData,k=this.getFoldLine(e),l=0;if(k){var p=k.range.compareInside(g.row,g.column);p==0?(k=k.split(g.row,g.column),k.shiftRow(c),k.addRemoveChars(f,0,h.column-g.column)):p==-1&&(k.addRemoveChars(e,0,h.column-g.column),k.shiftRow(c)),l=j.indexOf(k)+1}for(l;l<j.length;l++){var k=j[l];k.start.row>=e&&k.shiftRow(c)}}else{c=Math.abs(a.data.range.start.column-a.data.range.end.column),d.indexOf("remove")!=-1&&(i=this.getFoldsInRange(a.data.range),this.removeFolds(i),c=-c);var k=this.getFoldLine(e);k&&k.addRemoveChars(e,g.column,c)}return b&&this.$wrapData.length!=this.doc.getLength()&&console.error("doc.getLength() and $wrapData.length have to be the same!"),b&&this.$updateWrapData(e,f),i},this.$updateWrapData=function(a,b){var c=this.doc.getAllLines(),d=this.getTabSize(),e=this.$wrapData,g=this.$wrapLimit,h,j,k=a;b=Math.min(b,c.length-1);while(k<=b){j=this.getFoldLine(k,j);if(!j)h=this.$getDisplayTokens(f.stringTrimRight(c[k])),e[k]=this.$computeWrapSplits(h,g,d),k++;else{h=[],j.walk(function(a,b,d,e){var f;if(a){f=this.$getDisplayTokens(a,h.length),f[0]=i;for(var g=1;g<f.length;g++)f[g]=l}else f=this.$getDisplayTokens(c[b].substring(e,d),h.length);h=h.concat(f)}.bind(this),j.end.row,c[j.end.row].length+1);while(h.length!=0&&h[h.length-1]>=o)h.pop();e[j.start.row]=this.$computeWrapSplits(h,g,d),k=j.end.row+1}}};var b=1,c=2,i=3,l=4,n=9,o=10,p=11,q=12;this.$computeWrapSplits=function(a,b){function g(b){var d=a.slice(e,b),g=d.length;d.join("").replace(/12/g,function(){g-=1}).replace(/2/g,function(){g-=1}),f+=g,c.push(f),e=b}if(a.length==0)return[];var c=[],d=a.length,e=0,f=0;while(d-e>b){var h=e+b;if(a[h]>=o){while(a[h]>=o)h++;g(h);continue}if(a[h]==i||a[h]==l){for(h;h!=e-1;h--)if(a[h]==i)break;if(h>e){g(h);continue}h=e+b;for(h;h<a.length;h++)if(a[h]!=l)break;if(h==a.length)break;g(h);continue}var j=Math.max(h-10,e-1);while(h>j&&a[h]<i)h--;while(h>j&&a[h]==n)h--;if(h>j){g(++h);continue}h=e+b,g(h)}return c},this.$getDisplayTokens=function(a,d){var e=[],f;d=d||0;for(var g=0;g<a.length;g++){var h=a.charCodeAt(g);if(h==9){f=this.getScreenTabSize(e.length+d),e.push(p);for(var i=1;i<f;i++)e.push(q)}else h==32?e.push(o):h>39&&h<48||h>57&&h<64?e.push(n):h>=4352&&r(h)?e.push(b,c):e.push(b)}return e},this.$getStringScreenWidth=function(a,b,c){if(b==0)return[0,0];b==null&&(b=c+a.length*Math.max(this.getTabSize(),2)),c=c||0;var d,e;for(e=0;e<a.length;e++){d=a.charCodeAt(e),d==9?c+=this.getScreenTabSize(c):d>=4352&&r(d)?c+=2:c+=1;if(c>b)break}return[c,e]},this.getRowLength=function(a){return!this.$useWrapMode||!this.$wrapData[a]?1:this.$wrapData[a].length+1},this.getRowHeight=function(a,b){return this.getRowLength(b)*a.lineHeight},this.getScreenLastRowColumn=function(a){var b=this.screenToDocumentPosition(a,Number.MAX_VALUE);return this.documentToScreenColumn(b.row,b.column)},this.getDocumentLastRowColumn=function(a,b){var c=this.documentToScreenRow(a,b);return this.getScreenLastRowColumn(c)},this.getDocumentLastRowColumnPosition=function(a,b){var c=this.documentToScreenRow(a,b);return this.screenToDocumentPosition(c,Number.MAX_VALUE/10)},this.getRowSplitData=function(a){return this.$useWrapMode?this.$wrapData[a]:undefined},this.getScreenTabSize=function(a){return this.$tabSize-a%this.$tabSize},this.screenToDocumentRow=function(a,b){return this.screenToDocumentPosition(a,b).row},this.screenToDocumentColumn=function(a,b){return this.screenToDocumentPosition(a,b).column},this.screenToDocumentPosition=function(a,b){if(a<0)return{row:0,column:0};var c,d=0,e=0,f,g=0,h=0,i=this.$rowCache;for(var j=0;j<i.length;j++){if(!(i[j].screenRow<a))break;g=i[j].screenRow,d=i[j].docRow}var k=!i.length||j==i.length,l=this.getLength()-1,m=this.getNextFoldLine(d),n=m?m.start.row:Infinity;while(g<=a){h=this.getRowLength(d);if(g+h-1>=a||d>=l)break;g+=h,d++,d>n&&(d=m.end.row+1,m=this.getNextFoldLine(d,m),n=m?m.start.row:Infinity),k&&i.push({docRow:d,screenRow:g})}if(m&&m.start.row<=d)c=this.getFoldDisplayLine(m),d=m.start.row;else{if(g+h<=a||d>l)return{row:l,column:this.getLine(l).length};c=this.getLine(d),m=null}if(this.$useWrapMode){var o=this.$wrapData[d];o&&(f=o[a-g],a>g&&o.length&&(e=o[a-g-1]||o[o.length-1],c=c.substring(e)))}return e+=this.$getStringScreenWidth(c,b)[1],this.$useWrapMode&&e>=f&&(e=f-1),m?m.idxToPosition(e):{row:d,column:e}},this.documentToScreenPosition=function(a,b){if(typeof b=="undefined")var c=this.$clipPositionToDocument(a.row,a.column);else c=this.$clipPositionToDocument(a,b);a=c.row,b=c.column;var d;if(this.$useWrapMode){d=this.$wrapData;if(a>d.length-1)return{row:this.getScreenLength(),column:d.length==0?0:d[d.length-1].length-1}}var e=0,f=null,g=null;g=this.getFoldAt(a,b,1),g&&(a=g.start.row,b=g.start.column);var h,i=0,j=this.$rowCache;for(var k=0;k<j.length;k++){if(!(j[k].docRow<a))break;e=j[k].screenRow,i=j[k].docRow}var l=!j.length||k==j.length,m=this.getNextFoldLine(i),n=m?m.start.row:Infinity;while(i<a){if(i>=n){h=m.end.row+1;if(h>a)break;m=this.getNextFoldLine(h,m),n=m?m.start.row:Infinity}else h=i+1;e+=this.getRowLength(i),i=h,l&&j.push({docRow:i,screenRow:e})}var o="";m&&i>=n?(o=this.getFoldDisplayLine(m,a,b),f=m.start.row):(o=this.getLine(a).substring(0,b),f=a);if(this.$useWrapMode){var p=d[f],q=0;while(o.length>=p[q])e++,q++;o=o.substring(p[q-1]||0,o.length)}return{row:e,column:this.$getStringScreenWidth(o)[0]}},this.documentToScreenColumn=function(a,b){return this.documentToScreenPosition(a,b).column},this.documentToScreenRow=function(a,b){return this.documentToScreenPosition(a,b).row},this.getScreenLength=function(){var a=0,b=null;if(!this.$useWrapMode){a=this.getLength();var c=this.$foldData;for(var d=0;d<c.length;d++)b=c[d],a-=b.end.row-b.start.row}else{var e=this.$wrapData.length,f=0,d=0,b=this.$foldData[d++],g=b?b.start.row:Infinity;while(f<e)a+=this.$wrapData[f].length+1,f++,f>g&&(f=b.end.row+1,b=this.$foldData[d++],g=b?b.start.row:Infinity)}return a}}).call(n.prototype),a("./edit_session/folding").Folding.call(n.prototype),a("./edit_session/bracket_match").BracketMatch.call(n.prototype),b.EditSession=n}),define("ace/config",["require","exports","module","ace/lib/lang"],function(a,b,c){function g(a){return a.replace(/-(.)/g,function(a,b){return b.toUpperCase()})}"no use strict";var d=a("./lib/lang"),e=function(){return this}(),f={packaged:!1,workerPath:"",modePath:"",themePath:"",suffix:".js"};b.get=function(a){if(!f.hasOwnProperty(a))throw new Error("Unknown confik key: "+a);return f[a]},b.set=function(a,b){if(!f.hasOwnProperty(a))throw new Error("Unknown confik key: "+a);f[a]=b},b.all=function(){return d.copyObject(f)},b.init=function(){f.packaged=a.packaged||c.packaged||e.define&&define.packaged;if(!e.document)return"";var d={},h="",i,j=document.getElementsByTagName("script");for(var k=0;k<j.length;k++){var l=j[k],m=l.src||l.getAttribute("src");if(!m)continue;var n=l.attributes;for(var o=0,p=n.length;o<p;o++){var q=n[o];q.name.indexOf("data-ace-")===0&&(d[g(q.name.replace(/^data-ace-/,""))]=q.value)}var r=m.match(/^(?:(.*\/)ace\.js|(.*\/)ace((-uncompressed)?(-noconflict)?\.js))(?:\?|$)/);r&&(h=r[1]||r[2],i=r[3])}h&&(d.base=d.base||h,d.packaged=!0),d.suffix=d.suffix||i,d.workerPath=d.workerPath||d.base,d.modePath=d.modePath||d.base,d.themePath=d.themePath||d.base,delete d.base;for(var s in d)typeof d[s]!="undefined"&&b.set(s,d[s])}}),define("ace/lib/net",["require","exports","module"],function(a,b,c){"use strict",b.get=function(a,c){var d=b.createXhr();d.open("GET",a,!0),d.onreadystatechange=function(a){d.readyState===4&&c(d.responseText)},d.send(null)};var d=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"];b.createXhr=function(){var a,b,c;if(typeof XMLHttpRequest!="undefined")return new XMLHttpRequest;for(b=0;b<3;b++){c=d[b];try{a=new ActiveXObject(c)}catch(e){}if(a){d=[c];break}}if(!a)throw new Error("createXhr(): XMLHttpRequest not available");return a},b.loadScript=function(a,b){var c=document.getElementsByTagName("head")[0],d=document.createElement("script");d.src=a,c.appendChild(d),d.onload=b}}),define("ace/selection",["require","exports","module","ace/lib/oop","ace/lib/lang","ace/lib/event_emitter","ace/range"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/lang"),f=a("./lib/event_emitter").EventEmitter,g=a("./range").Range,h=function(a){this.session=a,this.doc=a.getDocument(),this.clearSelection(),this.lead=this.selectionLead=this.doc.createAnchor(0,0),this.anchor=this.selectionAnchor=this.doc.createAnchor(0,0);var b=this;this.lead.on("change",function(a){b._emit("changeCursor"),b.$isEmpty||b._emit("changeSelection"),!b.$keepDesiredColumnOnChange&&a.old.column!=a.value.column&&(b.$desiredColumn=null)}),this.selectionAnchor.on("change",function(){b.$isEmpty||b._emit("changeSelection")})};(function(){d.implement(this,f),this.isEmpty=function(){return this.$isEmpty||this.anchor.row==this.lead.row&&this.anchor.column==this.lead.column},this.isMultiLine=function(){return this.isEmpty()?!1:this.getRange().isMultiLine()},this.getCursor=function(){return this.lead.getPosition()},this.setSelectionAnchor=function(a,b){this.anchor.setPosition(a,b),this.$isEmpty&&(this.$isEmpty=!1,this._emit("changeSelection"))},this.getSelectionAnchor=function(){return this.$isEmpty?this.getSelectionLead():this.anchor.getPosition()},this.getSelectionLead=function(){return this.lead.getPosition()},this.shiftSelection=function(a){if(this.$isEmpty){this.moveCursorTo(this.lead.row,this.lead.column+a);return}var b=this.getSelectionAnchor(),c=this.getSelectionLead(),d=this.isBackwards();(!d||b.column!==0)&&this.setSelectionAnchor(b.row,b.column+a),(d||c.column!==0)&&this.$moveSelection(function(){this.moveCursorTo(c.row,c.column+a)})},this.isBackwards=function(){var a=this.anchor,b=this.lead;return a.row>b.row||a.row==b.row&&a.column>b.column},this.getRange=function(){var a=this.anchor,b=this.lead;return this.isEmpty()?g.fromPoints(b,b):this.isBackwards()?g.fromPoints(b,a):g.fromPoints(a,b)},this.clearSelection=function(){this.$isEmpty||(this.$isEmpty=!0,this._emit("changeSelection"))},this.selectAll=function(){var a=this.doc.getLength()-1;this.setSelectionAnchor(a,this.doc.getLine(a).length),this.moveCursorTo(0,0)},this.setSelectionRange=function(a,b){b?(this.setSelectionAnchor(a.end.row,a.end.column),this.selectTo(a.start.row,a.start.column)):(this.setSelectionAnchor(a.start.row,a.start.column),this.selectTo(a.end.row,a.end.column)),this.$desiredColumn=null},this.$moveSelection=function(a){var b=this.lead;this.$isEmpty&&this.setSelectionAnchor(b.row,b.column),a.call(this)},this.selectTo=function(a,b){this.$moveSelection(function(){this.moveCursorTo(a,b)})},this.selectToPosition=function(a){this.$moveSelection(function(){this.moveCursorToPosition(a)})},this.selectUp=function(){this.$moveSelection(this.moveCursorUp)},this.selectDown=function(){this.$moveSelection(this.moveCursorDown)},this.selectRight=function(){this.$moveSelection(this.moveCursorRight)},this.selectLeft=function(){this.$moveSelection(this.moveCursorLeft)},this.selectLineStart=function(){this.$moveSelection(this.moveCursorLineStart)},this.selectLineEnd=function(){this.$moveSelection(this.moveCursorLineEnd)},this.selectFileEnd=function(){this.$moveSelection(this.moveCursorFileEnd)},this.selectFileStart=function(){this.$moveSelection(this.moveCursorFileStart)},this.selectWordRight=function(){this.$moveSelection(this.moveCursorWordRight)},this.selectWordLeft=function(){this.$moveSelection(this.moveCursorWordLeft)},this.getWordRange=function(a,b){if(typeof b=="undefined"){var c=a||this.lead;a=c.row,b=c.column}return this.session.getWordRange(a,b)},this.selectWord=function(){this.setSelectionRange(this.getWordRange())},this.selectAWord=function(){var a=this.getCursor(),b=this.session.getAWordRange(a.row,a.column);this.setSelectionRange(b)},this.getLineRange=function(a,b){var c=typeof a=="number"?a:this.lead.row,d,e=this.session.getFoldLine(c);return e?(c=e.start.row,d=e.end.row):d=c,b?new g(c,0,d,this.session.getLine(d).length):new g(c,0,d+1,0)},this.selectLine=function(){this.setSelectionRange(this.getLineRange())},this.moveCursorUp=function(){this.moveCursorBy(-1,0)},this.moveCursorDown=function(){this.moveCursorBy(1,0)},this.moveCursorLeft=function(){var a=this.lead.getPosition(),b;if(b=this.session.getFoldAt(a.row,a.column,-1))this.moveCursorTo(b.start.row,b.start.column);else if(a.column==0)a.row>0&&this.moveCursorTo(a.row-1,this.doc.getLine(a.row-1).length);else{var c=this.session.getTabSize();this.session.isTabStop(a)&&this.doc.getLine(a.row).slice(a.column-c,a.column).split(" ").length-1==c?this.moveCursorBy(0,-c):this.moveCursorBy(0,-1)}},this.moveCursorRight=function(){var a=this.lead.getPosition(),b;if(b=this.session.getFoldAt(a.row,a.column,1))this.moveCursorTo(b.end.row,b.end.column);else if(this.lead.column==this.doc.getLine(this.lead.row).length)this.lead.row<this.doc.getLength()-1&&this.moveCursorTo(this.lead.row+1,0);else{var c=this.session.getTabSize(),a=this.lead;this.session.isTabStop(a)&&this.doc.getLine(a.row).slice(a.column,a.column+c).split(" ").length-1==c?this.moveCursorBy(0,c):this.moveCursorBy(0,1)}},this.moveCursorLineStart=function(){var a=this.lead.row,b=this.lead.column,c=this.session.documentToScreenRow(a,b),d=this.session.screenToDocumentPosition(c,0),e=this.session.getDisplayLine(a,null,d.row,d.column),f=e.match(/^\s*/);f[0].length==b?this.moveCursorTo(d.row,d.column):this.moveCursorTo(d.row,d.column+f[0].length)},this.moveCursorLineEnd=function(){var a=this.lead,b=this.session.getDocumentLastRowColumnPosition(a.row,a.column);this.moveCursorTo(b.row,b.column)},this.moveCursorFileEnd=function(){var a=this.doc.getLength()-1,b=this.doc.getLine(a).length;this.moveCursorTo(a,b)},this.moveCursorFileStart=function(){this.moveCursorTo(0,0)},this.moveCursorLongWordRight=function(){var a=this.lead.row,b=this.lead.column,c=this.doc.getLine(a),d=c.substring(b),e;this.session.nonTokenRe.lastIndex=0,this.session.tokenRe.lastIndex=0;var f=this.session.getFoldAt(a,b,1);if(f){this.moveCursorTo(f.end.row,f.end.column);return}if(e=this.session.nonTokenRe.exec(d))b+=this.session.nonTokenRe.lastIndex,this.session.nonTokenRe.lastIndex=0,d=c.substring(b);if(b>=c.length){this.moveCursorTo(a,c.length),this.moveCursorRight(),a<this.doc.getLength()-1&&this.moveCursorWordRight();return}if(e=this.session.tokenRe.exec(d))b+=this.session.tokenRe.lastIndex,this.session.tokenRe.lastIndex=0;this.moveCursorTo(a,b)},this.moveCursorLongWordLeft=function(){var a=this.lead.row,b=this.lead.column,c;if(c=this.session.getFoldAt(a,b,-1)){this.moveCursorTo(c.start.row,c.start.column);return}var d=this.session.getFoldStringAt(a,b,-1);d==null&&(d=this.doc.getLine(a).substring(0,b));var f=e.stringReverse(d),g;this.session.nonTokenRe.lastIndex=0,this.session.tokenRe.lastIndex=0;if(g=this.session.nonTokenRe.exec(f))b-=this.session.nonTokenRe.lastIndex,f=f.slice(this.session.nonTokenRe.lastIndex),this.session.nonTokenRe.lastIndex=0;if(b<=0){this.moveCursorTo(a,0),this.moveCursorLeft(),a>0&&this.moveCursorWordLeft();return}if(g=this.session.tokenRe.exec(f))b-=this.session.tokenRe.lastIndex,this.session.tokenRe.lastIndex=0;this.moveCursorTo(a,b)},this.$shortWordEndIndex=function(a){var b,c=0,d,e=/\s/,f=this.session.tokenRe;f.lastIndex=0;if(b=this.session.tokenRe.exec(a))c=this.session.tokenRe.lastIndex;else{while((d=a[c])&&e.test(d))c++;if(c<=1){f.lastIndex=0;while((d=a[c])&&!f.test(d)){f.lastIndex=0,c++;if(e.test(d)){if(c>2){c--;break}while((d=a[c])&&e.test(d))c++;if(c>2)break}}}}return f.lastIndex=0,c},this.moveCursorShortWordRight=function(){var a=this.lead.row,b=this.lead.column,c=this.doc.getLine(a),d=c.substring(b),e=this.session.getFoldAt(a,b,1);if(e)return this.moveCursorTo(e.end.row,e.end.column);if(b==c.length)return this.moveCursorRight();var f=this.$shortWordEndIndex(d);this.moveCursorTo(a,b+f)},this.moveCursorShortWordLeft=function(){var a=this.lead.row,b=this.lead.column,c;if(c=this.session.getFoldAt(a,b,-1))return this.moveCursorTo(c.start.row,c.start.column);if(b==0)return this.moveCursorLeft();var d=this.session.getLine(a).substring(0,b),f=e.stringReverse(d),g=this.$shortWordEndIndex(f);return this.moveCursorTo(a,b-g)},this.moveCursorWordRight=function(){this.session.$selectLongWords?this.moveCursorLongWordRight():this.moveCursorShortWordRight()},this.moveCursorWordLeft=function(){this.session.$selectLongWords?this.moveCursorLongWordLeft():this.moveCursorShortWordLeft()},this.moveCursorBy=function(a,b){var c=this.session.documentToScreenPosition(this.lead.row,this.lead.column);b===0&&(this.$desiredColumn?c.column=this.$desiredColumn:this.$desiredColumn=c.column);var d=this.session.screenToDocumentPosition(c.row+a,c.column);this.moveCursorTo(d.row,d.column+b,b===0)},this.moveCursorToPosition=function(a){this.moveCursorTo(a.row,a.column)},this.moveCursorTo=function(a,b,c){var d=this.session.getFoldAt(a,b,1);d&&(a=d.start.row,b=d.start.column),this.$keepDesiredColumnOnChange=!0,this.lead.setPosition(a,b),this.$keepDesiredColumnOnChange=!1,c||(this.$desiredColumn=null)},this.moveCursorToScreen=function(a,b,c){var d=this.session.screenToDocumentPosition(a,b);this.moveCursorTo(d.row,d.column,c)},this.detach=function(){this.lead.detach(),this.anchor.detach(),this.session=this.doc=null},this.fromOrientedRange=function(a){this.setSelectionRange(a,a.cursor==a.start),this.$desiredColumn=a.desiredColumn||this.$desiredColumn},this.toOrientedRange=function(a){var b=this.getRange();return a?(a.start.column=b.start.column,a.start.row=b.start.row,a.end.column=b.end.column,a.end.row=b.end.row):a=b,a.cursor=this.isBackwards()?a.start:a.end,a.desiredColumn=this.$desiredColumn,a}}).call(h.prototype),b.Selection=h}),define("ace/range",["require","exports","module"],function(a,b,c){"use strict";var d=function(a,b,c,d){this.start={row:a,column:b},this.end={row:c,column:d}};(function(){this.isEqual=function(a){return this.start.row==a.start.row&&this.end.row==a.end.row&&this.start.column==a.start.column&&this.end.column==a.end.column},this.toString=function(){return"Range: ["+this.start.row+"/"+this.start.column+"] -> ["+this.end.row+"/"+this.end.column+"]"},this.contains=function(a,b){return this.compare(a,b)==0},this.compareRange=function(a){var b,c=a.end,d=a.start;return b=this.compare(c.row,c.column),b==1?(b=this.compare(d.row,d.column),b==1?2:b==0?1:0):b==-1?-2:(b=this.compare(d.row,d.column),b==-1?-1:b==1?42:0)},this.comparePoint=function(a){return this.compare(a.row,a.column)},this.containsRange=function(a){return this.comparePoint(a.start)==0&&this.comparePoint(a.end)==0},this.intersects=function(a){var b=this.compareRange(a);return b==-1||b==0||b==1},this.isEnd=function(a,b){return this.end.row==a&&this.end.column==b},this.isStart=function(a,b){return this.start.row==a&&this.start.column==b},this.setStart=function(a,b){typeof a=="object"?(this.start.column=a.column,this.start.row=a.row):(this.start.row=a,this.start.column=b)},this.setEnd=function(a,b){typeof a=="object"?(this.end.column=a.column,this.end.row=a.row):(this.end.row=a,this.end.column=b)},this.inside=function(a,b){return this.compare(a,b)==0?this.isEnd(a,b)||this.isStart(a,b)?!1:!0:!1},this.insideStart=function(a,b){return this.compare(a,b)==0?this.isEnd(a,b)?!1:!0:!1},this.insideEnd=function(a,b){return this.compare(a,b)==0?this.isStart(a,b)?!1:!0:!1},this.compare=function(a,b){return!this.isMultiLine()&&a===this.start.row?b<this.start.column?-1:b>this.end.column?1:0:a<this.start.row?-1:a>this.end.row?1:this.start.row===a?b>=this.start.column?0:-1:this.end.row===a?b<=this.end.column?0:1:0},this.compareStart=function(a,b){return this.start.row==a&&this.start.column==b?-1:this.compare(a,b)},this.compareEnd=function(a,b){return this.end.row==a&&this.end.column==b?1:this.compare(a,b)},this.compareInside=function(a,b){return this.end.row==a&&this.end.column==b?1:this.start.row==a&&this.start.column==b?-1:this.compare(a,b)},this.clipRows=function(a,b){if(this.end.row>b)var c={row:b+1,column:0};if(this.start.row>b)var e={row:b+1,column:0};if(this.start.row<a)var e={row:a,column:0};if(this.end.row<a)var c={row:a,column:0};return d.fromPoints(e||this.start,c||this.end)},this.extend=function(a,b){var c=this.compare(a,b);if(c==0)return this;if(c==-1)var e={row:a,column:b};else var f={row:a,column:b};return d.fromPoints(e||this.start,f||this.end)},this.isEmpty=function(){return this.start.row==this.end.row&&this.start.column==this.end.column},this.isMultiLine=function(){return this.start.row!==this.end.row},this.clone=function(){return d.fromPoints(this.start,this.end)},this.collapseRows=function(){return this.end.column==0?new d(this.start.row,0,Math.max(this.start.row,this.end.row-1),0):new d(this.start.row,0,this.end.row,0)},this.toScreenRange=function(a){var b=a.documentToScreenPosition(this.start),c=a.documentToScreenPosition(this.end);return new d(b.row,b.column,c.row,c.column)}}).call(d.prototype),d.fromPoints=function(a,b){return new d(a.row,a.column,b.row,b.column)},b.Range=d}),define("ace/mode/text",["require","exports","module","ace/tokenizer","ace/mode/text_highlight_rules","ace/mode/behaviour","ace/unicode"],function(a,b,c){"use strict";var d=a("../tokenizer").Tokenizer,e=a("./text_highlight_rules").TextHighlightRules,f=a("./behaviour").Behaviour,g=a("../unicode"),h=function(){this.$tokenizer=new d((new e).getRules()),this.$behaviour=new f};(function(){this.tokenRe=new RegExp("^["+g.packages.L+g.packages.Mn+g.packages.Mc+g.packages.Nd+g.packages.Pc+"\\$_]+","g"),this.nonTokenRe=new RegExp("^(?:[^"+g.packages.L+g.packages.Mn+g.packages.Mc+g.packages.Nd+g.packages.Pc+"\\$_]|s])+","g"),this.getTokenizer=function(){return this.$tokenizer},this.toggleCommentLines=function(a,b,c,d){},this.getNextLineIndent=function(a,b,c){return""},this.checkOutdent=function(a,b,c){return!1},this.autoOutdent=function(a,b,c){},this.$getIndent=function(a){var b=a.match(/^(\s+)/);return b?b[1]:""},this.createWorker=function(a){return null},this.highlightSelection=function(a){var b=a.session;b.$selectionOccurrences||(b.$selectionOccurrences=[]),b.$selectionOccurrences.length&&this.clearSelectionHighlight(a);var c=a.getSelectionRange();if(c.isEmpty()||c.isMultiLine())return;var d=c.start.column-1,e=c.end.column+1,f=b.getLine(c.start.row),g=f.length,h=f.substring(Math.max(d,0),Math.min(e,g));if(d>=0&&/^[\w\d]/.test(h)||e<=g&&/[\w\d]$/.test(h))return;h=f.substring(c.start.column,c.end.column);if(!/^[\w\d]+$/.test(h))return;var i=a.getCursorPosition(),j={wrap:!0,wholeWord:!0,caseSensitive:!0,needle:h},k=a.$search.getOptions();a.$search.set(j);var l=a.$search.findAll(b);l.forEach(function(a){if(!a.contains(i.row,i.column)){var c=b.addMarker(a,"ace_selected_word","text");b.$selectionOccurrences.push(c)}}),a.$search.set(k)},this.clearSelectionHighlight=function(a){if(!a.session.$selectionOccurrences)return;a.session.$selectionOccurrences.forEach(function(b){a.session.removeMarker(b)}),a.session.$selectionOccurrences=[]},this.createModeDelegates=function(a){if(!this.$embeds)return;this.$modes={};for(var b=0;b<this.$embeds.length;b++)a[this.$embeds[b]]&&(this.$modes[this.$embeds[b]]=new a[this.$embeds[b]]);var c=["toggleCommentLines","getNextLineIndent","checkOutdent","autoOutdent","transformAction"];for(var b=0;b<c.length;b++)(function(a){var d=c[b],e=a[d];a[c[b]]=function(){return this.$delegator(d,arguments,e)}})(this)},this.$delegator=function(a,b,c){var d=b[0];for(var e=0;e<this.$embeds.length;e++){if(!this.$modes[this.$embeds[e]])continue;var f=d.split(this.$embeds[e]);if(!f[0]&&f[1]){b[0]=f[1];var g=this.$modes[this.$embeds[e]];return g[a].apply(g,b)}}var h=c.apply(this,b);return c?h:undefined},this.transformAction=function(a,b,c,d,e){if(this.$behaviour){var f=this.$behaviour.getBehaviours();for(var g in f)if(f[g][b]){var h=f[g][b].apply(this,arguments);if(h)return h}}}}).call(h.prototype),b.Mode=h}),define("ace/tokenizer",["require","exports","module"],function(a,b,c){"use strict";var d=function(a,b){b=b?"g"+b:"g",this.rules=a,this.regExps={},this.matchMappings={};for(var c in this.rules){var d=this.rules[c],e=d,f=[],g=0,h=this.matchMappings[c]={};for(var i=0;i<e.length;i++){e[i].regex instanceof RegExp&&(e[i].regex=e[i].regex.toString().slice(1,-1));var j=(new RegExp("(?:("+e[i].regex+")|(.))")).exec("a").length-2,k=e[i].regex.replace(/\\([0-9]+)/g,function(a,b){return"\\"+(parseInt(b,10)+g+1)});if(j>1&&e[i].token.length!==j-1)throw new Error("Matching groups and length of the token array don't match in rule #"+i+" of state "+c);h[g]={rule:i,len:j},g+=j,f.push(k)}this.regExps[c]=new RegExp("(?:("+f.join(")|(")+")|(.))",b)}};(function(){this.getLineTokens=function(a,b){var c=b,d=this.rules[c],e=this.matchMappings[c],f=this.regExps[c];f.lastIndex=0;var g,h=[],i=0,j={type:null,value:""};while(g=f.exec(a)){var k="text",l=null,m=[g[0]];for(var n=0;n<g.length-2;n++){if(g[n+1]===undefined)continue;l=d[e[n].rule],e[n].len>1&&(m=g.slice(n+2,n+1+e[n].len)),typeof l.token=="function"?k=l.token.apply(this,m):k=l.token,l.next&&(c=l.next,d=this.rules[c],e=this.matchMappings[c],i=f.lastIndex,f=this.regExps[c],f.lastIndex=i);break}if(m[0]){typeof k=="string"&&(m=[m.join("")],k=[k]);for(var n=0;n<m.length;n++){if(!m[n])continue;(!l||l.merge||k[n]==="text")&&j.type===k[n]?j.value+=m[n]:(j.type&&h.push(j),j={type:k[n],value:m[n]})}}if(i==a.length)break;i=f.lastIndex}return j.type&&h.push(j),{tokens:h,state:c}}}).call(d.prototype),b.Tokenizer=d}),define("ace/mode/text_highlight_rules",["require","exports","module","ace/lib/lang"],function(a,b,c){"use strict";var d=a("../lib/lang"),e=function(){this.$rules={start:[{token:"empty_line",regex:"^$"},{token:"text",regex:".+"}]}};(function(){this.addRules=function(a,b){for(var c in a){var d=a[c];for(var e=0;e<d.length;e++){var f=d[e];f.next&&(f.next=b+f.next)}this.$rules[b+c]=d}},this.getRules=function(){return this.$rules},this.embedRules=function(a,b,c,e){var f=(new a).getRules();if(e)for(var g=0;g<e.length;g++)e[g]=b+e[g];else{e=[];for(var h in f)e.push(b+h)}this.addRules(f,b);for(var g=0;g<e.length;g++)Array.prototype.unshift.apply(this.$rules[e[g]],d.deepCopy(c));this.$embeds||(this.$embeds=[]),this.$embeds.push(b)},this.getEmbeds=function(){return this.$embeds}}).call(e.prototype),b.TextHighlightRules=e}),define("ace/mode/behaviour",["require","exports","module"],function(a,b,c){"use strict";var d=function(){this.$behaviours={}};(function(){this.add=function(a,b,c){switch(undefined){case this.$behaviours:this.$behaviours={};case this.$behaviours[a]:this.$behaviours[a]={}}this.$behaviours[a][b]=c},this.addBehaviours=function(a){for(var b in a)for(var c in a[b])this.add(b,c,a[b][c])},this.remove=function(a){this.$behaviours&&this.$behaviours[a]&&delete this.$behaviours[a]},this.inherit=function(a,b){if(typeof a=="function")var c=(new a).getBehaviours(b);else var c=a.getBehaviours(b);this.addBehaviours(c)},this.getBehaviours=function(a){if(!a)return this.$behaviours;var b={};for(var c=0;c<a.length;c++)this.$behaviours[a[c]]&&(b[a[c]]=this.$behaviours[a[c]]);return b}}).call(d.prototype),b.Behaviour=d}),define("ace/unicode",["require","exports","module"],function(a,b,c){function d(a){var c=/\w{4}/g;for(var d in a)b.packages[d]=a[d].replace(c,"\\u$&")}"use strict",b.packages={},d({L:"0041-005A0061-007A00AA00B500BA00C0-00D600D8-00F600F8-02C102C6-02D102E0-02E402EC02EE0370-037403760377037A-037D03860388-038A038C038E-03A103A3-03F503F7-0481048A-05250531-055605590561-058705D0-05EA05F0-05F20621-064A066E066F0671-06D306D506E506E606EE06EF06FA-06FC06FF07100712-072F074D-07A507B107CA-07EA07F407F507FA0800-0815081A082408280904-0939093D09500958-0961097109720979-097F0985-098C098F09900993-09A809AA-09B009B209B6-09B909BD09CE09DC09DD09DF-09E109F009F10A05-0A0A0A0F0A100A13-0A280A2A-0A300A320A330A350A360A380A390A59-0A5C0A5E0A72-0A740A85-0A8D0A8F-0A910A93-0AA80AAA-0AB00AB20AB30AB5-0AB90ABD0AD00AE00AE10B05-0B0C0B0F0B100B13-0B280B2A-0B300B320B330B35-0B390B3D0B5C0B5D0B5F-0B610B710B830B85-0B8A0B8E-0B900B92-0B950B990B9A0B9C0B9E0B9F0BA30BA40BA8-0BAA0BAE-0BB90BD00C05-0C0C0C0E-0C100C12-0C280C2A-0C330C35-0C390C3D0C580C590C600C610C85-0C8C0C8E-0C900C92-0CA80CAA-0CB30CB5-0CB90CBD0CDE0CE00CE10D05-0D0C0D0E-0D100D12-0D280D2A-0D390D3D0D600D610D7A-0D7F0D85-0D960D9A-0DB10DB3-0DBB0DBD0DC0-0DC60E01-0E300E320E330E40-0E460E810E820E840E870E880E8A0E8D0E94-0E970E99-0E9F0EA1-0EA30EA50EA70EAA0EAB0EAD-0EB00EB20EB30EBD0EC0-0EC40EC60EDC0EDD0F000F40-0F470F49-0F6C0F88-0F8B1000-102A103F1050-1055105A-105D106110651066106E-10701075-1081108E10A0-10C510D0-10FA10FC1100-1248124A-124D1250-12561258125A-125D1260-1288128A-128D1290-12B012B2-12B512B8-12BE12C012C2-12C512C8-12D612D8-13101312-13151318-135A1380-138F13A0-13F41401-166C166F-167F1681-169A16A0-16EA1700-170C170E-17111720-17311740-17511760-176C176E-17701780-17B317D717DC1820-18771880-18A818AA18B0-18F51900-191C1950-196D1970-19741980-19AB19C1-19C71A00-1A161A20-1A541AA71B05-1B331B45-1B4B1B83-1BA01BAE1BAF1C00-1C231C4D-1C4F1C5A-1C7D1CE9-1CEC1CEE-1CF11D00-1DBF1E00-1F151F18-1F1D1F20-1F451F48-1F4D1F50-1F571F591F5B1F5D1F5F-1F7D1F80-1FB41FB6-1FBC1FBE1FC2-1FC41FC6-1FCC1FD0-1FD31FD6-1FDB1FE0-1FEC1FF2-1FF41FF6-1FFC2071207F2090-209421022107210A-211321152119-211D212421262128212A-212D212F-2139213C-213F2145-2149214E218321842C00-2C2E2C30-2C5E2C60-2CE42CEB-2CEE2D00-2D252D30-2D652D6F2D80-2D962DA0-2DA62DA8-2DAE2DB0-2DB62DB8-2DBE2DC0-2DC62DC8-2DCE2DD0-2DD62DD8-2DDE2E2F300530063031-3035303B303C3041-3096309D-309F30A1-30FA30FC-30FF3105-312D3131-318E31A0-31B731F0-31FF3400-4DB54E00-9FCBA000-A48CA4D0-A4FDA500-A60CA610-A61FA62AA62BA640-A65FA662-A66EA67F-A697A6A0-A6E5A717-A71FA722-A788A78BA78CA7FB-A801A803-A805A807-A80AA80C-A822A840-A873A882-A8B3A8F2-A8F7A8FBA90A-A925A930-A946A960-A97CA984-A9B2A9CFAA00-AA28AA40-AA42AA44-AA4BAA60-AA76AA7AAA80-AAAFAAB1AAB5AAB6AAB9-AABDAAC0AAC2AADB-AADDABC0-ABE2AC00-D7A3D7B0-D7C6D7CB-D7FBF900-FA2DFA30-FA6DFA70-FAD9FB00-FB06FB13-FB17FB1DFB1F-FB28FB2A-FB36FB38-FB3CFB3EFB40FB41FB43FB44FB46-FBB1FBD3-FD3DFD50-FD8FFD92-FDC7FDF0-FDFBFE70-FE74FE76-FEFCFF21-FF3AFF41-FF5AFF66-FFBEFFC2-FFC7FFCA-FFCFFFD2-FFD7FFDA-FFDC",Ll:"0061-007A00AA00B500BA00DF-00F600F8-00FF01010103010501070109010B010D010F01110113011501170119011B011D011F01210123012501270129012B012D012F01310133013501370138013A013C013E014001420144014601480149014B014D014F01510153015501570159015B015D015F01610163016501670169016B016D016F0171017301750177017A017C017E-0180018301850188018C018D019201950199-019B019E01A101A301A501A801AA01AB01AD01B001B401B601B901BA01BD-01BF01C601C901CC01CE01D001D201D401D601D801DA01DC01DD01DF01E101E301E501E701E901EB01ED01EF01F001F301F501F901FB01FD01FF02010203020502070209020B020D020F02110213021502170219021B021D021F02210223022502270229022B022D022F02310233-0239023C023F0240024202470249024B024D024F-02930295-02AF037103730377037B-037D039003AC-03CE03D003D103D5-03D703D903DB03DD03DF03E103E303E503E703E903EB03ED03EF-03F303F503F803FB03FC0430-045F04610463046504670469046B046D046F04710473047504770479047B047D047F0481048B048D048F04910493049504970499049B049D049F04A104A304A504A704A904AB04AD04AF04B104B304B504B704B904BB04BD04BF04C204C404C604C804CA04CC04CE04CF04D104D304D504D704D904DB04DD04DF04E104E304E504E704E904EB04ED04EF04F104F304F504F704F904FB04FD04FF05010503050505070509050B050D050F05110513051505170519051B051D051F0521052305250561-05871D00-1D2B1D62-1D771D79-1D9A1E011E031E051E071E091E0B1E0D1E0F1E111E131E151E171E191E1B1E1D1E1F1E211E231E251E271E291E2B1E2D1E2F1E311E331E351E371E391E3B1E3D1E3F1E411E431E451E471E491E4B1E4D1E4F1E511E531E551E571E591E5B1E5D1E5F1E611E631E651E671E691E6B1E6D1E6F1E711E731E751E771E791E7B1E7D1E7F1E811E831E851E871E891E8B1E8D1E8F1E911E931E95-1E9D1E9F1EA11EA31EA51EA71EA91EAB1EAD1EAF1EB11EB31EB51EB71EB91EBB1EBD1EBF1EC11EC31EC51EC71EC91ECB1ECD1ECF1ED11ED31ED51ED71ED91EDB1EDD1EDF1EE11EE31EE51EE71EE91EEB1EED1EEF1EF11EF31EF51EF71EF91EFB1EFD1EFF-1F071F10-1F151F20-1F271F30-1F371F40-1F451F50-1F571F60-1F671F70-1F7D1F80-1F871F90-1F971FA0-1FA71FB0-1FB41FB61FB71FBE1FC2-1FC41FC61FC71FD0-1FD31FD61FD71FE0-1FE71FF2-1FF41FF61FF7210A210E210F2113212F21342139213C213D2146-2149214E21842C30-2C5E2C612C652C662C682C6A2C6C2C712C732C742C76-2C7C2C812C832C852C872C892C8B2C8D2C8F2C912C932C952C972C992C9B2C9D2C9F2CA12CA32CA52CA72CA92CAB2CAD2CAF2CB12CB32CB52CB72CB92CBB2CBD2CBF2CC12CC32CC52CC72CC92CCB2CCD2CCF2CD12CD32CD52CD72CD92CDB2CDD2CDF2CE12CE32CE42CEC2CEE2D00-2D25A641A643A645A647A649A64BA64DA64FA651A653A655A657A659A65BA65DA65FA663A665A667A669A66BA66DA681A683A685A687A689A68BA68DA68FA691A693A695A697A723A725A727A729A72BA72DA72F-A731A733A735A737A739A73BA73DA73FA741A743A745A747A749A74BA74DA74FA751A753A755A757A759A75BA75DA75FA761A763A765A767A769A76BA76DA76FA771-A778A77AA77CA77FA781A783A785A787A78CFB00-FB06FB13-FB17FF41-FF5A",Lu:"0041-005A00C0-00D600D8-00DE01000102010401060108010A010C010E01100112011401160118011A011C011E01200122012401260128012A012C012E01300132013401360139013B013D013F0141014301450147014A014C014E01500152015401560158015A015C015E01600162016401660168016A016C016E017001720174017601780179017B017D018101820184018601870189-018B018E-0191019301940196-0198019C019D019F01A001A201A401A601A701A901AC01AE01AF01B1-01B301B501B701B801BC01C401C701CA01CD01CF01D101D301D501D701D901DB01DE01E001E201E401E601E801EA01EC01EE01F101F401F6-01F801FA01FC01FE02000202020402060208020A020C020E02100212021402160218021A021C021E02200222022402260228022A022C022E02300232023A023B023D023E02410243-02460248024A024C024E03700372037603860388-038A038C038E038F0391-03A103A3-03AB03CF03D2-03D403D803DA03DC03DE03E003E203E403E603E803EA03EC03EE03F403F703F903FA03FD-042F04600462046404660468046A046C046E04700472047404760478047A047C047E0480048A048C048E04900492049404960498049A049C049E04A004A204A404A604A804AA04AC04AE04B004B204B404B604B804BA04BC04BE04C004C104C304C504C704C904CB04CD04D004D204D404D604D804DA04DC04DE04E004E204E404E604E804EA04EC04EE04F004F204F404F604F804FA04FC04FE05000502050405060508050A050C050E05100512051405160518051A051C051E0520052205240531-055610A0-10C51E001E021E041E061E081E0A1E0C1E0E1E101E121E141E161E181E1A1E1C1E1E1E201E221E241E261E281E2A1E2C1E2E1E301E321E341E361E381E3A1E3C1E3E1E401E421E441E461E481E4A1E4C1E4E1E501E521E541E561E581E5A1E5C1E5E1E601E621E641E661E681E6A1E6C1E6E1E701E721E741E761E781E7A1E7C1E7E1E801E821E841E861E881E8A1E8C1E8E1E901E921E941E9E1EA01EA21EA41EA61EA81EAA1EAC1EAE1EB01EB21EB41EB61EB81EBA1EBC1EBE1EC01EC21EC41EC61EC81ECA1ECC1ECE1ED01ED21ED41ED61ED81EDA1EDC1EDE1EE01EE21EE41EE61EE81EEA1EEC1EEE1EF01EF21EF41EF61EF81EFA1EFC1EFE1F08-1F0F1F18-1F1D1F28-1F2F1F38-1F3F1F48-1F4D1F591F5B1F5D1F5F1F68-1F6F1FB8-1FBB1FC8-1FCB1FD8-1FDB1FE8-1FEC1FF8-1FFB21022107210B-210D2110-211221152119-211D212421262128212A-212D2130-2133213E213F214521832C00-2C2E2C602C62-2C642C672C692C6B2C6D-2C702C722C752C7E-2C802C822C842C862C882C8A2C8C2C8E2C902C922C942C962C982C9A2C9C2C9E2CA02CA22CA42CA62CA82CAA2CAC2CAE2CB02CB22CB42CB62CB82CBA2CBC2CBE2CC02CC22CC42CC62CC82CCA2CCC2CCE2CD02CD22CD42CD62CD82CDA2CDC2CDE2CE02CE22CEB2CEDA640A642A644A646A648A64AA64CA64EA650A652A654A656A658A65AA65CA65EA662A664A666A668A66AA66CA680A682A684A686A688A68AA68CA68EA690A692A694A696A722A724A726A728A72AA72CA72EA732A734A736A738A73AA73CA73EA740A742A744A746A748A74AA74CA74EA750A752A754A756A758A75AA75CA75EA760A762A764A766A768A76AA76CA76EA779A77BA77DA77EA780A782A784A786A78BFF21-FF3A",Lt:"01C501C801CB01F21F88-1F8F1F98-1F9F1FA8-1FAF1FBC1FCC1FFC",Lm:"02B0-02C102C6-02D102E0-02E402EC02EE0374037A0559064006E506E607F407F507FA081A0824082809710E460EC610FC17D718431AA71C78-1C7D1D2C-1D611D781D9B-1DBF2071207F2090-20942C7D2D6F2E2F30053031-3035303B309D309E30FC-30FEA015A4F8-A4FDA60CA67FA717-A71FA770A788A9CFAA70AADDFF70FF9EFF9F",Lo:"01BB01C0-01C3029405D0-05EA05F0-05F20621-063F0641-064A066E066F0671-06D306D506EE06EF06FA-06FC06FF07100712-072F074D-07A507B107CA-07EA0800-08150904-0939093D09500958-096109720979-097F0985-098C098F09900993-09A809AA-09B009B209B6-09B909BD09CE09DC09DD09DF-09E109F009F10A05-0A0A0A0F0A100A13-0A280A2A-0A300A320A330A350A360A380A390A59-0A5C0A5E0A72-0A740A85-0A8D0A8F-0A910A93-0AA80AAA-0AB00AB20AB30AB5-0AB90ABD0AD00AE00AE10B05-0B0C0B0F0B100B13-0B280B2A-0B300B320B330B35-0B390B3D0B5C0B5D0B5F-0B610B710B830B85-0B8A0B8E-0B900B92-0B950B990B9A0B9C0B9E0B9F0BA30BA40BA8-0BAA0BAE-0BB90BD00C05-0C0C0C0E-0C100C12-0C280C2A-0C330C35-0C390C3D0C580C590C600C610C85-0C8C0C8E-0C900C92-0CA80CAA-0CB30CB5-0CB90CBD0CDE0CE00CE10D05-0D0C0D0E-0D100D12-0D280D2A-0D390D3D0D600D610D7A-0D7F0D85-0D960D9A-0DB10DB3-0DBB0DBD0DC0-0DC60E01-0E300E320E330E40-0E450E810E820E840E870E880E8A0E8D0E94-0E970E99-0E9F0EA1-0EA30EA50EA70EAA0EAB0EAD-0EB00EB20EB30EBD0EC0-0EC40EDC0EDD0F000F40-0F470F49-0F6C0F88-0F8B1000-102A103F1050-1055105A-105D106110651066106E-10701075-1081108E10D0-10FA1100-1248124A-124D1250-12561258125A-125D1260-1288128A-128D1290-12B012B2-12B512B8-12BE12C012C2-12C512C8-12D612D8-13101312-13151318-135A1380-138F13A0-13F41401-166C166F-167F1681-169A16A0-16EA1700-170C170E-17111720-17311740-17511760-176C176E-17701780-17B317DC1820-18421844-18771880-18A818AA18B0-18F51900-191C1950-196D1970-19741980-19AB19C1-19C71A00-1A161A20-1A541B05-1B331B45-1B4B1B83-1BA01BAE1BAF1C00-1C231C4D-1C4F1C5A-1C771CE9-1CEC1CEE-1CF12135-21382D30-2D652D80-2D962DA0-2DA62DA8-2DAE2DB0-2DB62DB8-2DBE2DC0-2DC62DC8-2DCE2DD0-2DD62DD8-2DDE3006303C3041-3096309F30A1-30FA30FF3105-312D3131-318E31A0-31B731F0-31FF3400-4DB54E00-9FCBA000-A014A016-A48CA4D0-A4F7A500-A60BA610-A61FA62AA62BA66EA6A0-A6E5A7FB-A801A803-A805A807-A80AA80C-A822A840-A873A882-A8B3A8F2-A8F7A8FBA90A-A925A930-A946A960-A97CA984-A9B2AA00-AA28AA40-AA42AA44-AA4BAA60-AA6FAA71-AA76AA7AAA80-AAAFAAB1AAB5AAB6AAB9-AABDAAC0AAC2AADBAADCABC0-ABE2AC00-D7A3D7B0-D7C6D7CB-D7FBF900-FA2DFA30-FA6DFA70-FAD9FB1DFB1F-FB28FB2A-FB36FB38-FB3CFB3EFB40FB41FB43FB44FB46-FBB1FBD3-FD3DFD50-FD8FFD92-FDC7FDF0-FDFBFE70-FE74FE76-FEFCFF66-FF6FFF71-FF9DFFA0-FFBEFFC2-FFC7FFCA-FFCFFFD2-FFD7FFDA-FFDC",M:"0300-036F0483-04890591-05BD05BF05C105C205C405C505C70610-061A064B-065E067006D6-06DC06DE-06E406E706E806EA-06ED07110730-074A07A6-07B007EB-07F30816-0819081B-08230825-08270829-082D0900-0903093C093E-094E0951-0955096209630981-098309BC09BE-09C409C709C809CB-09CD09D709E209E30A01-0A030A3C0A3E-0A420A470A480A4B-0A4D0A510A700A710A750A81-0A830ABC0ABE-0AC50AC7-0AC90ACB-0ACD0AE20AE30B01-0B030B3C0B3E-0B440B470B480B4B-0B4D0B560B570B620B630B820BBE-0BC20BC6-0BC80BCA-0BCD0BD70C01-0C030C3E-0C440C46-0C480C4A-0C4D0C550C560C620C630C820C830CBC0CBE-0CC40CC6-0CC80CCA-0CCD0CD50CD60CE20CE30D020D030D3E-0D440D46-0D480D4A-0D4D0D570D620D630D820D830DCA0DCF-0DD40DD60DD8-0DDF0DF20DF30E310E34-0E3A0E47-0E4E0EB10EB4-0EB90EBB0EBC0EC8-0ECD0F180F190F350F370F390F3E0F3F0F71-0F840F860F870F90-0F970F99-0FBC0FC6102B-103E1056-1059105E-10601062-10641067-106D1071-10741082-108D108F109A-109D135F1712-17141732-1734175217531772177317B6-17D317DD180B-180D18A91920-192B1930-193B19B0-19C019C819C91A17-1A1B1A55-1A5E1A60-1A7C1A7F1B00-1B041B34-1B441B6B-1B731B80-1B821BA1-1BAA1C24-1C371CD0-1CD21CD4-1CE81CED1CF21DC0-1DE61DFD-1DFF20D0-20F02CEF-2CF12DE0-2DFF302A-302F3099309AA66F-A672A67CA67DA6F0A6F1A802A806A80BA823-A827A880A881A8B4-A8C4A8E0-A8F1A926-A92DA947-A953A980-A983A9B3-A9C0AA29-AA36AA43AA4CAA4DAA7BAAB0AAB2-AAB4AAB7AAB8AABEAABFAAC1ABE3-ABEAABECABEDFB1EFE00-FE0FFE20-FE26",Mn:"0300-036F0483-04870591-05BD05BF05C105C205C405C505C70610-061A064B-065E067006D6-06DC06DF-06E406E706E806EA-06ED07110730-074A07A6-07B007EB-07F30816-0819081B-08230825-08270829-082D0900-0902093C0941-0948094D0951-095509620963098109BC09C1-09C409CD09E209E30A010A020A3C0A410A420A470A480A4B-0A4D0A510A700A710A750A810A820ABC0AC1-0AC50AC70AC80ACD0AE20AE30B010B3C0B3F0B41-0B440B4D0B560B620B630B820BC00BCD0C3E-0C400C46-0C480C4A-0C4D0C550C560C620C630CBC0CBF0CC60CCC0CCD0CE20CE30D41-0D440D4D0D620D630DCA0DD2-0DD40DD60E310E34-0E3A0E47-0E4E0EB10EB4-0EB90EBB0EBC0EC8-0ECD0F180F190F350F370F390F71-0F7E0F80-0F840F860F870F90-0F970F99-0FBC0FC6102D-10301032-10371039103A103D103E10581059105E-10601071-1074108210851086108D109D135F1712-17141732-1734175217531772177317B7-17BD17C617C9-17D317DD180B-180D18A91920-19221927192819321939-193B1A171A181A561A58-1A5E1A601A621A65-1A6C1A73-1A7C1A7F1B00-1B031B341B36-1B3A1B3C1B421B6B-1B731B801B811BA2-1BA51BA81BA91C2C-1C331C361C371CD0-1CD21CD4-1CE01CE2-1CE81CED1DC0-1DE61DFD-1DFF20D0-20DC20E120E5-20F02CEF-2CF12DE0-2DFF302A-302F3099309AA66FA67CA67DA6F0A6F1A802A806A80BA825A826A8C4A8E0-A8F1A926-A92DA947-A951A980-A982A9B3A9B6-A9B9A9BCAA29-AA2EAA31AA32AA35AA36AA43AA4CAAB0AAB2-AAB4AAB7AAB8AABEAABFAAC1ABE5ABE8ABEDFB1EFE00-FE0FFE20-FE26",Mc:"0903093E-09400949-094C094E0982098309BE-09C009C709C809CB09CC09D70A030A3E-0A400A830ABE-0AC00AC90ACB0ACC0B020B030B3E0B400B470B480B4B0B4C0B570BBE0BBF0BC10BC20BC6-0BC80BCA-0BCC0BD70C01-0C030C41-0C440C820C830CBE0CC0-0CC40CC70CC80CCA0CCB0CD50CD60D020D030D3E-0D400D46-0D480D4A-0D4C0D570D820D830DCF-0DD10DD8-0DDF0DF20DF30F3E0F3F0F7F102B102C10311038103B103C105610571062-10641067-106D108310841087-108C108F109A-109C17B617BE-17C517C717C81923-19261929-192B193019311933-193819B0-19C019C819C91A19-1A1B1A551A571A611A631A641A6D-1A721B041B351B3B1B3D-1B411B431B441B821BA11BA61BA71BAA1C24-1C2B1C341C351CE11CF2A823A824A827A880A881A8B4-A8C3A952A953A983A9B4A9B5A9BAA9BBA9BD-A9C0AA2FAA30AA33AA34AA4DAA7BABE3ABE4ABE6ABE7ABE9ABEAABEC",Me:"0488048906DE20DD-20E020E2-20E4A670-A672",N:"0030-003900B200B300B900BC-00BE0660-066906F0-06F907C0-07C90966-096F09E6-09EF09F4-09F90A66-0A6F0AE6-0AEF0B66-0B6F0BE6-0BF20C66-0C6F0C78-0C7E0CE6-0CEF0D66-0D750E50-0E590ED0-0ED90F20-0F331040-10491090-10991369-137C16EE-16F017E0-17E917F0-17F91810-18191946-194F19D0-19DA1A80-1A891A90-1A991B50-1B591BB0-1BB91C40-1C491C50-1C5920702074-20792080-20892150-21822185-21892460-249B24EA-24FF2776-27932CFD30073021-30293038-303A3192-31953220-32293251-325F3280-328932B1-32BFA620-A629A6E6-A6EFA830-A835A8D0-A8D9A900-A909A9D0-A9D9AA50-AA59ABF0-ABF9FF10-FF19",Nd:"0030-00390660-066906F0-06F907C0-07C90966-096F09E6-09EF0A66-0A6F0AE6-0AEF0B66-0B6F0BE6-0BEF0C66-0C6F0CE6-0CEF0D66-0D6F0E50-0E590ED0-0ED90F20-0F291040-10491090-109917E0-17E91810-18191946-194F19D0-19DA1A80-1A891A90-1A991B50-1B591BB0-1BB91C40-1C491C50-1C59A620-A629A8D0-A8D9A900-A909A9D0-A9D9AA50-AA59ABF0-ABF9FF10-FF19",Nl:"16EE-16F02160-21822185-218830073021-30293038-303AA6E6-A6EF",No:"00B200B300B900BC-00BE09F4-09F90BF0-0BF20C78-0C7E0D70-0D750F2A-0F331369-137C17F0-17F920702074-20792080-20892150-215F21892460-249B24EA-24FF2776-27932CFD3192-31953220-32293251-325F3280-328932B1-32BFA830-A835",P:"0021-00230025-002A002C-002F003A003B003F0040005B-005D005F007B007D00A100AB00B700BB00BF037E0387055A-055F0589058A05BE05C005C305C605F305F40609060A060C060D061B061E061F066A-066D06D40700-070D07F7-07F90830-083E0964096509700DF40E4F0E5A0E5B0F04-0F120F3A-0F3D0F850FD0-0FD4104A-104F10FB1361-13681400166D166E169B169C16EB-16ED1735173617D4-17D617D8-17DA1800-180A1944194519DE19DF1A1E1A1F1AA0-1AA61AA8-1AAD1B5A-1B601C3B-1C3F1C7E1C7F1CD32010-20272030-20432045-20512053-205E207D207E208D208E2329232A2768-277527C527C627E6-27EF2983-299829D8-29DB29FC29FD2CF9-2CFC2CFE2CFF2E00-2E2E2E302E313001-30033008-30113014-301F3030303D30A030FBA4FEA4FFA60D-A60FA673A67EA6F2-A6F7A874-A877A8CEA8CFA8F8-A8FAA92EA92FA95FA9C1-A9CDA9DEA9DFAA5C-AA5FAADEAADFABEBFD3EFD3FFE10-FE19FE30-FE52FE54-FE61FE63FE68FE6AFE6BFF01-FF03FF05-FF0AFF0C-FF0FFF1AFF1BFF1FFF20FF3B-FF3DFF3FFF5BFF5DFF5F-FF65",Pd:"002D058A05BE140018062010-20152E172E1A301C303030A0FE31FE32FE58FE63FF0D",Ps:"0028005B007B0F3A0F3C169B201A201E2045207D208D23292768276A276C276E27702772277427C527E627E827EA27EC27EE2983298529872989298B298D298F299129932995299729D829DA29FC2E222E242E262E283008300A300C300E3010301430163018301A301DFD3EFE17FE35FE37FE39FE3BFE3DFE3FFE41FE43FE47FE59FE5BFE5DFF08FF3BFF5BFF5FFF62",Pe:"0029005D007D0F3B0F3D169C2046207E208E232A2769276B276D276F27712773277527C627E727E927EB27ED27EF298429862988298A298C298E2990299229942996299829D929DB29FD2E232E252E272E293009300B300D300F3011301530173019301B301E301FFD3FFE18FE36FE38FE3AFE3CFE3EFE40FE42FE44FE48FE5AFE5CFE5EFF09FF3DFF5DFF60FF63",Pi:"00AB2018201B201C201F20392E022E042E092E0C2E1C2E20",Pf:"00BB2019201D203A2E032E052E0A2E0D2E1D2E21",Pc:"005F203F20402054FE33FE34FE4D-FE4FFF3F",Po:"0021-00230025-0027002A002C002E002F003A003B003F0040005C00A100B700BF037E0387055A-055F058905C005C305C605F305F40609060A060C060D061B061E061F066A-066D06D40700-070D07F7-07F90830-083E0964096509700DF40E4F0E5A0E5B0F04-0F120F850FD0-0FD4104A-104F10FB1361-1368166D166E16EB-16ED1735173617D4-17D617D8-17DA1800-18051807-180A1944194519DE19DF1A1E1A1F1AA0-1AA61AA8-1AAD1B5A-1B601C3B-1C3F1C7E1C7F1CD3201620172020-20272030-2038203B-203E2041-20432047-205120532055-205E2CF9-2CFC2CFE2CFF2E002E012E06-2E082E0B2E0E-2E162E182E192E1B2E1E2E1F2E2A-2E2E2E302E313001-3003303D30FBA4FEA4FFA60D-A60FA673A67EA6F2-A6F7A874-A877A8CEA8CFA8F8-A8FAA92EA92FA95FA9C1-A9CDA9DEA9DFAA5C-AA5FAADEAADFABEBFE10-FE16FE19FE30FE45FE46FE49-FE4CFE50-FE52FE54-FE57FE5F-FE61FE68FE6AFE6BFF01-FF03FF05-FF07FF0AFF0CFF0EFF0FFF1AFF1BFF1FFF20FF3CFF61FF64FF65",S:"0024002B003C-003E005E0060007C007E00A2-00A900AC00AE-00B100B400B600B800D700F702C2-02C502D2-02DF02E5-02EB02ED02EF-02FF03750384038503F604820606-0608060B060E060F06E906FD06FE07F609F209F309FA09FB0AF10B700BF3-0BFA0C7F0CF10CF20D790E3F0F01-0F030F13-0F170F1A-0F1F0F340F360F380FBE-0FC50FC7-0FCC0FCE0FCF0FD5-0FD8109E109F13601390-139917DB194019E0-19FF1B61-1B6A1B74-1B7C1FBD1FBF-1FC11FCD-1FCF1FDD-1FDF1FED-1FEF1FFD1FFE20442052207A-207C208A-208C20A0-20B8210021012103-21062108210921142116-2118211E-2123212521272129212E213A213B2140-2144214A-214D214F2190-2328232B-23E82400-24262440-244A249C-24E92500-26CD26CF-26E126E326E8-26FF2701-27042706-2709270C-27272729-274B274D274F-27522756-275E2761-276727942798-27AF27B1-27BE27C0-27C427C7-27CA27CC27D0-27E527F0-29822999-29D729DC-29FB29FE-2B4C2B50-2B592CE5-2CEA2E80-2E992E9B-2EF32F00-2FD52FF0-2FFB300430123013302030363037303E303F309B309C319031913196-319F31C0-31E33200-321E322A-32503260-327F328A-32B032C0-32FE3300-33FF4DC0-4DFFA490-A4C6A700-A716A720A721A789A78AA828-A82BA836-A839AA77-AA79FB29FDFCFDFDFE62FE64-FE66FE69FF04FF0BFF1C-FF1EFF3EFF40FF5CFF5EFFE0-FFE6FFE8-FFEEFFFCFFFD",Sm:"002B003C-003E007C007E00AC00B100D700F703F60606-060820442052207A-207C208A-208C2140-2144214B2190-2194219A219B21A021A321A621AE21CE21CF21D221D421F4-22FF2308-230B23202321237C239B-23B323DC-23E125B725C125F8-25FF266F27C0-27C427C7-27CA27CC27D0-27E527F0-27FF2900-29822999-29D729DC-29FB29FE-2AFF2B30-2B442B47-2B4CFB29FE62FE64-FE66FF0BFF1C-FF1EFF5CFF5EFFE2FFE9-FFEC",Sc:"002400A2-00A5060B09F209F309FB0AF10BF90E3F17DB20A0-20B8A838FDFCFE69FF04FFE0FFE1FFE5FFE6",Sk:"005E006000A800AF00B400B802C2-02C502D2-02DF02E5-02EB02ED02EF-02FF0375038403851FBD1FBF-1FC11FCD-1FCF1FDD-1FDF1FED-1FEF1FFD1FFE309B309CA700-A716A720A721A789A78AFF3EFF40FFE3",So:"00A600A700A900AE00B000B60482060E060F06E906FD06FE07F609FA0B700BF3-0BF80BFA0C7F0CF10CF20D790F01-0F030F13-0F170F1A-0F1F0F340F360F380FBE-0FC50FC7-0FCC0FCE0FCF0FD5-0FD8109E109F13601390-1399194019E0-19FF1B61-1B6A1B74-1B7C210021012103-21062108210921142116-2118211E-2123212521272129212E213A213B214A214C214D214F2195-2199219C-219F21A121A221A421A521A7-21AD21AF-21CD21D021D121D321D5-21F32300-2307230C-231F2322-2328232B-237B237D-239A23B4-23DB23E2-23E82400-24262440-244A249C-24E92500-25B625B8-25C025C2-25F72600-266E2670-26CD26CF-26E126E326E8-26FF2701-27042706-2709270C-27272729-274B274D274F-27522756-275E2761-276727942798-27AF27B1-27BE2800-28FF2B00-2B2F2B452B462B50-2B592CE5-2CEA2E80-2E992E9B-2EF32F00-2FD52FF0-2FFB300430123013302030363037303E303F319031913196-319F31C0-31E33200-321E322A-32503260-327F328A-32B032C0-32FE3300-33FF4DC0-4DFFA490-A4C6A828-A82BA836A837A839AA77-AA79FDFDFFE4FFE8FFEDFFEEFFFCFFFD",Z:"002000A01680180E2000-200A20282029202F205F3000",Zs:"002000A01680180E2000-200A202F205F3000",Zl:"2028",Zp:"2029",C:"0000-001F007F-009F00AD03780379037F-0383038B038D03A20526-05300557055805600588058B-059005C8-05CF05EB-05EF05F5-0605061C061D0620065F06DD070E070F074B074C07B2-07BF07FB-07FF082E082F083F-08FF093A093B094F095609570973-097809800984098D098E0991099209A909B109B3-09B509BA09BB09C509C609C909CA09CF-09D609D8-09DB09DE09E409E509FC-0A000A040A0B-0A0E0A110A120A290A310A340A370A3A0A3B0A3D0A43-0A460A490A4A0A4E-0A500A52-0A580A5D0A5F-0A650A76-0A800A840A8E0A920AA90AB10AB40ABA0ABB0AC60ACA0ACE0ACF0AD1-0ADF0AE40AE50AF00AF2-0B000B040B0D0B0E0B110B120B290B310B340B3A0B3B0B450B460B490B4A0B4E-0B550B58-0B5B0B5E0B640B650B72-0B810B840B8B-0B8D0B910B96-0B980B9B0B9D0BA0-0BA20BA5-0BA70BAB-0BAD0BBA-0BBD0BC3-0BC50BC90BCE0BCF0BD1-0BD60BD8-0BE50BFB-0C000C040C0D0C110C290C340C3A-0C3C0C450C490C4E-0C540C570C5A-0C5F0C640C650C70-0C770C800C810C840C8D0C910CA90CB40CBA0CBB0CC50CC90CCE-0CD40CD7-0CDD0CDF0CE40CE50CF00CF3-0D010D040D0D0D110D290D3A-0D3C0D450D490D4E-0D560D58-0D5F0D640D650D76-0D780D800D810D840D97-0D990DB20DBC0DBE0DBF0DC7-0DC90DCB-0DCE0DD50DD70DE0-0DF10DF5-0E000E3B-0E3E0E5C-0E800E830E850E860E890E8B0E8C0E8E-0E930E980EA00EA40EA60EA80EA90EAC0EBA0EBE0EBF0EC50EC70ECE0ECF0EDA0EDB0EDE-0EFF0F480F6D-0F700F8C-0F8F0F980FBD0FCD0FD9-0FFF10C6-10CF10FD-10FF1249124E124F12571259125E125F1289128E128F12B112B612B712BF12C112C612C712D7131113161317135B-135E137D-137F139A-139F13F5-13FF169D-169F16F1-16FF170D1715-171F1737-173F1754-175F176D17711774-177F17B417B517DE17DF17EA-17EF17FA-17FF180F181A-181F1878-187F18AB-18AF18F6-18FF191D-191F192C-192F193C-193F1941-1943196E196F1975-197F19AC-19AF19CA-19CF19DB-19DD1A1C1A1D1A5F1A7D1A7E1A8A-1A8F1A9A-1A9F1AAE-1AFF1B4C-1B4F1B7D-1B7F1BAB-1BAD1BBA-1BFF1C38-1C3A1C4A-1C4C1C80-1CCF1CF3-1CFF1DE7-1DFC1F161F171F1E1F1F1F461F471F4E1F4F1F581F5A1F5C1F5E1F7E1F7F1FB51FC51FD41FD51FDC1FF01FF11FF51FFF200B-200F202A-202E2060-206F20722073208F2095-209F20B9-20CF20F1-20FF218A-218F23E9-23FF2427-243F244B-245F26CE26E226E4-26E727002705270A270B2728274C274E2753-2755275F27602795-279727B027BF27CB27CD-27CF2B4D-2B4F2B5A-2BFF2C2F2C5F2CF2-2CF82D26-2D2F2D66-2D6E2D70-2D7F2D97-2D9F2DA72DAF2DB72DBF2DC72DCF2DD72DDF2E32-2E7F2E9A2EF4-2EFF2FD6-2FEF2FFC-2FFF3040309730983100-3104312E-3130318F31B8-31BF31E4-31EF321F32FF4DB6-4DBF9FCC-9FFFA48D-A48FA4C7-A4CFA62C-A63FA660A661A674-A67BA698-A69FA6F8-A6FFA78D-A7FAA82C-A82FA83A-A83FA878-A87FA8C5-A8CDA8DA-A8DFA8FC-A8FFA954-A95EA97D-A97FA9CEA9DA-A9DDA9E0-A9FFAA37-AA3FAA4EAA4FAA5AAA5BAA7C-AA7FAAC3-AADAAAE0-ABBFABEEABEFABFA-ABFFD7A4-D7AFD7C7-D7CAD7FC-F8FFFA2EFA2FFA6EFA6FFADA-FAFFFB07-FB12FB18-FB1CFB37FB3DFB3FFB42FB45FBB2-FBD2FD40-FD4FFD90FD91FDC8-FDEFFDFEFDFFFE1A-FE1FFE27-FE2FFE53FE67FE6C-FE6FFE75FEFD-FF00FFBF-FFC1FFC8FFC9FFD0FFD1FFD8FFD9FFDD-FFDFFFE7FFEF-FFFBFFFEFFFF",Cc:"0000-001F007F-009F",Cf:"00AD0600-060306DD070F17B417B5200B-200F202A-202E2060-2064206A-206FFEFFFFF9-FFFB",Co:"E000-F8FF",Cs:"D800-DFFF",Cn:"03780379037F-0383038B038D03A20526-05300557055805600588058B-059005C8-05CF05EB-05EF05F5-05FF06040605061C061D0620065F070E074B074C07B2-07BF07FB-07FF082E082F083F-08FF093A093B094F095609570973-097809800984098D098E0991099209A909B109B3-09B509BA09BB09C509C609C909CA09CF-09D609D8-09DB09DE09E409E509FC-0A000A040A0B-0A0E0A110A120A290A310A340A370A3A0A3B0A3D0A43-0A460A490A4A0A4E-0A500A52-0A580A5D0A5F-0A650A76-0A800A840A8E0A920AA90AB10AB40ABA0ABB0AC60ACA0ACE0ACF0AD1-0ADF0AE40AE50AF00AF2-0B000B040B0D0B0E0B110B120B290B310B340B3A0B3B0B450B460B490B4A0B4E-0B550B58-0B5B0B5E0B640B650B72-0B810B840B8B-0B8D0B910B96-0B980B9B0B9D0BA0-0BA20BA5-0BA70BAB-0BAD0BBA-0BBD0BC3-0BC50BC90BCE0BCF0BD1-0BD60BD8-0BE50BFB-0C000C040C0D0C110C290C340C3A-0C3C0C450C490C4E-0C540C570C5A-0C5F0C640C650C70-0C770C800C810C840C8D0C910CA90CB40CBA0CBB0CC50CC90CCE-0CD40CD7-0CDD0CDF0CE40CE50CF00CF3-0D010D040D0D0D110D290D3A-0D3C0D450D490D4E-0D560D58-0D5F0D640D650D76-0D780D800D810D840D97-0D990DB20DBC0DBE0DBF0DC7-0DC90DCB-0DCE0DD50DD70DE0-0DF10DF5-0E000E3B-0E3E0E5C-0E800E830E850E860E890E8B0E8C0E8E-0E930E980EA00EA40EA60EA80EA90EAC0EBA0EBE0EBF0EC50EC70ECE0ECF0EDA0EDB0EDE-0EFF0F480F6D-0F700F8C-0F8F0F980FBD0FCD0FD9-0FFF10C6-10CF10FD-10FF1249124E124F12571259125E125F1289128E128F12B112B612B712BF12C112C612C712D7131113161317135B-135E137D-137F139A-139F13F5-13FF169D-169F16F1-16FF170D1715-171F1737-173F1754-175F176D17711774-177F17DE17DF17EA-17EF17FA-17FF180F181A-181F1878-187F18AB-18AF18F6-18FF191D-191F192C-192F193C-193F1941-1943196E196F1975-197F19AC-19AF19CA-19CF19DB-19DD1A1C1A1D1A5F1A7D1A7E1A8A-1A8F1A9A-1A9F1AAE-1AFF1B4C-1B4F1B7D-1B7F1BAB-1BAD1BBA-1BFF1C38-1C3A1C4A-1C4C1C80-1CCF1CF3-1CFF1DE7-1DFC1F161F171F1E1F1F1F461F471F4E1F4F1F581F5A1F5C1F5E1F7E1F7F1FB51FC51FD41FD51FDC1FF01FF11FF51FFF2065-206920722073208F2095-209F20B9-20CF20F1-20FF218A-218F23E9-23FF2427-243F244B-245F26CE26E226E4-26E727002705270A270B2728274C274E2753-2755275F27602795-279727B027BF27CB27CD-27CF2B4D-2B4F2B5A-2BFF2C2F2C5F2CF2-2CF82D26-2D2F2D66-2D6E2D70-2D7F2D97-2D9F2DA72DAF2DB72DBF2DC72DCF2DD72DDF2E32-2E7F2E9A2EF4-2EFF2FD6-2FEF2FFC-2FFF3040309730983100-3104312E-3130318F31B8-31BF31E4-31EF321F32FF4DB6-4DBF9FCC-9FFFA48D-A48FA4C7-A4CFA62C-A63FA660A661A674-A67BA698-A69FA6F8-A6FFA78D-A7FAA82C-A82FA83A-A83FA878-A87FA8C5-A8CDA8DA-A8DFA8FC-A8FFA954-A95EA97D-A97FA9CEA9DA-A9DDA9E0-A9FFAA37-AA3FAA4EAA4FAA5AAA5BAA7C-AA7FAAC3-AADAAAE0-ABBFABEEABEFABFA-ABFFD7A4-D7AFD7C7-D7CAD7FC-D7FFFA2EFA2FFA6EFA6FFADA-FAFFFB07-FB12FB18-FB1CFB37FB3DFB3FFB42FB45FBB2-FBD2FD40-FD4FFD90FD91FDC8-FDEFFDFEFDFFFE1A-FE1FFE27-FE2FFE53FE67FE6C-FE6FFE75FEFDFEFEFF00FFBF-FFC1FFC8FFC9FFD0FFD1FFD8FFD9FFDD-FFDFFFE7FFEF-FFF8FFFEFFFF"})}),define("ace/document",["require","exports","module","ace/lib/oop","ace/lib/event_emitter","ace/range","ace/anchor"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/event_emitter").EventEmitter,f=a("./range").Range,g=a("./anchor").Anchor,h=function(a){this.$lines=[],Array.isArray(a)?this.insertLines(0,a):a.length==0?this.$lines=[""]:this.insert({row:0,column:0},a)};(function(){d.implement(this,e),this.setValue=function(a){var b=this.getLength();this.remove(new f(0,0,b,this.getLine(b-1).length)),this.insert({row:0,column:0},a)},this.getValue=function(){return this.getAllLines().join(this.getNewLineCharacter())},this.createAnchor=function(a,b){return new g(this,a,b)},"aaa".split(/a/).length==0?this.$split=function(a){return a.replace(/\r\n|\r/g,"\n").split("\n")}:this.$split=function(a){return a.split(/\r\n|\r|\n/)},this.$detectNewLine=function(a){var b=a.match(/^.*?(\r\n|\r|\n)/m);b?this.$autoNewLine=b[1]:this.$autoNewLine="\n"},this.getNewLineCharacter=function(){switch(this.$newLineMode){case"windows":return"\r\n";case"unix":return"\n";case"auto":return this.$autoNewLine}},this.$autoNewLine="\n",this.$newLineMode="auto",this.setNewLineMode=function(a){if(this.$newLineMode===a)return;this.$newLineMode=a},this.getNewLineMode=function(){return this.$newLineMode},this.isNewLine=function(a){return a=="\r\n"||a=="\r"||a=="\n"},this.getLine=function(a){return this.$lines[a]||""},this.getLines=function(a,b){return this.$lines.slice(a,b+1)},this.getAllLines=function(){return this.getLines(0,this.getLength())},this.getLength=function(){return this.$lines.length},this.getTextRange=function(a){if(a.start.row==a.end.row)return this.$lines[a.start.row].substring(a.start.column,a.end.column);var b=this.getLines(a.start.row+1,a.end.row-1);return b.unshift((this.$lines[a.start.row]||"").substring(a.start.column)),b.push((this.$lines[a.end.row]||"").substring(0,a.end.column)),b.join(this.getNewLineCharacter())},this.$clipPosition=function(a){var b=this.getLength();return a.row>=b&&(a.row=Math.max(0,b-1),a.column=this.getLine(b-1).length),a},this.insert=function(a,b){if(!b||b.length===0)return a;a=this.$clipPosition(a),this.getLength()<=1&&this.$detectNewLine(b);var c=this.$split(b),d=c.splice(0,1)[0],e=c.length==0?null:c.splice(c.length-1,1)[0];return a=this.insertInLine(a,d),e!==null&&(a=this.insertNewLine(a),a=this.insertLines(a.row,c),a=this.insertInLine(a,e||"")),a},this.insertLines=function(a,b){if(b.length==0)return{row:a,column:0};var c=[a,0];c.push.apply(c,b),this.$lines.splice.apply(this.$lines,c);var d=new f(a,0,a+b.length,0),e={action:"insertLines",range:d,lines:b};return this._emit("change",{data:e}),d.end},this.insertNewLine=function(a){a=this.$clipPosition(a);var b=this.$lines[a.row]||"";this.$lines[a.row]=b.substring(0,a.column),this.$lines.splice(a.row+1,0,b.substring(a.column,b.length));var c={row:a.row+1,column:0},d={action:"insertText",range:f.fromPoints(a,c),text:this.getNewLineCharacter()};return this._emit("change",{data:d}),c},this.insertInLine=function(a,b){if(b.length==0)return a;var c=this.$lines[a.row]||"";this.$lines[a.row]=c.substring(0,a.column)+b+c.substring(a.column);var d={row:a.row,column:a.column+b.length},e={action:"insertText",range:f.fromPoints(a,d),text:b};return this._emit("change",{data:e}),d},this.remove=function(a){a.start=this.$clipPosition(a.start),a.end=this.$clipPosition(a.end);if(a.isEmpty())return a.start;var b=a.start.row,c=a.end.row;if(a.isMultiLine()){var d=a.start.column==0?b:b+1,e=c-1;a.end.column>0&&this.removeInLine(c,0,a.end.column),e>=d&&this.removeLines(d,e),d!=b&&(this.removeInLine(b,a.start.column,this.getLine(b).length),this.removeNewLine(a.start.row))}else this.removeInLine(b,a.start.column,a.end.column);return a.start},this.removeInLine=function(a,b,c){if(b==c)return;var d=new f(a,b,a,c),e=this.getLine(a),g=e.substring(b,c),h=e.substring(0,b)+e.substring(c,e.length);this.$lines.splice(a,1,h);var i={action:"removeText",range:d,text:g};return this._emit("change",{data:i}),d.start},this.removeLines=function(a,b){var c=new f(a,0,b+1,0),d=this.$lines.splice(a,b-a+1),e={action:"removeLines",range:c,nl:this.getNewLineCharacter(),lines:d};return this._emit("change",{data:e}),d},this.removeNewLine=function(a){var b=this.getLine(a),c=this.getLine(a+1),d=new f(a,b.length,a+1,0),e=b+c;this.$lines.splice(a,2,e);var g={action:"removeText",range:d,text:this.getNewLineCharacter()};this._emit("change",{data:g})},this.replace=function(a,b){if(b.length==0&&a.isEmpty())return a.start;if(b==this.getTextRange(a))return a.end;this.remove(a);if(b)var c=this.insert(a.start,b);else c=a.start;return c},this.applyDeltas=function(a){for(var b=0;b<a.length;b++){var c=a[b],d=f.fromPoints(c.range.start,c.range.end);c.action=="insertLines"?this.insertLines(d.start.row,c.lines):c.action=="insertText"?this.insert(d.start,c.text):c.action=="removeLines"?this.removeLines(d.start.row,d.end.row-1):c.action=="removeText"&&this.remove(d)}},this.revertDeltas=function(a){for(var b=a.length-1;b>=0;b--){var c=a[b],d=f.fromPoints(c.range.start,c.range.end);c.action=="insertLines"?this.removeLines(d.start.row,d.end.row-1):c.action=="insertText"?this.remove(d):c.action=="removeLines"?this.insertLines(d.start.row,c.lines):c.action=="removeText"&&this.insert(d.start,c.text)}}}).call(h.prototype),b.Document=h}),define("ace/anchor",["require","exports","module","ace/lib/oop","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/event_emitter").EventEmitter,f=b.Anchor=function(a,b,c){this.document=a,typeof c=="undefined"?this.setPosition(b.row,b.column):this.setPosition(b,c),this.$onChange=this.onChange.bind(this),a.on("change",this.$onChange)};(function(){d.implement(this,e),this.getPosition=function(){return this.$clipPositionToDocument(this.row,this.column)},this.getDocument=function(){return this.document},this.onChange=function(a){var b=a.data,c=b.range;if(c.start.row==c.end.row&&c.start.row!=this.row)return;if(c.start.row>this.row)return;if(c.start.row==this.row&&c.start.column>this.column)return;var d=this.row,e=this.column;b.action==="insertText"?c.start.row===d&&c.start.column<=e?c.start.row===c.end.row?e+=c.end.column-c.start.column:(e-=c.start.column,d+=c.end.row-c.start.row):c.start.row!==c.end.row&&c.start.row<d&&(d+=c.end.row-c.start.row):b.action==="insertLines"?c.start.row<=d&&(d+=c.end.row-c.start.row):b.action=="removeText"?c.start.row==d&&c.start.column<e?c.end.column>=e?e=c.start.column:e=Math.max(0,e-(c.end.column-c.start.column)):c.start.row!==c.end.row&&c.start.row<d?(c.end.row==d&&(e=Math.max(0,e-c.end.column)+c.start.column),d-=c.end.row-c.start.row):c.end.row==d&&(d-=c.end.row-c.start.row,e=Math.max(0,e-c.end.column)+c.start.column):b.action=="removeLines"&&c.start.row<=d&&(c.end.row<=d?d-=c.end.row-c.start.row:(d=c.start.row,e=0)),this.setPosition(d,e,!0)},this.setPosition=function(a,b,c){var d;c?d={row:a,column:b}:d=this.$clipPositionToDocument(a,b);if(this.row==d.row&&this.column==d.column)return;var e={row:this.row,column:this.column};this.row=d.row,this.column=d.column,this._emit("change",{old:e,value:d})},this.detach=function(){this.document.removeEventListener("change",this.$onChange)},this.$clipPositionToDocument=function(a,b){var c={};return a>=this.document.getLength()?(c.row=Math.max(0,this.document.getLength()-1),c.column=this.document.getLine(c.row).length):a<0?(c.row=0,c.column=0):(c.row=a,c.column=Math.min(this.document.getLine(c.row).length,Math.max(0,b))),b<0&&(c.column=0),c}}).call(f.prototype)}),define("ace/background_tokenizer",["require","exports","module","ace/lib/oop","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/event_emitter").EventEmitter,f=function(a,b){this.running=!1,this.lines=[],this.currentLine=0,this.tokenizer=a;var c=this;this.$worker=function(){if(!c.running)return;var a=new Date,b=c.currentLine,d=c.doc,e=0,f=d.getLength();while(c.currentLine<f){c.lines[c.currentLine]=c.$tokenizeRows(c.currentLine,c.currentLine)[0],c.currentLine++,e+=1;if(e%5==0&&new Date-a>20){c.fireUpdateEvent(b,c.currentLine-1),c.running=setTimeout(c.$worker,20);return}}c.running=!1,c.fireUpdateEvent(b,f-1)}};(function(){d.implement(this,e),this.setTokenizer=function(a){this.tokenizer=a,this.lines=[],this.start(0)},this.setDocument=function(a){this.doc=a,this.lines=[],this.stop()},this.fireUpdateEvent=function(a,b){var c={first:a,last:b};this._emit("update",{data:c})},this.start=function(a){this.currentLine=Math.min(a||0,this.currentLine,this.doc.getLength()),this.lines.splice(this.currentLine,this.lines.length),this.stop(),this.running=setTimeout(this.$worker,700)},this.stop=function(){this.running&&clearTimeout(this.running),this.running=!1},this.getTokens=function(a,b){return this.$tokenizeRows(a,b)},this.getState=function(a){return this.$tokenizeRows(a,a)[0].state},this.$tokenizeRows=function(a,b){if(!this.doc||isNaN(a)||isNaN(b))return[{state:"start",tokens:[]}];var c=[],d="start",e=!1;a>0&&this.lines[a-1]?(d=this.lines[a-1].state,e=!0):a==0?(d="start",e=!0):this.lines.length>0&&(d=this.lines[this.lines.length-1].state);var f=this.doc.getLines(a,b);for(var g=a;g<=b;g++)if(!this.lines[g]){var h=this.tokenizer.getLineTokens(f[g-a]||"",d),d=h.state;c.push(h),e&&(this.lines[g]=h)}else{var h=this.lines[g];d=h.state,c.push(h)}return c}}).call(f.prototype),b.BackgroundTokenizer=f}),define("ace/edit_session/folding",["require","exports","module","ace/range","ace/edit_session/fold_line","ace/edit_session/fold","ace/token_iterator"],function(a,b,c){function h(){this.getFoldAt=function(a,b,c){var d=this.getFoldLine(a);if(!d)return null;var e=d.folds;for(var f=0;f<e.length;f++){var g=e[f];if(g.range.contains(a,b)){if(c==1&&g.range.isEnd(a,b))continue;if(c==-1&&g.range.isStart(a,b))continue;return g}}},this.getFoldsInRange=function(a){a=a.clone();var b=a.start,c=a.end,d=this.$foldData,e=[];b.column+=1,c.column-=1;for(var f=0;f<d.length;f++){var g=d[f].range.compareRange(a);if(g==2)continue;if(g==-2)break;var h=d[f].folds;for(var i=0;i<h.length;i++){var j=h[i];g=j.range.compareRange(a);if(g==-2)break;if(g==2)continue;if(g==42)break;e.push(j)}}return e},this.getAllFolds=function(){function c(b){a.push(b);if(!b.subFolds)return;for(var d=0;d<b.subFolds.length;d++)c(b.subFolds[d])}var a=[],b=this.$foldData;for(var d=0;d<b.length;d++)for(var e=0;e<b[d].folds.length;e++)c(b[d].folds[e]);return a},this.getFoldStringAt=function(a,b,c,d){d=d||this.getFoldLine(a);if(!d)return null;var e={end:{column:0}},f,g;for(var h=0;h<d.folds.length;h++){g=d.folds[h];var i=g.range.compareEnd(a,b);if(i==-1){f=this.getLine(g.start.row).substring(e.end.column,g.start.column);break}if(i===0)return null;e=g}return f||(f=this.getLine(g.start.row).substring(e.end.column)),c==-1?f.substring(0,b-e.end.column):c==1?f.substring(b-e.end.column):f},this.getFoldLine=function(a,b){var c=this.$foldData,d=0;b&&(d=c.indexOf(b)),d==-1&&(d=0);for(d;d<c.length;d++){var e=c[d];if(e.start.row<=a&&e.end.row>=a)return e;if(e.end.row>a)return null}return null},this.getNextFoldLine=function(a,b){var c=this.$foldData,d=0;b&&(d=c.indexOf(b)),d==-1&&(d=0);for(d;d<c.length;d++){var e=c[d];if(e.end.row>=a)return e}return null},this.getFoldedRowCount=function(a,b){var c=this.$foldData,d=b-a+1;for(var e=0;e<c.length;e++){var f=c[e],g=f.end.row,h=f.start.row;if(g>=b){h<b&&(h>=a?d-=b-h:d=0);break}g>=a&&(h>=a?d-=g-h:d-=g-a+1)}return d},this.$addFoldLine=function(a){return this.$foldData.push(a),this.$foldData.sort(function(a,b){return a.start.row-b.start.row}),a},this.addFold=function(a,b){var c=this.$foldData,d=!1,g;a instanceof f?g=a:g=new f(b,a),this.$clipRangeToDocument(g.range);var h=g.start.row,i=g.start.column,j=g.end.row,k=g.end.column;if(g.placeholder.length<2)throw"Placeholder has to be at least 2 characters";if(h==j&&k-i<2)throw"The range has to be at least 2 characters width";var l=this.getFoldAt(h,i,1),m=this.getFoldAt(j,k,-1);if(l&&m==l)return l.addSubFold(g);if(l&&!l.range.isStart(h,i)||m&&!m.range.isEnd(j,k))throw"A fold can't intersect already existing fold"+g.range+l.range;var n=this.getFoldsInRange(g.range);n.length>0&&(this.removeFolds(n),g.subFolds=n);for(var o=0;o<c.length;o++){var p=c[o];if(j==p.start.row){p.addFold(g),d=!0;break}if(h==p.end.row){p.addFold(g),d=!0;if(!g.sameRow){var q=c[o+1];if(q&&q.start.row==j){p.merge(q);break}}break}if(j<=p.start.row)break}return d||(p=this.$addFoldLine(new e(this.$foldData,g))),this.$useWrapMode&&this.$updateWrapData(p.start.row,p.start.row),this.$modified=!0,this._emit("changeFold",{data:g}),g},this.addFolds=function(a){a.forEach(function(a){this.addFold(a)},this)},this.removeFold=function(a){var b=a.foldLine,c=b.start.row,d=b.end.row,e=this.$foldData,f=b.folds;if(f.length==1)e.splice(e.indexOf(b),1);else if(b.range.isEnd(a.end.row,a.end.column))f.pop(),b.end.row=f[f.length-1].end.row,b.end.column=f[f.length-1].end.column;else if(b.range.isStart(a.start.row,a.start.column))f.shift(),b.start.row=f[0].start.row,b.start.column=f[0].start.column;else if(a.sameRow)f.splice(f.indexOf(a),1);else{var g=b.split(a.start.row,a.start.column);f=g.folds,f.shift(),g.start.row=f[0].start.row,g.start.column=f[0].start.column}this.$useWrapMode&&this.$updateWrapData(c,d),this.$modified=!0,this._emit("changeFold",{data:a})},this.removeFolds=function(a){var b=[];for(var c=0;c<a.length;c++)b.push(a[c]);b.forEach(function(a){this.removeFold(a)},this),this.$modified=!0},this.expandFold=function(a){this.removeFold(a),a.subFolds.forEach(function(a){this.addFold(a)},this),a.subFolds=[]},this.expandFolds=function(a){a.forEach(function(a){this.expandFold(a)},this)},this.unfold=function(a,b){var c,e;a==null?c=new d(0,0,this.getLength(),0):typeof a=="number"?c=new d(a,0,a,this.getLine(a).length):"row"in a?c=d.fromPoints(a,a):c=a,e=this.getFoldsInRange(c);if(b)this.removeFolds(e);else while(e.length)this.expandFolds(e),e=this.getFoldsInRange(c)},this.isRowFolded=function(a,b){return!!this.getFoldLine(a,b)},this.getRowFoldEnd=function(a,b){var c=this.getFoldLine(a,b);return c?c.end.row:a},this.getFoldDisplayLine=function(a,b,c,d,e){d==null&&(d=a.start.row,e=0),b==null&&(b=a.end.row,c=this.getLine(b).length);var f=this.doc,g="";return a.walk(function(a,b,c,h){if(b<d)return;if(b==d){if(c<e)return;h=Math.max(e,h)}a?g+=a:g+=f.getLine(b).substring(h,c)}.bind(this),b,c),g},this.getDisplayLine=function(a,b,c,d){var e=this.getFoldLine(a);if(!e){var f;return f=this.doc.getLine(a),f.substring(d||0,b||f.length)}return this.getFoldDisplayLine(e,a,b,c,d)},this.$cloneFoldData=function(){var a=[];return a=this.$foldData.map(function(b){var c=b.folds.map(function(a){return a.clone()});return new e(a,c)}),a},this.toggleFold=function(a){var b=this.selection,c=b.getRange(),d,e;if(c.isEmpty()){var f=c.start;d=this.getFoldAt(f.row,f.column);if(d){this.expandFold(d);return}(e=this.findMatchingBracket(f))?c.comparePoint(e)==1?c.end=e:(c.start=e,c.start.column++,c.end.column--):(e=this.findMatchingBracket({row:f.row,column:f.column+1}))?(c.comparePoint(e)==1?c.end=e:c.start=e,c.start.column++):c=this.getCommentFoldRange(f.row,f.column)||c}else{var g=this.getFoldsInRange(c);if(a&&g.length){this.expandFolds(g);return}g.length==1&&(d=g[0])}d||(d=this.getFoldAt(c.start.row,c.start.column));if(d&&d.range.toString()==c.toString()){this.expandFold(d);return}var h="...";if(!c.isMultiLine()){h=this.getTextRange(c);if(h.length<4)return;h=h.trim().substring(0,2)+".."}this.addFold(h,c)},this.getCommentFoldRange=function(a,b){var c=new g(this,a,b),e=c.getCurrentToken();if(e&&/^comment|string/.test(e.type)){var f=new d,h=new RegExp(e.type.replace(/\..*/,"\\."));do e=c.stepBackward();while(e&&h.test(e.type));c.stepForward(),f.start.row=c.getCurrentTokenRow(),f.start.column=c.getCurrentTokenColumn()+2,c=new g(this,a,b);do e=c.stepForward();while(e&&h.test(e.type));return e=c.stepBackward(),f.end.row=c.getCurrentTokenRow(),f.end.column=c.getCurrentTokenColumn()+e.value.length,f}},this.foldAll=function(a,b){var c=this.foldWidgets;b=b||this.getLength();for(var d=a||0;d<b;d++){c[d]==null&&(c[d]=this.getFoldWidget(d));if(c[d]!="start")continue;var e=this.getFoldWidgetRange(d);if(e&&e.end.row<b)try{this.addFold("...",e)}catch(f){}}},this.$foldStyles={manual:1,markbegin:1,markbeginend:1},this.$foldStyle="markbegin",this.setFoldStyle=function(a){if(!this.$foldStyles[a])throw new Error("invalid fold style: "+a+"["+Object.keys(this.$foldStyles).join(", ")+"]");if(this.$foldStyle==a)return;this.$foldStyle=a,a=="manual"&&this.unfold();var b=this.$foldMode;this.$setFolding(null),this.$setFolding(b)},this.$setFolding=function(a){if(this.$foldMode==a)return;this.$foldMode=a,this.removeListener("change",this.$updateFoldWidgets),this._emit("changeAnnotation");if(!a||this.$foldStyle=="manual"){this.foldWidgets=null;return}this.foldWidgets=[],this.getFoldWidget=a.getFoldWidget.bind(a,this,this.$foldStyle),this.getFoldWidgetRange=a.getFoldWidgetRange.bind(a,this,this.$foldStyle),this.$updateFoldWidgets=this.updateFoldWidgets.bind(this),this.on("change",this.$updateFoldWidgets)},this.onFoldWidgetClick=function(a,b){var c=this.getFoldWidget(a),d=this.getLine(a),e=b.shiftKey,f=e||b.ctrlKey||b.altKey||b.metaKey,g;c=="end"?g=this.getFoldAt(a,0,-1):g=this.getFoldAt(a,d.length,1);if(g){f?this.removeFold(g):this.expandFold(g);return}var h=this.getFoldWidgetRange(a);if(h){if(!h.isMultiLine()){g=this.getFoldAt(h.start.row,h.start.column,1);if(g&&h.isEqual(g.range)){this.removeFold(g);return}}e||this.addFold("...",h),f&&this.foldAll(h.start.row+1,h.end.row)}else f&&this.foldAll(a+1,this.getLength()),b.target.className+=" invalid"},this.updateFoldWidgets=function(a){var b=a.data,c=b.range,d=c.start.row,e=c.end.row-d;if(e===0)this.foldWidgets[d]=null;else if(b.action=="removeText"||b.action=="removeLines")this.foldWidgets.splice(d,e+1,null);else{var f=Array(e+1);f.unshift(d,1),this.foldWidgets.splice.apply(this.foldWidgets,f)}}}"use strict";var d=a("../range").Range,e=a("./fold_line").FoldLine,f=a("./fold").Fold,g=a("../token_iterator").TokenIterator;b.Folding=h}),define("ace/edit_session/fold_line",["require","exports","module","ace/range"],function(a,b,c){function e(a,b){this.foldData=a,Array.isArray(b)?this.folds=b:b=this.folds=[b];var c=b[b.length-1];this.range=new d(b[0].start.row,b[0].start.column,c.end.row,c.end.column),this.start=this.range.start,this.end=this.range.end,this.folds.forEach(function(a){a.setFoldLine(this)},this)}"use strict";var d=a("../range").Range;(function(){this.shiftRow=function(a){this.start.row+=a,this.end.row+=a,this.folds.forEach(function(b){b.start.row+=a,b.end.row+=a})},this.addFold=function(a){if(a.sameRow){if(a.start.row<this.startRow||a.endRow>this.endRow)throw"Can't add a fold to this FoldLine as it has no connection";this.folds.push(a),this.folds.sort(function(a,b){return-a.range.compareEnd(b.start.row,b.start.column)}),this.range.compareEnd(a.start.row,a.start.column)>0?(this.end.row=a.end.row,this.end.column=a.end.column):this.range.compareStart(a.end.row,a.end.column)<0&&(this.start.row=a.start.row,this.start.column=a.start.column)}else if(a.start.row==this.end.row)this.folds.push(a),this.end.row=a.end.row,this.end.column=a.end.column;else{if(a.end.row!=this.start.row)throw"Trying to add fold to FoldRow that doesn't have a matching row";this.folds.unshift(a),this.start.row=a.start.row,this.start.column=a.start.column}a.foldLine=this},this.containsRow=function(a){return a>=this.start.row&&a<=this.end.row},this.walk=function(a,b,c){var d=0,e=this.folds,f,g,h,i=!0;b==null&&(b=this.end.row,c=this.end.column);for(var j=0;j<e.length;j++){f=e[j],g=f.range.compareStart(b,c);if(g==-1){a(null,b,c,d,i);return}h=a(null,f.start.row,f.start.column,d,i),h=!h&&a(f.placeholder,f.start.row,f.start.column,d);if(h||g==0)return;i=!f.sameRow,d=f.end.column}a(null,b,c,d,i)},this.getNextFoldTo=function(a,b){var c,d;for(var e=0;e<this.folds.length;e++){c=this.folds[e],d=c.range.compareEnd(a,b);if(d==-1)return{fold:c,kind:"after"};if(d==0)return{fold:c,kind:"inside"}}return null},this.addRemoveChars=function(a,b,c){var d=this.getNextFoldTo(a,b),e,f;if(d){e=d.fold;if(d.kind=="inside"&&e.start.column!=b&&e.start.row!=a)window.console&&window.console.log(a,b,e);else if(e.start.row==a){f=this.folds;var g=f.indexOf(e);g==0&&(this.start.column+=c);for(g;g<f.length;g++){e=f[g],e.start.column+=c;if(!e.sameRow)return;e.end.column+=c}this.end.column+=c}}},this.split=function(a,b){var c=this.getNextFoldTo(a,b).fold,d=this.folds,f=this.foldData;if(!c)return null;var g=d.indexOf(c),h=d[g-1];this.end.row=h.end.row,this.end.column=h.end.column,d=d.splice(g,d.length-g);var i=new e(f,d);return f.splice(f.indexOf(this)+1,0,i),i},this.merge=function(a){var b=a.folds;for(var c=0;c<b.length;c++)this.addFold(b[c]);var d=this.foldData;d.splice(d.indexOf(a),1)},this.toString=function(){var a=[this.range.toString()+": ["];return this.folds.forEach(function(b){a.push("  "+b.toString())}),a.push("]"),a.join("\n")},this.idxToPosition=function(a){var b=0,c;for(var d=0;d<this.folds.length;d++){var c=this.folds[d];a-=c.start.column-b;if(a<0)return{row:c.start.row,column:c.start.column+a};a-=c.placeholder.length;if(a<0)return c.start;b=c.end.column}return{row:this.end.row,column:this.end.column+a}}}).call(e.prototype),b.FoldLine=e}),define("ace/edit_session/fold",["require","exports","module"],function(a,b,c){"use strict";var d=b.Fold=function(a,b){this.foldLine=null,this.placeholder=b,this.range=a,this.start=a.start,this.end=a.end,this.sameRow=a.start.row==a.end.row,this.subFolds=[]};(function(){this.toString=function(){return'"'+this.placeholder+'" '+this.range.toString()},this.setFoldLine=function(a){this.foldLine=a,this.subFolds.forEach(function(b){b.setFoldLine(a)})},this.clone=function(){var a=this.range.clone(),b=new d(a,this.placeholder);return this.subFolds.forEach(function(a){b.subFolds.push(a.clone())}),b},this.addSubFold=function(a){if(this.range.isEqual(a))return this;if(!this.range.containsRange(a))throw"A fold can't intersect already existing fold"+a.range+this.range;var b=a.range.start.row,c=a.range.start.column;for(var d=0,e=-1;d<this.subFolds.length;d++){e=this.subFolds[d].range.compare(b,c);if(e!=1)break}var f=this.subFolds[d];if(e==0)return f.addSubFold(a);var b=a.range.end.row,c=a.range.end.column;for(var g=d,e=-1;g<this.subFolds.length;g++){e=this.subFolds[g].range.compare(b,c);if(e!=1)break}var h=this.subFolds[g];if(e==0)throw"A fold can't intersect already existing fold"+a.range+this.range;var i=this.subFolds.splice(d,g-d,a);return a.setFoldLine(this.foldLine),a}}).call(d.prototype)}),define("ace/token_iterator",["require","exports","module"],function(a,b,c){"use strict";var d=function(a,b,c){this.$session=a,this.$row=b,this.$rowTokens=a.getTokens(b,b)[0].tokens;var d=a.getTokenAt(b,c);this.$tokenIndex=d?d.index:-1};(function(){this.stepBackward=function(){this.$tokenIndex-=1;while(this.$tokenIndex<0){this.$row-=1;if(this.$row<0)return this.$row=0,null;this.$rowTokens=this.$session.getTokens(this.$row,this.$row)[0].tokens,this.$tokenIndex=this.$rowTokens.length-1}return this.$rowTokens[this.$tokenIndex]},this.stepForward=function(){var a=this.$session.getLength();this.$tokenIndex+=1;while(this.$tokenIndex>=this.$rowTokens.length){this.$row+=1;if(this.$row>=a)return this.$row=a-1,null;this.$rowTokens=this.$session.getTokens(this.$row,this.$row)[0].tokens,this.$tokenIndex=0}return this.$rowTokens[this.$tokenIndex]},this.getCurrentToken=function(){return this.$rowTokens[this.$tokenIndex]},this.getCurrentTokenRow=function(){return this.$row},this.getCurrentTokenColumn=function(){var a=this.$rowTokens,b=this.$tokenIndex,c=a[b].start;if(c!==undefined)return c;c=0;while(b>0)b-=1,c+=a[b].value.length;return c}}).call(d.prototype),b.TokenIterator=d}),define("ace/edit_session/bracket_match",["require","exports","module","ace/token_iterator"],function(a,b,c){function e(){this.findMatchingBracket=function(a){if(a.column==0)return null;var b=this.getLine(a.row).charAt(a.column-1);if(b=="")return null;var c=b.match(/([\(\[\{])|([\)\]\}])/);return c?c[1]?this.$findClosingBracket(c[1],a):this.$findOpeningBracket(c[2],a):null},this.$brackets={")":"(","(":")","]":"[","[":"]","{":"}","}":"{"},this.$findOpeningBracket=function(a,b){var c=this.$brackets[a],e=1,f=new d(this,b.row,b.column),g=f.getCurrentToken();if(!g)return null;var h=new RegExp("(\\.?"+g.type.replace(".","|").replace("rparen","lparen|rparen")+")+"),i=b.column-f.getCurrentTokenColumn()-2,j=g.value;for(;;){while(i>=0){var k=j.charAt(i);if(k==c){e-=1;if(e==0)return{row:f.getCurrentTokenRow(),column:i+f.getCurrentTokenColumn()}}else k==a&&(e+=1);i-=1}do g=f.stepBackward();while(g&&!h.test(g.type));if(g==null)break;j=g.value,i=j.length-1}return null},this.$findClosingBracket=function(a,b){var c=this.$brackets[a],e=1,f=new d(this,b.row,b.column),g=f.getCurrentToken();if(!g)return null;var h=new RegExp("(\\.?"+g.type.replace(".","|").replace("lparen","lparen|rparen")+")+"),i=b.column-f.getCurrentTokenColumn();for(;;){var j=g.value,k=j.length;while(i<k){var l=j.charAt(i);if(l==c){e-=1;if(e==0)return{row:f.getCurrentTokenRow(),column:i+f.getCurrentTokenColumn()}}else l==a&&(e+=1);i+=1}do g=f.stepForward();while(g&&!h.test(g.type));if(g==null)break;i=0}return null}}"use strict";var d=a("../token_iterator").TokenIterator;b.BracketMatch=e}),define("ace/search",["require","exports","module","ace/lib/lang","ace/lib/oop","ace/range"],function(a,b,c){"use strict";var d=a("./lib/lang"),e=a("./lib/oop"),f=a("./range").Range,g=function(){this.$options={needle:"",backwards:!1,wrap:!1,caseSensitive:!1,wholeWord:!1,scope:g.ALL,regExp:!1}};g.ALL=1,g.SELECTION=2,function(){this.set=function(a){return e.mixin(this.$options,a),this},this.getOptions=function(){return d.copyObject(this.$options)},this.find=function(a){if(!this.$options.needle)return null;if(this.$options.backwards)var b=this.$backwardMatchIterator(a);else b=this.$forwardMatchIterator(a);var c=null;return b.forEach(function(a){return c=a,!0}),c},this.findAll=function(a){var b=this.$options;if(!b.needle)return[];if(b.backwards)var c=this.$backwardMatchIterator(a);else c=this.$forwardMatchIterator(a);var d=!b.start&&b.wrap&&b.scope==g.ALL;d&&(b.start={row:0,column:0});var e=[];return c.forEach(function(a){e.push(a)}),d&&(b.start=null),e},this.replace=function(a,b){var c=this.$assembleRegExp(),d=c.exec(a);return d&&d[0].length==a.length?this.$options.regExp?a.replace(c,b):b:null},this.$forwardMatchIterator=function(a){var b=this.$assembleRegExp(),c=this;return{forEach:function(d){c.$forwardLineIterator(a).forEach(function(a,e,f){e&&(a=a.substring(e));var g=[];a.replace(b,function(a){var b=arguments[arguments.length-2];return g.push({str:a,offset:e+b}),a});for(var h=0;h<g.length;h++){var i=g[h],j=c.$rangeFromMatch(f,i.offset,i.str.length);if(d(j))return!0}})}}},this.$backwardMatchIterator=function(a){var b=this.$assembleRegExp(),c=this;return{forEach:function(d){c.$backwardLineIterator(a).forEach(function(a,e,f){e&&(a=a.substring(e));var g=[];a.replace(b,function(a,b){return g.push({str:a,offset:e+b}),a});for(var h=g.length-1;h>=0;h--){var i=g[h],j=c.$rangeFromMatch(f,i.offset,i.str.length);if(d(j))return!0}})}}},this.$rangeFromMatch=function(a,b,c){return new f(a,b,a,b+c)},this.$assembleRegExp=function(){if(this.$options.regExp)var a=this.$options.needle;else a=d.escapeRegExp(this.$options.needle);this.$options.wholeWord&&(a="\\b"+a+"\\b");var b="g";this.$options.caseSensitive||(b+="i");var c=new RegExp(a,b);return c},this.$forwardLineIterator=function(a){function k(e){var f=a.getLine(e);return b&&e==c.end.row&&(f=f.substring(0,c.end.column)),j&&e==d.row&&(f=f.substring(0,d.column)),f}var b=this.$options.scope==g.SELECTION,c=this.$options.range||a.getSelection().getRange(),d=this.$options.start||c[b?"start":"end"],e=b?c.start.row:0,f=b?c.start.column:0,h=b?c.end.row:a.getLength()-1,i=this.$options.wrap,j=!1;return{forEach:function(a){var b=d.row,c=k(b),g=d.column,l=!1;j=!1;while(!a(c,g,b)){if(l)return;b++,g=0;if(b>h){if(!i)return;b=e,g=f,j=!0}b==d.row&&(l=!0),c=k(b)}}}},this.$backwardLineIterator=function(a){var b=this.$options.scope==g.SELECTION,c=this.$options.range||a.getSelection().getRange(),d=this.$options.start||c[b?"end":"start"],e=b?c.start.row:0,f=b?c.start.column:0,h=b?c.end.row:a.getLength()-1,i=this.$options.wrap;return{forEach:function(g){var j=d.row,k=a.getLine(j).substring(0,d.column),l=0,m=!1,n=!1;while(!g(k,l,j)){if(m)return;j--,l=0;if(j<e){if(!i)return;j=h,n=!0}j==d.row&&(m=!0),k=a.getLine(j),b&&(j==e?l=f:j==h&&(k=k.substring(0,c.end.column))),n&&j==d.row&&(l=d.column)}}}}}.call(g.prototype),b.Search=g}),define("ace/commands/command_manager",["require","exports","module","ace/lib/oop","ace/keyboard/hash_handler","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../keyboard/hash_handler").HashHandler,f=a("../lib/event_emitter").EventEmitter,g=function(a,b){this.platform=a,this.commands={},this.commmandKeyBinding={},this.addCommands(b),this.setDefaultHandler("exec",function(a){return a.command.exec(a.editor,a.args||{})})};d.inherits(g,e),function(){d.implement(this,f),this.exec=function(a,b,c){typeof a=="string"&&(a=this.commands[a]);if(!a)return!1;if(b&&b.$readOnly&&!a.readOnly)return!1;try{var d=this._emit("exec",{editor:b,command:a,args:c})}catch(e){return window.console&&window.console.log(e),!0}return d===!1?!1:!0},this.toggleRecording=function(){if(this.$inReplay)return;return this.recording?(this.macro.pop(),this.removeEventListener("exec",this.$addCommandToMacro),this.macro.length||(this.macro=this.oldMacro),this.recording=!1):(this.$addCommandToMacro||(this.$addCommandToMacro=function(a){this.macro.push([a.command,a.args])}.bind(this)),this.oldMacro=this.macro,this.macro=[],this.on("exec",this.$addCommandToMacro),this.recording=!0)},this.replay=function(a){if(this.$inReplay||!this.macro)return;if(this.recording)return this.toggleRecording();try{this.$inReplay=!0,this.macro.forEach(function(b){typeof b=="string"?this.exec(b,a):this.exec(b[0],a,b[1])},this)}finally{this.$inReplay=!1}},this.trimMacro=function(a){return a.map(function(a){return typeof a[0]!="string"&&(a[0]=a[0].name),a[1]||(a=a[0]),a})}}.call(g.prototype),b.CommandManager=g}),define("ace/keyboard/hash_handler",["require","exports","module","ace/lib/keys"],function(a,b,c){function e(a,b){this.platform=b,this.commands={},this.commmandKeyBinding={},this.addCommands(a)}"use strict";var d=a("../lib/keys");(function(){this.addCommand=function(a){this.commands[a.name]&&this.removeCommand(a),this.commands[a.name]=a,a.bindKey&&this._buildKeyHash(a)},this.removeCommand=function(a){var b=typeof a=="string"?a:a.name;a=this.commands[b],delete this.commands[b];var c=this.commmandKeyBinding;for(var d in c)for(var e in c[d])c[d][e]==a&&delete c[d][e]},this.bindKey=function(a,b){if(!a)return;var c=this.commmandKeyBinding;a.split("|").forEach(function(a){var d=this.parseKeys(a,b),e=d.hashId;(c[e]||(c[e]={}))[d.key]=b},this)},this.addCommands=function(a){a&&Object.keys(a).forEach(function(b){var c=a[b];if(typeof c=="string")return this.bindKey(c,b);typeof c=="function"&&(c={exec:c}),c.name||(c.name=b),this.addCommand(c)},this)},this.removeCommands=function(a){Object.keys(a).forEach(function(b){this.removeCommand(a[b])},this)},this.bindKeys=function(a){Object.keys(a).forEach(function(b){this.bindKey(b,a[b])},this)},this._buildKeyHash=function(a){var b=a.bindKey;if(!b)return;var c=typeof b=="string"?b:b[this.platform];this.bindKey(c,a)},this.parseKeys=function(a,b){var c,e=0,f=a.toLowerCase().trim().split(/\s*\-\s*/);for(var g=0,h=f.length;g<h;g++)d.KEY_MODS[f[g]]?e|=d.KEY_MODS[f[g]]:c=f[g]||"-";return{key:c,hashId:e}},this.findKeyCommand=function(b,c){var d=this.commmandKeyBinding;return d[b]&&d[b][c.toLowerCase()]},this.handleKeyboard=function(a,b,c,d){return{command:this.findKeyCommand(b,c)}}}).call(e.prototype),b.HashHandler=e}),define("ace/undomanager",["require","exports","module"],function(a,b,c){"use strict";var d=function(){this.reset()};(function(){this.execute=function(a){var b=a.args[0];this.$doc=a.args[1],this.$undoStack.push(b),this.$redoStack=[]},this.undo=function(a){var b=this.$undoStack.pop(),c=null;return b&&(c=this.$doc.undoChanges(b,a),this.$redoStack.push(b)),c},this.redo=function(a){var b=this.$redoStack.pop(),c=null;return b&&(c=this.$doc.redoChanges(b,a),this.$undoStack.push(b)),c},this.reset=function(){this.$undoStack=[],this.$redoStack=[]},this.hasUndo=function(){return this.$undoStack.length>0},this.hasRedo=function(){return this.$redoStack.length>0}}).call(d.prototype),b.UndoManager=d}),define("ace/virtual_renderer",["require","exports","module","ace/lib/oop","ace/lib/dom","ace/lib/event","ace/lib/useragent","ace/config","ace/lib/net","ace/layer/gutter","ace/layer/marker","ace/layer/text","ace/layer/cursor","ace/scrollbar","ace/renderloop","ace/lib/event_emitter","text!ace/css/editor.css"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/dom"),f=a("./lib/event"),g=a("./lib/useragent"),h=a("./config"),i=a("./lib/net"),j=a("./layer/gutter").Gutter,k=a("./layer/marker").Marker,l=a("./layer/text").Text,m=a("./layer/cursor").Cursor,n=a("./scrollbar").ScrollBar,o=a("./renderloop").RenderLoop,p=a("./lib/event_emitter").EventEmitter,q=a("text!./css/editor.css");e.importCssString(q,"ace_editor");var r=function(a,b){var c=this;this.container=a,this.$keepTextAreaAtCursor=!g.isIE,e.addCssClass(a,"ace_editor"),this.setTheme(b),this.$gutter=e.createElement("div"),this.$gutter.className="ace_gutter",this.container.appendChild(this.$gutter),this.scroller=e.createElement("div"),this.scroller.className="ace_scroller",this.container.appendChild(this.scroller),this.content=e.createElement("div"),this.content.className="ace_content",this.scroller.appendChild(this.content),this.setHighlightGutterLine(!0),this.$gutterLayer=new j(this.$gutter),this.$gutterLayer.on("changeGutterWidth",this.onResize.bind(this,!0)),this.setFadeFoldWidgets(!0),this.$markerBack=new k(this.content);var d=this.$textLayer=new l(this.content);this.canvas=d.element,this.$markerFront=new k(this.content),this.characterWidth=d.getCharacterWidth(),this.lineHeight=d.getLineHeight(),this.$cursorLayer=new m(this.content),this.$cursorPadding=8,this.$horizScroll=!1,this.$horizScrollAlwaysVisible=!1,this.$animatedScroll=!1,this.scrollBar=new n(a),this.scrollBar.addEventListener("scroll",function(a){c.$inScrollAnimation||c.session.setScrollTop(a.data)}),this.scrollTop=0,this.scrollLeft=0,f.addListener(this.scroller,"scroll",function(){var a=c.scroller.scrollLeft;c.scrollLeft=a,c.session.setScrollLeft(a),c.scroller.className=a==0?"ace_scroller":"ace_scroller horscroll"}),this.cursorPos={row:0,column:0},this.$textLayer.addEventListener("changeCharacterSize",function(){c.characterWidth=d.getCharacterWidth(),c.lineHeight=d.getLineHeight(),c.$updatePrintMargin(),c.onResize(!0),c.$loop.schedule(c.CHANGE_FULL)}),this.$size={width:0,height:0,scrollerHeight:0,scrollerWidth:0},this.layerConfig={width:1,padding:0,firstRow:0,firstRowScreen:0,lastRow:0,lineHeight:1,characterWidth:1,minHeight:1,maxHeight:1,offset:0,height:1},this.$loop=new o(this.$renderChanges.bind(this),this.container.ownerDocument.defaultView),this.$loop.schedule(this.CHANGE_FULL),this.setPadding(4),this.$updatePrintMargin()};(function(){this.showGutter=!0,this.CHANGE_CURSOR=1,this.CHANGE_MARKER=2,this.CHANGE_GUTTER=4,this.CHANGE_SCROLL=8,this.CHANGE_LINES=16,this.CHANGE_TEXT=32,this.CHANGE_SIZE=64,this.CHANGE_MARKER_BACK=128,this.CHANGE_MARKER_FRONT=256,this.CHANGE_FULL=512,this.CHANGE_H_SCROLL=1024,d.implement(this,p),this.setSession=function(a){this.session=a,this.scroller.className="ace_scroller",this.$cursorLayer.setSession(a),this.$markerBack.setSession(a),this.$markerFront.setSession(a),this.$gutterLayer.setSession(a),this.$textLayer.setSession(a),this.$loop.schedule(this.CHANGE_FULL)},this.updateLines=function(a,b){b===undefined&&(b=Infinity),this.$changedLines?(this.$changedLines.firstRow>a&&(this.$changedLines.firstRow=a),this.$changedLines.lastRow<b&&(this.$changedLines.lastRow=b)):this.$changedLines={firstRow:a,lastRow:b},this.$loop.schedule(this.CHANGE_LINES)},this.updateText=function(){this.$loop.schedule(this.CHANGE_TEXT)},this.updateFull=function(){this.$loop.schedule(this.CHANGE_FULL)},this.updateFontSize=function(){this.$textLayer.checkForSizeChanges()},this.onResize=function(a){var b=this.CHANGE_SIZE,c=this.$size,d=e.getInnerHeight(this.container);if(a||c.height!=d)c.height=d,this.scroller.style.height=d+"px",c.scrollerHeight=this.scroller.clientHeight,this.scrollBar.setHeight(c.scrollerHeight),this.session&&(this.session.setScrollTop(this.getScrollTop()),b|=this.CHANGE_FULL);var f=e.getInnerWidth(this.container);if(a||c.width!=f){c.width=f;var g=this.showGutter?this.$gutter.offsetWidth:0;this.scroller.style.left=g+"px",c.scrollerWidth=Math.max(0,f-g-this.scrollBar.getWidth()),this.scroller.style.width=c.scrollerWidth+"px";if(this.session.getUseWrapMode()&&this.adjustWrapLimit()||a)b|=this.CHANGE_FULL}this.$loop.schedule(b)},this.adjustWrapLimit=function(){var a=this.$size.scrollerWidth-this.$padding*2,b=Math.floor(a/this.characterWidth);return this.session.adjustWrapLimit(b)},this.setAnimatedScroll=function(a){this.$animatedScroll=a},this.getAnimatedScroll=function(){return this.$animatedScroll},this.setShowInvisibles=function(a){this.$textLayer.setShowInvisibles(a)&&this.$loop.schedule(this.CHANGE_TEXT)},this.getShowInvisibles=function(){return this.$textLayer.showInvisibles},this.$showPrintMargin=!0,this.setShowPrintMargin=function(a){this.$showPrintMargin=a,this.$updatePrintMargin()},this.getShowPrintMargin=function(){return this.$showPrintMargin},this.$printMarginColumn=80,this.setPrintMarginColumn=function(a){this.$printMarginColumn=a,this.$updatePrintMargin()},this.getPrintMarginColumn=function(){return this.$printMarginColumn},this.getShowGutter=function(){return this.showGutter},this.setShowGutter=function(a){if(this.showGutter===a)return;this.$gutter.style.display=a?"block":"none",this.showGutter=a,this.onResize(!0)},this.getFadeFoldWidgets=function(){return e.hasCssClass(this.$gutter,"ace_fade-fold-widgets")},this.setFadeFoldWidgets=function(a){a?e.addCssClass(this.$gutter,"ace_fade-fold-widgets"):e.removeCssClass(this.$gutter,"ace_fade-fold-widgets")},this.$highlightGutterLine=!1,this.setHighlightGutterLine=function(a){if(this.$highlightGutterLine==a)return;this.$highlightGutterLine=a;if(!this.$gutterLineHighlight){this.$gutterLineHighlight=e.createElement("div"),this.$gutterLineHighlight.className="ace_gutter_active_line",this.$gutter.appendChild(this.$gutterLineHighlight);return}this.$gutterLineHighlight.style.display=a?"":"none",this.$updateGutterLineHighlight()},this.getHighlightGutterLine=function(){return this.$highlightGutterLine},this.$updateGutterLineHighlight=function(){this.$gutterLineHighlight.style.top=this.$cursorLayer.$pixelPos.top+"px",this.$gutterLineHighlight.style.height=this.layerConfig.lineHeight+"px"},this.$updatePrintMargin=function(){var a;if(!this.$showPrintMargin&&!this.$printMarginEl)return;this.$printMarginEl||(a=e.createElement("div"),a.className="ace_print_margin_layer",this.$printMarginEl=e.createElement("div"),this.$printMarginEl.className="ace_print_margin",a.appendChild(this.$printMarginEl),this.content.insertBefore(a,this.$textLayer.element));var b=this.$printMarginEl.style;b.left=this.characterWidth*this.$printMarginColumn+this.$padding+"px",b.visibility=this.$showPrintMargin?"visible":"hidden"},this.getContainerElement=function(){return this.container},this.getMouseEventTarget=function(){return this.content},this.getTextAreaContainer=function(){return this.container},this.$moveTextAreaToCursor=function(){if(!this.$keepTextAreaAtCursor)return;var a=this.$cursorLayer.$pixelPos.top,b=this.$cursorLayer.$pixelPos.left;a-=this.layerConfig.offset;if(a<0||a>this.layerConfig.height)return;b+=(this.showGutter?this.$gutterLayer.gutterWidth:0)-this.scrollLeft;var c=this.container.getBoundingClientRect();this.textarea.style.left=c.left+b+"px",this.textarea.style.top=c.top+a+"px"},this.getFirstVisibleRow=function(){return this.layerConfig.firstRow},this.getFirstFullyVisibleRow=function(){return this.layerConfig.firstRow+(this.layerConfig.offset===0?0:1)},this.getLastFullyVisibleRow=function(){var a=Math.floor((this.layerConfig.height+this.layerConfig.offset)/this.layerConfig.lineHeight);return this.layerConfig.firstRow-1+a},this.getLastVisibleRow=function(){return this.layerConfig.lastRow},this.$padding=null,this.setPadding=function(a){this.$padding=a,this.$textLayer.setPadding(a),this.$cursorLayer.setPadding(a),this.$markerFront.setPadding(a),this.$markerBack.setPadding(a),this.$loop.schedule(this.CHANGE_FULL),this.$updatePrintMargin()},this.getHScrollBarAlwaysVisible=function(){return this.$horizScrollAlwaysVisible},this.setHScrollBarAlwaysVisible=function(a){this.$horizScrollAlwaysVisible!=a&&(this.$horizScrollAlwaysVisible=a,(!this.$horizScrollAlwaysVisible||!this.$horizScroll)&&this.$loop.schedule(this.CHANGE_SCROLL))},this.$updateScrollBar=function(){this.scrollBar.setInnerHeight(this.layerConfig.maxHeight),this.scrollBar.setScrollTop(this.scrollTop)},this.$renderChanges=function(a){if(!a||!this.session||!this.container.offsetWidth)return;(a&this.CHANGE_FULL||a&this.CHANGE_SIZE||a&this.CHANGE_TEXT||a&this.CHANGE_LINES||a&this.CHANGE_SCROLL)&&this.$computeLayerConfig();if(a&this.CHANGE_H_SCROLL){this.scroller.scrollLeft=this.scrollLeft;var b=this.scroller.scrollLeft;this.scrollLeft=b,this.session.setScrollLeft(b)}if(a&this.CHANGE_FULL){this.$textLayer.checkForSizeChanges(),this.$updateScrollBar(),this.$textLayer.update(this.layerConfig),this.showGutter&&this.$gutterLayer.update(this.layerConfig),this.$markerBack.update(this.layerConfig),this.$markerFront.update(this.layerConfig),this.$cursorLayer.update(this.layerConfig),this.$moveTextAreaToCursor(),this.$highlightGutterLine&&this.$updateGutterLineHighlight();return}if(a&this.CHANGE_SCROLL){this.$updateScrollBar(),a&this.CHANGE_TEXT||a&this.CHANGE_LINES?this.$textLayer.update(this.layerConfig):this.$textLayer.scrollLines(this.layerConfig),this.showGutter&&this.$gutterLayer.update(this.layerConfig),this.$markerBack.update(this.layerConfig),this.$markerFront.update(this.layerConfig),this.$cursorLayer.update(this.layerConfig),this.$moveTextAreaToCursor(),this.$highlightGutterLine&&this.$updateGutterLineHighlight();return}a&this.CHANGE_TEXT?(this.$textLayer.update(this.layerConfig),this.showGutter&&this.$gutterLayer.update(this.layerConfig)):a&this.CHANGE_LINES?this.$updateLines()&&(this.$updateScrollBar(),this.showGutter&&this.$gutterLayer.update(this.layerConfig)):a&this.CHANGE_GUTTER&&this.showGutter&&this.$gutterLayer.update(this.layerConfig),a&this.CHANGE_CURSOR&&(this.$cursorLayer.update(this.layerConfig),this.$moveTextAreaToCursor(),this.$highlightGutterLine&&this.$updateGutterLineHighlight()),a&(this.CHANGE_MARKER|this.CHANGE_MARKER_FRONT)&&this.$markerFront.update(this.layerConfig),a&(this.CHANGE_MARKER|this.CHANGE_MARKER_BACK)&&this.$markerBack.update(this.layerConfig),a&this.CHANGE_SIZE&&this.$updateScrollBar()},this.$computeLayerConfig=function(){var a=this.session,b=this.scrollTop%this.lineHeight,c=this.$size.scrollerHeight+this.lineHeight,d=this.$getLongestLine(),e=this.$horizScrollAlwaysVisible||this.$size.scrollerWidth-d<0,f=this.$horizScroll!==e;this.$horizScroll=e,f&&(this.scroller.style.overflowX=e?"scroll":"hidden",e||this.session.setScrollLeft(0));var g=this.session.getScreenLength()*this.lineHeight;this.session.setScrollTop(Math.max(0,Math.min(this.scrollTop,g-this.$size.scrollerHeight)));var h=Math.ceil(c/this.lineHeight)-1,i=Math.max(0,Math.round((this.scrollTop-b)/this.lineHeight)),j=i+h,k,l,m={lineHeight:this.lineHeight};i=a.screenToDocumentRow(i,0);var n=a.getFoldLine(i);n&&(i=n.start.row),k=a.documentToScreenRow(i,0),l=a.getRowHeight(m,i),j=Math.min(a.screenToDocumentRow(j,0),a.getLength()-1),c=this.$size.scrollerHeight+a.getRowHeight(m,j)+l,b=this.scrollTop-k*this.lineHeight,this.layerConfig={width:d,padding:this.$padding,firstRow:i,firstRowScreen:k,lastRow:j,lineHeight:this.lineHeight,characterWidth:this.characterWidth,minHeight:c,maxHeight:g,offset:b,height:this.$size.scrollerHeight},this.$gutter.style.marginTop=-b+"px",this.content.style.marginTop=-b+"px",this.content.style.width=d+2*this.$padding+"px",this.content.style.height=c+"px",f&&this.onResize(!0)},this.$updateLines=function(){var a=this.$changedLines.firstRow,b=this.$changedLines.lastRow;this.$changedLines=null;var c=this.layerConfig;if(c.width!=this.$getLongestLine())return this.$textLayer.update(c);if(a>c.lastRow+1)return;if(b<c.firstRow)return;if(b===Infinity){this.showGutter&&this.$gutterLayer.update(c),this.$textLayer.update(c);return}return this.$textLayer.updateLines(c,a,b),!0},this.$getLongestLine=function(){var a=this.session.getScreenWidth();return this.$textLayer.showInvisibles&&(a+=1),Math.max(this.$size.scrollerWidth-2*this.$padding,Math.round(a*this.characterWidth))},this.updateFrontMarkers=function(){this.$markerFront.setMarkers(this.session.getMarkers(!0)),this.$loop.schedule(this.CHANGE_MARKER_FRONT)},this.updateBackMarkers=function(){this.$markerBack.setMarkers(this.session.getMarkers()),this.$loop.schedule(this.CHANGE_MARKER_BACK)},this.addGutterDecoration=function(a,b){this.$gutterLayer.addGutterDecoration(a,b),this.$loop.schedule(this.CHANGE_GUTTER)},this.removeGutterDecoration=function(a,b){this.$gutterLayer.removeGutterDecoration(a,b),this.$loop.schedule(this.CHANGE_GUTTER)},this.setBreakpoints=function(a){this.$gutterLayer.setBreakpoints(a),this.$loop.schedule(this.CHANGE_GUTTER)},this.setAnnotations=function(a){this.$gutterLayer.setAnnotations(a),this.$loop.schedule(this.CHANGE_GUTTER)},this.updateCursor=function(){this.$loop.schedule(this.CHANGE_CURSOR)},this.hideCursor=function(){this.$cursorLayer.hideCursor()},this.showCursor=function(){this.$cursorLayer.showCursor()},this.scrollSelectionIntoView=function(a,b,c){this.scrollCursorIntoView(a,c),this.scrollCursorIntoView(b,c)},this.scrollCursorIntoView=function(a,b){if(this.$size.scrollerHeight===0)return;var c=this.$cursorLayer.getPixelPosition(a),d=c.left,e=c.top;this.scrollTop>e?(b&&(e-=b*this.$size.scrollerHeight),this.session.setScrollTop(e)):this.scrollTop+this.$size.scrollerHeight<e+this.lineHeight&&(b&&(e+=b*this.$size.scrollerHeight),this.session.setScrollTop(e+this.lineHeight-this.$size.scrollerHeight));var f=this.scrollLeft;f>d?(d<this.$padding+2*this.layerConfig.characterWidth&&(d=0),this.session.setScrollLeft(d)):f+this.$size.scrollerWidth<d+this.characterWidth&&this.session.setScrollLeft(Math.round(d+this.characterWidth-this.$size.scrollerWidth))},this.getScrollTop=function(){return this.session.getScrollTop()},this.getScrollLeft=function(){return this.session.getScrollLeft()},this.getScrollTopRow=function(){return this.scrollTop/this.lineHeight},this.getScrollBottomRow=function(){return Math.max(0,Math.floor((this.scrollTop+this.$size.scrollerHeight)/this.lineHeight)-1)},this.scrollToRow=function(a){this.session.setScrollTop(a*this.lineHeight)},this.STEPS=8,this.$calcSteps=function(a,b){var c=0,d=this.STEPS,e=[],f=function(a,b,c){return c*(Math.pow(a-1,3)+1)+b};for(c=0;c<d;++c)e.push(f(c/this.STEPS,a,b-a));return e},this.scrollToLine=function(a,b,c,d){var e=this.$cursorLayer.getPixelPosition({row:a,column:0}),f=e.top;b&&(f-=this.$size.scrollerHeight/2);var g=this.scrollTop;this.session.setScrollTop(f),c!==!1&&this.animateScrolling(g,d)},this.animateScrolling=function(a,b){var c=this.scrollTop;if(this.$animatedScroll&&Math.abs(a-c)<1e5){var d=this,e=d.$calcSteps(a,c);this.$inScrollAnimation=!0,clearInterval(this.$timer),d.session.setScrollTop(e.shift()),this.$timer=setInterval(function(){e.length?(d.session.setScrollTop(e.shift()),d.session.$scrollTop=c):(this.$inScrollAnimation=!1,clearInterval(d.$timer),d.session.$scrollTop=-1,d.session.setScrollTop(c),b&&b())},10)}},this.scrollToY=function(a){this.scrollTop!==a&&(this.$loop.schedule(this.CHANGE_SCROLL),this.scrollTop=a)},this.scrollToX=function(a){a<=this.$padding&&(a=0),this.scrollLeft!==a&&(this.scrollLeft=a),this.$loop.schedule(this.CHANGE_H_SCROLL)},this.scrollBy=function(a,b){b&&this.session.setScrollTop(this.session.getScrollTop()+b),a&&this.session.setScrollLeft(this.session.getScrollLeft()+a)},this.isScrollableBy=function(a,b){if(b<0&&this.session.getScrollTop()>0)return!0;if(b>0&&this.session.getScrollTop()+this.$size.scrollerHeight<this.layerConfig.maxHeight)return!0},this.pixelToScreenCoordinates=function(a,b){var c=this.scroller.getBoundingClientRect(),d=(a+this.scrollLeft-c.left-this.$padding)/this.characterWidth,e=Math.floor((b+this.scrollTop-c.top)/this.lineHeight),f=Math.round(d);return{row:e,column:f,side:d-f>0?1:-1}},this.screenToTextCoordinates=function(a,b){var c=this.scroller.getBoundingClientRect(),d=Math.round((a+this.scrollLeft-c.left-this.$padding)/this.characterWidth),e=Math.floor((b+this.scrollTop-c.top)/this.lineHeight);return this.session.screenToDocumentPosition(e,Math.max(d,0))},this.textToScreenCoordinates=function(a,b){var c=this.scroller.getBoundingClientRect(),d=this.session.documentToScreenPosition(a,b),e=this.$padding+Math.round(d.column*this.characterWidth),f=d.row*this.lineHeight;return{pageX:c.left+e-this.scrollLeft,pageY:c.top+f-this.scrollTop}},this.visualizeFocus=function(){e.addCssClass(this.container,"ace_focus")},this.visualizeBlur=function(){e.removeCssClass(this.container,"ace_focus")},this.showComposition=function(a){this.$composition||(this.$composition=e.createElement("div"),this.$composition.className="ace_composition",this.content.appendChild(this.$composition)),this.$composition.innerHTML="&#160;";var b=this.$cursorLayer.getPixelPosition(),c=this.$composition.style;c.top=b.top+"px",c.left=b.left+this.$padding+"px",c.height=this.lineHeight+"px",this.hideCursor()},this.setCompositionText=function(a){e.setInnerText(this.$composition,a)},this.hideComposition=function(){this.showCursor();if(!this.$composition)return;var a=this.$composition.style;a.top="-10000px",a.left="-10000px"},this._loadTheme=function(a,b){if(!h.get("packaged"))return b();var c=a.split("/").pop(),d=h.get("themePath")+"/theme-"+c+h.get("suffix");i.loadScript(d,b)},this.setTheme=function(b){function h(a){e.importCssString(a.cssText,a.cssClass,c.container.ownerDocument),c.$theme&&e.removeCssClass(c.container,c.$theme),c.$theme=a?a.cssClass:null,c.$theme&&e.addCssClass(c.container,c.$theme),a&&a.isDark?e.addCssClass(c.container,"ace_dark"):e.removeCssClass(c.container,"ace_dark"),c.$size&&(c.$size.width=0,c.onResize())}var c=this;this.$themeValue=b;if(!b||typeof b=="string"){var d=b||"ace/theme/textmate",f;try{f=a(d)}catch(g){}if(f)return h(f);c._loadTheme(d,function(){a([d],function(a){if(c.$themeValue!==b)return;h(a)})})}else h(b)},this.getTheme=function(){return this.$themeValue},this.setStyle=function(b){e.addCssClass(this.container,b)},this.unsetStyle=function(b){e.removeCssClass(this.container,b)},this.destroy=function(){this.$textLayer.destroy(),this.$cursorLayer.destroy()}}).call(r.prototype),b.VirtualRenderer=r}),define("ace/layer/gutter",["require","exports","module","ace/lib/dom","ace/lib/oop","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("../lib/dom"),e=a("../lib/oop"),f=a("../lib/event_emitter").EventEmitter,g=function(a){this.element=d.createElement("div"),this.element.className="ace_layer ace_gutter-layer",a.appendChild(this.element),this.setShowFoldWidgets(this.$showFoldWidgets),this.gutterWidth=0,this.$breakpoints=[],this.$annotations=[],this.$decorations=[]};(function(){e.implement(this,f),this.setSession=function(a){this.session=a},this.addGutterDecoration=function(a,b){this.$decorations[a]||(this.$decorations[a]=""),this.$decorations[a]+=" "+b},this.removeGutterDecoration=function(a,b){this.$decorations[a]=this.$decorations[a].replace(" "+b,"")},this.setBreakpoints=function(a){this.$breakpoints=a.concat()},this.setAnnotations=function(a){this.$annotations=[];for(var b in a)if(a.hasOwnProperty(b)){var c=a[b];if(!c)continue;var d=this.$annotations[b]={text:[]};for(var e=0;e<c.length;e++){var f=c[e],g=f.text.replace(/"/g,"&quot;").replace(/'/g,"&#8217;").replace(/</,"&lt;");d.text.indexOf(g)===-1&&d.text.push(g);var h=f.type;h=="error"?d.className="ace_error":h=="warning"&&d.className!="ace_error"?d.className="ace_warning":h=="info"&&!d.className&&(d.className="ace_info")}}},this.update=function(a){this.$config=a;var b={className:"",text:[]},c=[],e=a.firstRow,f=a.lastRow,g=this.session.getNextFoldLine(e),h=g?g.start.row:Infinity,i=this.$showFoldWidgets&&this.session.foldWidgets;for(;;){e>h&&(e=g.end.row+1,g=this.session.getNextFoldLine(e,g),h=g?g.start.row:Infinity);if(e>f)break;var j=this.$annotations[e]||b;c.push("<div class='ace_gutter-cell",this.$decorations[e]||"",this.$breakpoints[e]?" ace_breakpoint ":" ",j.className,"' title='",j.text.join("\n"),"' style='height:",a.lineHeight,"px;'>",e+1);if(i){var k=i[e];k==null&&(k=i[e]=this.session.getFoldWidget(e)),k&&c.push("<span class='ace_fold-widget ",k,k=="start"&&e==h&&e<g.end.row?" closed":" open","'></span>")}var l=this.session.getRowLength(e)-1;while(l--)c.push("</div><div class='ace_gutter-cell' style='height:",a.lineHeight,"px'>¦");c.push("</div>"),e++}this.element=d.setInnerHtml(this.element,c.join("")),this.element.style.height=a.minHeight+"px";var m=this.element.offsetWidth;m!==this.gutterWidth&&(this.gutterWidth=m,this._emit("changeGutterWidth",m))},this.$showFoldWidgets=!0,this.setShowFoldWidgets=function(a){a?d.addCssClass(this.element,"ace_folding-enabled"):d.removeCssClass(this.element,"ace_folding-enabled"),this.$showFoldWidgets=a},this.getShowFoldWidgets=function(){return this.$showFoldWidgets}}).call(g.prototype),b.Gutter=g}),define("ace/layer/marker",["require","exports","module","ace/range","ace/lib/dom"],function(a,b,c){"use strict";var d=a("../range").Range,e=a("../lib/dom"),f=function(a){this.element=e.createElement("div"),this.element.className="ace_layer ace_marker-layer",a.appendChild(this.element)};(function(){this.$padding=0,this.setPadding=function(a){this.$padding=a},this.setSession=function(a){this.session=a},this.setMarkers=function(a){this.markers=a},this.update=function(a){var a=a||this.config;if(!a)return;this.config=a;var b=[];for(var c in this.markers){var d=this.markers[c],f=d.range.clipRows(a.firstRow,a.lastRow);if(f.isEmpty())continue;f=f.toScreenRange(this.session);if(d.renderer){var g=this.$getTop(f.start.row,a),h=Math.round(this.$padding+f.start.column*a.characterWidth);d.renderer(b,f,h,g,a)}else f.isMultiLine()?d.type=="text"?this.drawTextMarker(b,f,d.clazz,a):this.drawMultiLineMarker(b,f,d.clazz,a,d.type):this.drawSingleLineMarker(b,f,d.clazz+" start",a,null,d.type)}this.element=e.setInnerHtml(this.element,b.join(""))},this.$getTop=function(a,b){return(a-b.firstRowScreen)*b.lineHeight},this.drawTextMarker=function(a,b,c,e){var f=b.start.row,g=new d(f,b.start.column,f,this.session.getScreenLastRowColumn(f));this.drawSingleLineMarker(a,g,c+" start",e,1,"text"),f=b.end.row,g=new d(f,0,f,b.end.column),this.drawSingleLineMarker(a,g,c,e,0,"text");for(f=b.start.row+1;f<b.end.row;f++)g.start.row=f,g.end.row=f,g.end.column=this.session.getScreenLastRowColumn(f),this.drawSingleLineMarker(a,g,c,e,1,"text")},this.drawMultiLineMarker=function(a,b,c,d,e){var f=e==="background"?0:this.$padding,g=d.width+2*this.$padding-f,h=d.lineHeight,i=Math.round(g-b.start.column*d.characterWidth),j=this.$getTop(b.start.row,d),k=Math.round(f+b.start.column*d.characterWidth);a.push("<div class='",c," start' style='","height:",h,"px;","width:",i,"px;","top:",j,"px;","left:",k,"px;'></div>"),j=this.$getTop(b.end.row,d),i=Math.round(b.end.column*d.characterWidth),a.push("<div class='",c,"' style='","height:",h,"px;","width:",i,"px;","top:",j,"px;","left:",f,"px;'></div>"),h=(b.end.row-b.start.row-1)*d.lineHeight;if(h<0)return;j=this.$getTop(b.start.row+1,d),a.push("<div class='",c,"' style='","height:",h,"px;","width:",g,"px;","top:",j,"px;","left:",f,"px;'></div>")},this.drawSingleLineMarker=function(a,b,c,d,e,f){var g=f==="background"?0:this.$padding,h=d.lineHeight;if(f==="background")var i=d.width;else i=Math.round((b.end.column+(e||0)-b.start.column)*d.characterWidth);var j=this.$getTop(b.start.row,d),k=Math.round(g+b.start.column*d.characterWidth);a.push("<div class='",c,"' style='","height:",h,"px;","width:",i,"px;","top:",j,"px;","left:",k,"px;'></div>")}}).call(f.prototype),b.Marker=f}),define("ace/layer/text",["require","exports","module","ace/lib/oop","ace/lib/dom","ace/lib/lang","ace/lib/useragent","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../lib/dom"),f=a("../lib/lang"),g=a("../lib/useragent"),h=a("../lib/event_emitter").EventEmitter,i=function(a){this.element=e.createElement("div"),this.element.className="ace_layer ace_text-layer",a.appendChild(this.element),this.$characterSize=this.$measureSizes()||{width:0,height:0},this.$pollSizeChanges()};(function(){d.implement(this,h),this.EOF_CHAR="¶",this.EOL_CHAR="¬",this.TAB_CHAR="→",this.SPACE_CHAR="·",this.$padding=0,this.setPadding=function(a){this.$padding=a,this.element.style.padding="0 "+a+"px"},this.getLineHeight=function(){return this.$characterSize.height||1},this.getCharacterWidth=function(){return this.$characterSize.width||1},this.checkForSizeChanges=function(){var a=this.$measureSizes();a&&(this.$characterSize.width!==a.width||this.$characterSize.height!==a.height)&&(this.$characterSize=a,this._emit("changeCharacterSize",{data:a}))},this.$pollSizeChanges=function(){var a=this;this.$pollSizeChangesTimer=setInterval(function(){a.checkForSizeChanges()},500)},this.$fontStyles={fontFamily:1,fontSize:1,fontWeight:1,fontStyle:1,lineHeight:1},this.$measureSizes=g.isIE||g.isOldGecko?function(){var a=1e3;if(!this.$measureNode){var b=this.$measureNode=e.createElement("div"),c=b.style;c.width=c.height="auto",c.left=c.top=-a*40+"px",c.visibility="hidden",c.position="fixed",c.overflow="visible",c.whiteSpace="nowrap",b.innerHTML=f.stringRepeat("Xy",a);if(this.element.ownerDocument.body)this.element.ownerDocument.body.appendChild(b);else{var d=this.element.parentNode;while(!e.hasCssClass(d,"ace_editor"))d=d.parentNode;d.appendChild(b)}}if(!this.element.offsetWidth)return null;var c=this.$measureNode.style,g=e.computedStyle(this.element);for(var h in this.$fontStyles)c[h]=g[h];var i={height:this.$measureNode.offsetHeight,width:this.$measureNode.offsetWidth/(a*2)};return i.width==0||i.height==0?null:i}:function(){if(!this.$measureNode){var a=this.$measureNode=e.createElement("div"),b=a.style;b.width=b.height="auto",b.left=b.top="-100px",b.visibility="hidden",b.position="fixed",b.overflow="visible",b.whiteSpace="nowrap",a.innerHTML="X";var c=this.element.parentNode;while(c&&!e.hasCssClass(c,"ace_editor"))c=c.parentNode;if(!c)return this.$measureNode=null;c.appendChild(a)}var d=this.$measureNode.getBoundingClientRect(),f={height:d.height,width:d.width};return f.width==0||f.height==0?null:f},this.setSession=function(a){this.session=a},this.showInvisibles=!1,this.setShowInvisibles=function(a){return this.showInvisibles==a?!1:(this.showInvisibles=a,!0)},this.$tabStrings=[],this.$computeTabString=function(){var a=this.session.getTabSize(),b=this.$tabStrings=[0];for(var c=1;c<a+1;c++)this.showInvisibles?b.push("<span class='ace_invisible'>"+this.TAB_CHAR+(new Array(c)).join("&#160;")+"</span>"):b.push((new Array(c+1)).join("&#160;"))},this.updateLines=function(a,b,c){this.$computeTabString(),(this.config.lastRow!=a.lastRow||this.config.firstRow!=a.firstRow)&&this.scrollLines(a),this.config=a;var d=Math.max(b,a.firstRow),f=Math.min(c,a.lastRow),g=this.element.childNodes,h=0;for(var i=a.firstRow;i<d;i++){var j=this.session.getFoldLine(i);if(j){if(j.containsRow(d)){d=j.start.row;break}i=j.end.row}h++}for(var k=d;k<=f;k++){var l=g[h++];if(!l)continue;var m=[],n=this.session.getTokens(k,k);this.$renderLine(m,k,n[0].tokens,!this.$useLineGroups()),l=e.setInnerHtml(l,m.join("")),k=this.session.getRowFoldEnd(k)}},this.scrollLines=function(a){this.$computeTabString();var b=this.config;this.config=a;if(!b||b.lastRow<a.firstRow)return this.update(a);if(a.lastRow<b.firstRow)return this.update(a);var c=this.element;if(b.firstRow<a.firstRow)for(var d=this.session.getFoldedRowCount(b.firstRow,a.firstRow-1);d>0;d--)c.removeChild(c.firstChild);if(b.lastRow>a.lastRow)for(var d=this.session.getFoldedRowCount(a.lastRow+1,b.lastRow);d>0;d--)c.removeChild(c.lastChild);if(a.firstRow<b.firstRow){var e=this.$renderLinesFragment(a,a.firstRow,b.firstRow-1);c.firstChild?c.insertBefore(e,c.firstChild):c.appendChild(e)}if(a.lastRow>b.lastRow){var e=this.$renderLinesFragment(a,b.lastRow+1,a.lastRow);c.appendChild(e)}},this.$renderLinesFragment=function(a,b,c){var d=this.element.ownerDocument.createDocumentFragment(),f=b,g=this.session.getNextFoldLine(f),h=g?g.start.row:Infinity;for(;;){f>h&&(f=g.end.row+1,g=this.session.getNextFoldLine(f,g),h=g?g.start.row:Infinity);if(f>c)break;var i=e.createElement("div"),j=[],k=this.session.getTokens(f,f);k.length==1&&this.$renderLine(j,f,k[0].tokens,!1),i.innerHTML=j.join("");if(this.$useLineGroups())i.className="ace_line_group",d.appendChild(i);else{var l=i.childNodes;while(l.length)d.appendChild(l[0])}f++}return d},this.update=function(a){this.$computeTabString(),this.config=a;var b=[],c=a.firstRow,d=a.lastRow,f=c,g=this.session.getNextFoldLine(f),h=g?g.start.row:Infinity;for(;;){f>h&&(f=g.end.row+1,g=this.session.getNextFoldLine(f,g),h=g?g.start.row:Infinity);if(f>d)break;this.$useLineGroups()&&b.push("<div class='ace_line_group'>");var i=this.session.getTokens(f,f);i.length==1&&this.$renderLine(b,f,i[0].tokens,!1),this.$useLineGroups()&&b.push("</div>"),f++}this.element=e.setInnerHtml(this.element,b.join(""))},this.$textToken={text:!0,rparen:!0,lparen:!0},this.$renderToken=function(a,b,c,d){var e=this,f=/\t|&|<|( +)|([\u0000-\u0019\u00a0\u2000-\u200b\u2028\u2029\u3000])|[\u1100-\u115F\u11A3-\u11A7\u11FA-\u11FF\u2329-\u232A\u2E80-\u2E99\u2E9B-\u2EF3\u2F00-\u2FD5\u2FF0-\u2FFB\u3000-\u303E\u3041-\u3096\u3099-\u30FF\u3105-\u312D\u3131-\u318E\u3190-\u31BA\u31C0-\u31E3\u31F0-\u321E\u3220-\u3247\u3250-\u32FE\u3300-\u4DBF\u4E00-\uA48C\uA490-\uA4C6\uA960-\uA97C\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFAFF\uFE10-\uFE19\uFE30-\uFE52\uFE54-\uFE66\uFE68-\uFE6B\uFF01-\uFF60\uFFE0-\uFFE6]/g,g=function(a,c,d,f,g){if(c)return(new Array(a.length+1)).join("&#160;");if(a=="&")return"&#38;";if(a=="<")return"&#60;";if(a=="	"){var h=e.session.getScreenTabSize(b+f);return b+=h-1,e.$tabStrings[h]}if(a=="　"){var i=e.showInvisibles?"ace_cjk ace_invisible":"ace_cjk",j=e.showInvisibles?e.SPACE_CHAR:"";return b+=1,"<span class='"+i+"' style='width:"+e.config.characterWidth*2+"px'>"+j+"</span>"}return d?"<span class='ace_invisible ace_invalid'>"+e.SPACE_CHAR+"</span>":(b+=1,"<span class='ace_cjk' style='width:"+e.config.characterWidth*2+"px'>"+a+"</span>")},h=d.replace(f,g);if(!this.$textToken[c.type]){var i="ace_"+c.type.replace(/\./g," ace_"),j="";c.type=="fold"&&(j=" style='width:"+c.value.length*this.config.characterWidth+"px;' "),a.push("<span class='",i,"'",j,">",h,"</span>")}else a.push(h);return b+d.length},this.$renderLineCore=function(a,b,c,d,e){var f=0,g=0,h,i=0,j=this;!d||d.length==0?h=Number.MAX_VALUE:h=d[0],e||a.push("<div class='ace_line' style='height:",this.config.lineHeight,"px","'>");for(var k=0;k<c.length;k++){var l=c[k],m=l.value;if(f+m.length<h)i=j.$renderToken(a,i,l,m),f+=m.length;else{while(f+m.length>=h)i=j.$renderToken(a,i,l,m.substring(0,h-f)),m=m.substring(h-f),f=h,e||a.push("</div>","<div class='ace_line' style='height:",this.config.lineHeight,"px","'>"),g++,i=0,h=d[g]||Number.MAX_VALUE;m.length!=0&&(f+=m.length,i=j.$renderToken(a,i,l,m))}}this.showInvisibles&&(b!==this.session.getLength()-1?a.push("<span class='ace_invisible'>"+this.EOL_CHAR+"</span>"):a.push("<span class='ace_invisible'>"+this.EOF_CHAR+"</span>")),e||a.push("</div>")},this.$renderLine=function(a,b,c,d){if(!this.session.isRowFolded(b)){var e=this.session.getRowSplitData(b);this.$renderLineCore(a,b,c,e,d)}else this.$renderFoldLine(a,b,c,d)},this.$renderFoldLine=function(a,b,c,d){function h(a,b,c){var d=0,e=0;while(e+a[d].value.length<b){e+=a[d].value.length,d++;if(d==a.length)return}if(e!=b){var f=a[d].value.substring(b-e);f.length>c-b&&(f=f.substring(0,c-b)),g.push({type:a[d].type,value:f}),e=b+f.length,d+=1}while(e<c){var f=a[d].value;f.length+e>c&&(f=f.substring(0,c-e)),g.push({type:a[d].type,value:f}),e+=f.length,d+=1}}var e=this.session,f=e.getFoldLine(b),g=[];f.walk(function(a,b,d,e,f){a?g.push({type:"fold",value:a}):(f&&(c=this.session.getTokens(b,b)[0].tokens),c.length!=0&&h(c,e,d))}.bind(this),f.end.row,this.session.getLine(f.end.row).length);var i=this.session.$useWrapMode?this.session.$wrapData[b]:null;this.$renderLineCore(a,b,g,i,d)},this.$useLineGroups=function(){return this.session.getUseWrapMode()},this.destroy=function(){clearInterval(this.$pollSizeChangesTimer),this.$measureNode&&this.$measureNode.parentNode.removeChild(this.$measureNode),delete this.$measureNode}}).call(i.prototype),b.Text=i}),define("ace/layer/cursor",["require","exports","module","ace/lib/dom"],function(a,b,c){"use strict";var d=a("../lib/dom"),e=function(a){this.element=d.createElement("div"),this.element.className="ace_layer ace_cursor-layer",a.appendChild(this.element),this.isVisible=!1,this.cursors=[],this.cursor=this.addCursor()};(function(){this.$padding=0,this.setPadding=function(a){this.$padding=a},this.setSession=function(a){this.session=a},this.addCursor=function(){var a=d.createElement("div"),b="ace_cursor";return this.isVisible||(b+=" ace_hidden"),this.overwrite&&(b+=" ace_overwrite"),a.className=b,this.element.appendChild(a),this.cursors.push(a),a},this.removeCursor=function(){if(this.cursors.length>1){var a=this.cursors.pop();return a.parentNode.removeChild(a),a}},this.hideCursor=function(){this.isVisible=!1;for(var a=this.cursors.length;a--;)d.addCssClass(this.cursors[a],"ace_hidden");clearInterval(this.blinkId)},this.showCursor=function(){this.isVisible=!0;for(var a=this.cursors.length;a--;)d.removeCssClass(this.cursors[a],"ace_hidden");this.element.style.visibility="",this.restartTimer()},this.restartTimer=function(){clearInterval(this.blinkId);if(!this.isVisible)return;var a=this.cursors.length==1?this.cursor:this.element;this.blinkId=setInterval(function(){a.style.visibility="hidden",setTimeout(function(){a.style.visibility=""},400)},1e3)},this.getPixelPosition=function(a,b){if(!this.config||!this.session)return{left:0,top:0};a||(a=this.session.selection.getCursor());var c=this.session.documentToScreenPosition(a),d=Math.round(this.$padding+c.column*this.config.characterWidth),e=(c.row-(b?this.config.firstRowScreen:0))*this.config.lineHeight;return{left:d,top:e}},this.update=function(a){this.config=a;if(this.session.selectionMarkerCount>0){var b=this.session.$selectionMarkers,c=0,d,e=0;for(var c=b.length;c--;){d=b[c];var f=this.getPixelPosition(d.cursor,!0),g=(this.cursors[e++]||this.addCursor()).style;g.left=f.left+"px",g.top=f.top+"px",g.width=a.characterWidth+"px",g.height=a.lineHeight+"px"}if(e>1)while(this.cursors.length>e)this.removeCursor()}else{var f=this.getPixelPosition(null,!0),g=this.cursor.style;g.left=f.left+"px",g.top=f.top+"px",g.width=a.characterWidth+"px",g.height=a.lineHeight+"px";while(this.cursors.length>1)this.removeCursor()}var h=this.session.getOverwrite();h!=this.overwrite&&this.$setOverite(h),this.$pixelPos=f,this.restartTimer()},this.$setOverite=function(a){this.overwrite=a;for(var b=this.cursors.length;b--;)a?d.addCssClass(this.cursors[b],"ace_overwrite"):d.removeCssClass(this.cursors[b],"ace_overwrite")},this.destroy=function(){clearInterval(this.blinkId)}}).call(e.prototype),b.Cursor=e}),define("ace/scrollbar",["require","exports","module","ace/lib/oop","ace/lib/dom","ace/lib/event","ace/lib/event_emitter"],function(a,b,c){"use strict";var d=a("./lib/oop"),e=a("./lib/dom"),f=a("./lib/event"),g=a("./lib/event_emitter").EventEmitter,h=function(a){this.element=e.createElement("div"),this.element.className="ace_sb",this.inner=e.createElement("div"),this.element.appendChild(this.inner),a.appendChild(this.element),this.width=e.scrollbarWidth(a.ownerDocument),this.element.style.width=(this.width||15)+5+"px",f.addListener(this.element,"scroll",this.onScroll.bind(this))};(function(){d.implement(this,g),this.onScroll=function(){this._emit("scroll",{data:this.element.scrollTop})},this.getWidth=function(){return this.width},this.setHeight=function(a){this.element.style.height=a+"px"},this.setInnerHeight=function(a){this.inner.style.height=a+"px"},this.setScrollTop=function(a){this.element.scrollTop=a}}).call(h.prototype),b.ScrollBar=h}),define("ace/renderloop",["require","exports","module","ace/lib/event"],function(a,b,c){"use strict";var d=a("./lib/event"),e=function(a,b){this.onRender=a,this.pending=!1,this.changes=0,this.window=b||window};(function(){this.schedule=function(a){this.changes=this.changes|a;if(!this.pending){this.pending=!0;var b=this;d.nextTick(function(){b.pending=!1;var a;while(a=b.changes)b.changes=0,b.onRender(a)},this.window)}}}).call(e.prototype),b.RenderLoop=e}),define("text!ace/css/editor.css",[],"\n.ace_editor {\n    position: absolute;\n    overflow: hidden;\n    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Droid Sans Mono', 'Consolas', monospace;\n    font-size: 12px;\n}\n\n.ace_scroller {\n    position: absolute;\n    overflow-x: scroll;\n    overflow-y: hidden;\n}\n\n.ace_content {\n    position: absolute;\n    box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    -webkit-box-sizing: border-box;\n    cursor: text;\n}\n\n.ace_composition {\n    position: absolute;\n    background: #555;\n    color: #DDD;\n    z-index: 4;\n}\n\n.ace_gutter {\n    position: absolute;\n    overflow : hidden;\n    height: 100%;\n    width: auto;\n    cursor: default;\n    z-index: 1000;\n}\n\n.ace_gutter_active_line {\n    position: absolute;\n    right: 0;\n    width: 100%;\n}\n\n.ace_gutter.horscroll {\n    box-shadow: 0px 0px 20px rgba(0,0,0,0.4);\n}\n\n.ace_gutter-cell {\n    padding-left: 19px;\n    padding-right: 6px;\n}\n\n.ace_gutter-cell.ace_error {\n    background-image: url(\"data:image/gif,GIF89a%10%00%10%00%D5%00%00%F5or%F5%87%88%F5nr%F4ns%EBmq%F5z%7F%DDJT%DEKS%DFOW%F1Yc%F2ah%CE(7%CE)8%D18E%DD%40M%F2KZ%EBU%60%F4%60m%DCir%C8%16(%C8%19*%CE%255%F1%3FR%F1%3FS%E6%AB%B5%CA%5DI%CEn%5E%F7%A2%9A%C9G%3E%E0a%5B%F7%89%85%F5yy%F6%82%80%ED%82%80%FF%BF%BF%E3%C4%C4%FF%FF%FF%FF%FF%FF%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00!%F9%04%01%00%00%25%00%2C%00%00%00%00%10%00%10%00%00%06p%C0%92pH%2C%1A%8F%C8%D2H%93%E1d4%23%E4%88%D3%09mB%1DN%B48%F5%90%40%60%92G%5B%94%20%3E%22%D2%87%24%FA%20%24%C5%06A%00%20%B1%07%02B%A38%89X.v%17%82%11%13q%10%0Fi%24%0F%8B%10%7BD%12%0Ei%09%92%09%0EpD%18%15%24%0A%9Ci%05%0C%18F%18%0B%07%04%01%04%06%A0H%18%12%0D%14%0D%12%A1I%B3%B4%B5IA%00%3B\");\n    background-repeat: no-repeat;\n    background-position: 2px center;\n}\n\n.ace_gutter-cell.ace_warning {\n    background-image: url(\"data:image/gif,GIF89a%10%00%10%00%D5%00%00%FF%DBr%FF%DE%81%FF%E2%8D%FF%E2%8F%FF%E4%96%FF%E3%97%FF%E5%9D%FF%E6%9E%FF%EE%C1%FF%C8Z%FF%CDk%FF%D0s%FF%D4%81%FF%D5%82%FF%D5%83%FF%DC%97%FF%DE%9D%FF%E7%B8%FF%CCl%7BQ%13%80U%15%82W%16%81U%16%89%5B%18%87%5B%18%8C%5E%1A%94d%1D%C5%83-%C9%87%2F%C6%84.%C6%85.%CD%8B2%C9%871%CB%8A3%CD%8B5%DC%98%3F%DF%9BB%E0%9CC%E1%A5U%CB%871%CF%8B5%D1%8D6%DB%97%40%DF%9AB%DD%99B%E3%B0p%E7%CC%AE%FF%FF%FF%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00!%F9%04%01%00%00%2F%00%2C%00%00%00%00%10%00%10%00%00%06a%C0%97pH%2C%1A%8FH%A1%ABTr%25%87%2B%04%82%F4%7C%B9X%91%08%CB%99%1C!%26%13%84*iJ9(%15G%CA%84%14%01%1A%97%0C%03%80%3A%9A%3E%81%84%3E%11%08%B1%8B%20%02%12%0F%18%1A%0F%0A%03'F%1C%04%0B%10%16%18%10%0B%05%1CF%1D-%06%07%9A%9A-%1EG%1B%A0%A1%A0U%A4%A5%A6BA%00%3B\");\n    background-repeat: no-repeat;\n    background-position: 2px center;\n}\n\n.ace_gutter-cell.ace_info {\n    background-image: url(\"data:image/gif;base64,R0lGODlhEAAQAMQAAAAAAEFBQVJSUl5eXmRkZGtra39/f4WFhYmJiZGRkaampry8vMPDw8zMzNXV1dzc3OTk5Orq6vDw8P///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkAABQALAAAAAAQABAAAAUuICWOZGmeaBml5XGwFCQSBGyXRSAwtqQIiRuiwIM5BoYVbEFIyGCQoeJGrVptIQA7\");\n    background-repeat: no-repeat;\n    background-position: 2px center;\n}\n\n.ace_editor .ace_sb {\n    position: absolute;\n    overflow-x: hidden;\n    overflow-y: scroll;\n    right: 0;\n}\n\n.ace_editor .ace_sb div {\n    position: absolute;\n    width: 1px;\n    left: 0;\n}\n\n.ace_editor .ace_print_margin_layer {\n    z-index: 0;\n    position: absolute;\n    overflow: hidden;\n    margin: 0;\n    left: 0;\n    height: 100%;\n    width: 100%;\n}\n\n.ace_editor .ace_print_margin {\n    position: absolute;\n    height: 100%;\n}\n\n.ace_editor textarea {\n    position: fixed;\n    z-index: 0;\n    width: 0.5em;\n    height: 1em;\n    opacity: 0;\n    background: transparent;\n    appearance: none;\n    -moz-appearance: none;\n    border: none;\n    resize: none;\n    outline: none;\n    overflow: hidden;\n}\n\n.ace_layer {\n    z-index: 1;\n    position: absolute;\n    overflow: hidden;\n    white-space: nowrap;\n    height: 100%;\n    width: 100%;\n    box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    -webkit-box-sizing: border-box;\n    /* setting pointer-events: auto; on node under the mouse, which changes\n        during scroll, will break mouse wheel scrolling in Safari */\n    pointer-events: none;\n}\n\n.ace_gutter .ace_layer {\n    position: relative;\n    min-width: 40px;\n    text-align: right;\n    pointer-events: auto;\n}\n\n.ace_text-layer {\n    color: black;\n    font: inherit !important;\n}\n\n.ace_cjk {\n    display: inline-block;\n    text-align: center;\n}\n\n.ace_cursor-layer {\n    z-index: 4;\n}\n\n.ace_cursor {\n    z-index: 4;\n    position: absolute;\n}\n\n.ace_cursor.ace_hidden {\n    opacity: 0.2;\n}\n\n.ace_editor.multiselect .ace_cursor {\n    border-left-width: 1px;\n}\n\n.ace_line {\n    white-space: nowrap;\n}\n\n.ace_marker-layer .ace_step {\n    position: absolute;\n    z-index: 3;\n}\n\n.ace_marker-layer .ace_selection {\n    position: absolute;\n    z-index: 5;\n}\n\n.ace_marker-layer .ace_bracket {\n    position: absolute;\n    z-index: 6;\n}\n\n.ace_marker-layer .ace_active_line {\n    position: absolute;\n    z-index: 2;\n}\n\n.ace_marker-layer .ace_selected_word {\n    position: absolute;\n    z-index: 4;\n    box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    -webkit-box-sizing: border-box;\n}\n\n.ace_line .ace_fold {\n    box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    -webkit-box-sizing: border-box;\n    \n    display: inline-block;\n    height: 11px;\n    margin-top: -2px;\n    vertical-align: middle;\n\n    background-image: \n        url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%11%00%00%00%09%08%06%00%00%00%D4%E8%C7%0C%00%00%03%1EiCCPICC%20Profile%00%00x%01%85T%DFk%D3P%14%FE%DAe%9D%B0%E1%8B%3Ag%11%09%3Eh%91ndStC%9C%B6kW%BA%CDZ%EA6%B7!H%9B%A6m%5C%9A%C6%24%ED~%B0%07%D9%8Bo%3A%C5w%F1%07%3E%F9%07%0C%D9%83o%7B%92%0D%C6%14a%F8%AC%88%22L%F6%22%B3%9E%9B4M'S%03%B9%F7%BB%DF%F9%EE9'%E7%E4%5E%A0%F9qZ%D3%14%2F%0F%14USO%C5%C2%FC%C4%E4%14%DF%F2%01%5E%1CC%2B%FChM%8B%86%16J%26G%40%0F%D3%B2y%EF%B3%F3%0E%1E%C6lt%EEo%DF%AB%FEc%D5%9A%95%0C%11%F0%1C%20%BE%945%C4%22%E1Y%A0i%5C%D4t%13%E0%D6%89%EF%9D15%C2%CDLsX%A7%04%09%1Fg8oc%81%E1%8C%8D%23%96f45%40%9A%09%C2%07%C5B%3AK%B8%408%98i%E0%F3%0D%D8%CE%81%14%E4'%26%A9%92.%8B%3C%ABER%2F%E5dE%B2%0C%F6%F0%1Fs%83%F2_%B0%A8%94%E9%9B%AD%E7%10%8Dm%9A%19N%D1%7C%8A%DE%1F9%7Dp%8C%E6%00%D5%C1%3F_%18%BDA%B8%9DpX6%E3%A35~B%CD%24%AE%11%26%BD%E7%EEti%98%EDe%9A%97Y)%12%25%1C%24%BCbT%AE3li%E6%0B%03%89%9A%E6%D3%ED%F4P%92%B0%9F4%BF43Y%F3%E3%EDP%95%04%EB1%C5%F5%F6KF%F4%BA%BD%D7%DB%91%93%07%E35%3E%A7)%D6%7F%40%FE%BD%F7%F5r%8A%E5y%92%F0%EB%B4%1E%8D%D5%F4%5B%92%3AV%DB%DB%E4%CD%A6%23%C3%C4wQ%3F%03HB%82%8E%1Cd(%E0%91B%0Ca%9Ac%C4%AA%F8L%16%19%22J%A4%D2itTy%B28%D6%3B(%93%96%ED%1CGx%C9_%0E%B8%5E%16%F5%5B%B2%B8%F6%E0%FB%9E%DD%25%D7%8E%BC%15%85%C5%B7%A3%D8Q%ED%B5%81%E9%BA%B2%13%9A%1B%7Fua%A5%A3n%E17%B9%E5%9B%1Bm%AB%0B%08Q%FE%8A%E5%B1H%5Ee%CAO%82Q%D7u6%E6%90S%97%FCu%0B%CF2%94%EE%25v%12X%0C%BA%AC%F0%5E%F8*l%0AO%85%17%C2%97%BF%D4%C8%CE%DE%AD%11%CB%80q%2C%3E%AB%9ES%CD%C6%EC%25%D2L%D2%EBd%B8%BF%8A%F5B%C6%18%F9%901CZ%9D%BE%24M%9C%8A9%F2%DAP%0B'%06w%82%EB%E6%E2%5C%2F%D7%07%9E%BB%CC%5D%E1%FA%B9%08%AD.r%23%8E%C2%17%F5E%7C!%F0%BE3%BE%3E_%B7o%88a%A7%DB%BE%D3d%EB%A31Z%EB%BB%D3%91%BA%A2%B1z%94%8F%DB'%F6%3D%8E%AA%13%19%B2%B1%BE%B1~V%08%2B%B4%A2cjJ%B3tO%00%03%25mN%97%F3%05%93%EF%11%84%0B%7C%88%AE-%89%8F%ABbW%90O%2B%0Ao%99%0C%5E%97%0CI%AFH%D9.%B0%3B%8F%ED%03%B6S%D6%5D%E6i_s9%F3*p%E9%1B%FD%C3%EB.7U%06%5E%19%C0%D1s.%17%A03u%E4%09%B0%7C%5E%2C%EB%15%DB%1F%3C%9E%B7%80%91%3B%DBc%AD%3Dma%BA%8B%3EV%AB%DBt.%5B%1E%01%BB%0F%AB%D5%9F%CF%AA%D5%DD%E7%E4%7F%0Bx%A3%FC%06%A9%23%0A%D6%C2%A1_2%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%9A%9C%18%00%00%00%B5IDAT(%15%A5%91%3D%0E%02!%10%85ac%E1%05%D6%CE%D6%C6%CE%D2%E8%ED%CD%DE%C0%C6%D6N.%E0V%F8%3D%9Ca%891XH%C2%BE%D9y%3F%90!%E6%9C%C3%BFk%E5%011%C6-%F5%C8N%04%DF%BD%FF%89%DFt%83DN%60%3E%F3%AB%A0%DE%1A%5Dg%BE%10Q%97%1B%40%9C%A8o%10%8F%5E%828%B4%1B%60%87%F6%02%26%85%1Ch%1E%C1%2B%5Bk%FF%86%EE%B7j%09%9A%DA%9B%ACe%A3%F9%EC%DA!9%B4%D5%A6%81%86%86%98%CC%3C%5B%40%FA%81%B3%E9%CB%23%94%C16Azo%05%D4%E1%C1%95a%3B%8A'%A0%E8%CC%17%22%85%1D%BA%00%A2%FA%DC%0A%94%D1%D1%8D%8B%3A%84%17B%C7%60%1A%25Z%FC%8D%00%00%00%00IEND%AEB%60%82\"),\n        url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%05%00%00%007%08%06%00%00%00%C4%DD%80C%00%00%03%1EiCCPICC%20Profile%00%00x%01%85T%DFk%D3P%14%FE%DAe%9D%B0%E1%8B%3Ag%11%09%3Eh%91ndStC%9C%B6kW%BA%CDZ%EA6%B7!H%9B%A6m%5C%9A%C6%24%ED~%B0%07%D9%8Bo%3A%C5w%F1%07%3E%F9%07%0C%D9%83o%7B%92%0D%C6%14a%F8%AC%88%22L%F6%22%B3%9E%9B4M'S%03%B9%F7%BB%DF%F9%EE9'%E7%E4%5E%A0%F9qZ%D3%14%2F%0F%14USO%C5%C2%FC%C4%E4%14%DF%F2%01%5E%1CC%2B%FChM%8B%86%16J%26G%40%0F%D3%B2y%EF%B3%F3%0E%1E%C6lt%EEo%DF%AB%FEc%D5%9A%95%0C%11%F0%1C%20%BE%945%C4%22%E1Y%A0i%5C%D4t%13%E0%D6%89%EF%9D15%C2%CDLsX%A7%04%09%1Fg8oc%81%E1%8C%8D%23%96f45%40%9A%09%C2%07%C5B%3AK%B8%408%98i%E0%F3%0D%D8%CE%81%14%E4'%26%A9%92.%8B%3C%ABER%2F%E5dE%B2%0C%F6%F0%1Fs%83%F2_%B0%A8%94%E9%9B%AD%E7%10%8Dm%9A%19N%D1%7C%8A%DE%1F9%7Dp%8C%E6%00%D5%C1%3F_%18%BDA%B8%9DpX6%E3%A35~B%CD%24%AE%11%26%BD%E7%EEti%98%EDe%9A%97Y)%12%25%1C%24%BCbT%AE3li%E6%0B%03%89%9A%E6%D3%ED%F4P%92%B0%9F4%BF43Y%F3%E3%EDP%95%04%EB1%C5%F5%F6KF%F4%BA%BD%D7%DB%91%93%07%E35%3E%A7)%D6%7F%40%FE%BD%F7%F5r%8A%E5y%92%F0%EB%B4%1E%8D%D5%F4%5B%92%3AV%DB%DB%E4%CD%A6%23%C3%C4wQ%3F%03HB%82%8E%1Cd(%E0%91B%0Ca%9Ac%C4%AA%F8L%16%19%22J%A4%D2itTy%B28%D6%3B(%93%96%ED%1CGx%C9_%0E%B8%5E%16%F5%5B%B2%B8%F6%E0%FB%9E%DD%25%D7%8E%BC%15%85%C5%B7%A3%D8Q%ED%B5%81%E9%BA%B2%13%9A%1B%7Fua%A5%A3n%E17%B9%E5%9B%1Bm%AB%0B%08Q%FE%8A%E5%B1H%5Ee%CAO%82Q%D7u6%E6%90S%97%FCu%0B%CF2%94%EE%25v%12X%0C%BA%AC%F0%5E%F8*l%0AO%85%17%C2%97%BF%D4%C8%CE%DE%AD%11%CB%80q%2C%3E%AB%9ES%CD%C6%EC%25%D2L%D2%EBd%B8%BF%8A%F5B%C6%18%F9%901CZ%9D%BE%24M%9C%8A9%F2%DAP%0B'%06w%82%EB%E6%E2%5C%2F%D7%07%9E%BB%CC%5D%E1%FA%B9%08%AD.r%23%8E%C2%17%F5E%7C!%F0%BE3%BE%3E_%B7o%88a%A7%DB%BE%D3d%EB%A31Z%EB%BB%D3%91%BA%A2%B1z%94%8F%DB'%F6%3D%8E%AA%13%19%B2%B1%BE%B1~V%08%2B%B4%A2cjJ%B3tO%00%03%25mN%97%F3%05%93%EF%11%84%0B%7C%88%AE-%89%8F%ABbW%90O%2B%0Ao%99%0C%5E%97%0CI%AFH%D9.%B0%3B%8F%ED%03%B6S%D6%5D%E6i_s9%F3*p%E9%1B%FD%C3%EB.7U%06%5E%19%C0%D1s.%17%A03u%E4%09%B0%7C%5E%2C%EB%15%DB%1F%3C%9E%B7%80%91%3B%DBc%AD%3Dma%BA%8B%3EV%AB%DBt.%5B%1E%01%BB%0F%AB%D5%9F%CF%AA%D5%DD%E7%E4%7F%0Bx%A3%FC%06%A9%23%0A%D6%C2%A1_2%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%9A%9C%18%00%00%00%3AIDAT8%11c%FC%FF%FF%7F%18%03%1A%60%01%F2%3F%A0%891%80%04%FF%11-%F8%17%9BJ%E2%05%B1ZD%81v%26t%E7%80%F8%A3%82h%A12%1A%20%A3%01%02%0F%01%BA%25%06%00%19%C0%0D%AEF%D5%3ES%00%00%00%00IEND%AEB%60%82\");\n    background-repeat: no-repeat, repeat-x;\n    background-position: center center, top left;\n    color: transparent;\n\n    border: 1px solid black;\n    -moz-border-radius: 2px;\n    -webkit-border-radius: 2px;\n    border-radius: 2px;\n    \n    cursor: pointer;\n    pointer-events: auto;\n}\n\n.ace_dark .ace_fold {\n}\n\n.ace_fold:hover{\n    background-image: \n        url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%11%00%00%00%09%08%06%00%00%00%D4%E8%C7%0C%00%00%03%1EiCCPICC%20Profile%00%00x%01%85T%DFk%D3P%14%FE%DAe%9D%B0%E1%8B%3Ag%11%09%3Eh%91ndStC%9C%B6kW%BA%CDZ%EA6%B7!H%9B%A6m%5C%9A%C6%24%ED~%B0%07%D9%8Bo%3A%C5w%F1%07%3E%F9%07%0C%D9%83o%7B%92%0D%C6%14a%F8%AC%88%22L%F6%22%B3%9E%9B4M'S%03%B9%F7%BB%DF%F9%EE9'%E7%E4%5E%A0%F9qZ%D3%14%2F%0F%14USO%C5%C2%FC%C4%E4%14%DF%F2%01%5E%1CC%2B%FChM%8B%86%16J%26G%40%0F%D3%B2y%EF%B3%F3%0E%1E%C6lt%EEo%DF%AB%FEc%D5%9A%95%0C%11%F0%1C%20%BE%945%C4%22%E1Y%A0i%5C%D4t%13%E0%D6%89%EF%9D15%C2%CDLsX%A7%04%09%1Fg8oc%81%E1%8C%8D%23%96f45%40%9A%09%C2%07%C5B%3AK%B8%408%98i%E0%F3%0D%D8%CE%81%14%E4'%26%A9%92.%8B%3C%ABER%2F%E5dE%B2%0C%F6%F0%1Fs%83%F2_%B0%A8%94%E9%9B%AD%E7%10%8Dm%9A%19N%D1%7C%8A%DE%1F9%7Dp%8C%E6%00%D5%C1%3F_%18%BDA%B8%9DpX6%E3%A35~B%CD%24%AE%11%26%BD%E7%EEti%98%EDe%9A%97Y)%12%25%1C%24%BCbT%AE3li%E6%0B%03%89%9A%E6%D3%ED%F4P%92%B0%9F4%BF43Y%F3%E3%EDP%95%04%EB1%C5%F5%F6KF%F4%BA%BD%D7%DB%91%93%07%E35%3E%A7)%D6%7F%40%FE%BD%F7%F5r%8A%E5y%92%F0%EB%B4%1E%8D%D5%F4%5B%92%3AV%DB%DB%E4%CD%A6%23%C3%C4wQ%3F%03HB%82%8E%1Cd(%E0%91B%0Ca%9Ac%C4%AA%F8L%16%19%22J%A4%D2itTy%B28%D6%3B(%93%96%ED%1CGx%C9_%0E%B8%5E%16%F5%5B%B2%B8%F6%E0%FB%9E%DD%25%D7%8E%BC%15%85%C5%B7%A3%D8Q%ED%B5%81%E9%BA%B2%13%9A%1B%7Fua%A5%A3n%E17%B9%E5%9B%1Bm%AB%0B%08Q%FE%8A%E5%B1H%5Ee%CAO%82Q%D7u6%E6%90S%97%FCu%0B%CF2%94%EE%25v%12X%0C%BA%AC%F0%5E%F8*l%0AO%85%17%C2%97%BF%D4%C8%CE%DE%AD%11%CB%80q%2C%3E%AB%9ES%CD%C6%EC%25%D2L%D2%EBd%B8%BF%8A%F5B%C6%18%F9%901CZ%9D%BE%24M%9C%8A9%F2%DAP%0B'%06w%82%EB%E6%E2%5C%2F%D7%07%9E%BB%CC%5D%E1%FA%B9%08%AD.r%23%8E%C2%17%F5E%7C!%F0%BE3%BE%3E_%B7o%88a%A7%DB%BE%D3d%EB%A31Z%EB%BB%D3%91%BA%A2%B1z%94%8F%DB'%F6%3D%8E%AA%13%19%B2%B1%BE%B1~V%08%2B%B4%A2cjJ%B3tO%00%03%25mN%97%F3%05%93%EF%11%84%0B%7C%88%AE-%89%8F%ABbW%90O%2B%0Ao%99%0C%5E%97%0CI%AFH%D9.%B0%3B%8F%ED%03%B6S%D6%5D%E6i_s9%F3*p%E9%1B%FD%C3%EB.7U%06%5E%19%C0%D1s.%17%A03u%E4%09%B0%7C%5E%2C%EB%15%DB%1F%3C%9E%B7%80%91%3B%DBc%AD%3Dma%BA%8B%3EV%AB%DBt.%5B%1E%01%BB%0F%AB%D5%9F%CF%AA%D5%DD%E7%E4%7F%0Bx%A3%FC%06%A9%23%0A%D6%C2%A1_2%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%9A%9C%18%00%00%00%B5IDAT(%15%A5%91%3D%0E%02!%10%85ac%E1%05%D6%CE%D6%C6%CE%D2%E8%ED%CD%DE%C0%C6%D6N.%E0V%F8%3D%9Ca%891XH%C2%BE%D9y%3F%90!%E6%9C%C3%BFk%E5%011%C6-%F5%C8N%04%DF%BD%FF%89%DFt%83DN%60%3E%F3%AB%A0%DE%1A%5Dg%BE%10Q%97%1B%40%9C%A8o%10%8F%5E%828%B4%1B%60%87%F6%02%26%85%1Ch%1E%C1%2B%5Bk%FF%86%EE%B7j%09%9A%DA%9B%ACe%A3%F9%EC%DA!9%B4%D5%A6%81%86%86%98%CC%3C%5B%40%FA%81%B3%E9%CB%23%94%C16Azo%05%D4%E1%C1%95a%3B%8A'%A0%E8%CC%17%22%85%1D%BA%00%A2%FA%DC%0A%94%D1%D1%8D%8B%3A%84%17B%C7%60%1A%25Z%FC%8D%00%00%00%00IEND%AEB%60%82\"),\n        url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%05%00%00%007%08%06%00%00%00%C4%DD%80C%00%00%03%1EiCCPICC%20Profile%00%00x%01%85T%DFk%D3P%14%FE%DAe%9D%B0%E1%8B%3Ag%11%09%3Eh%91ndStC%9C%B6kW%BA%CDZ%EA6%B7!H%9B%A6m%5C%9A%C6%24%ED~%B0%07%D9%8Bo%3A%C5w%F1%07%3E%F9%07%0C%D9%83o%7B%92%0D%C6%14a%F8%AC%88%22L%F6%22%B3%9E%9B4M'S%03%B9%F7%BB%DF%F9%EE9'%E7%E4%5E%A0%F9qZ%D3%14%2F%0F%14USO%C5%C2%FC%C4%E4%14%DF%F2%01%5E%1CC%2B%FChM%8B%86%16J%26G%40%0F%D3%B2y%EF%B3%F3%0E%1E%C6lt%EEo%DF%AB%FEc%D5%9A%95%0C%11%F0%1C%20%BE%945%C4%22%E1Y%A0i%5C%D4t%13%E0%D6%89%EF%9D15%C2%CDLsX%A7%04%09%1Fg8oc%81%E1%8C%8D%23%96f45%40%9A%09%C2%07%C5B%3AK%B8%408%98i%E0%F3%0D%D8%CE%81%14%E4'%26%A9%92.%8B%3C%ABER%2F%E5dE%B2%0C%F6%F0%1Fs%83%F2_%B0%A8%94%E9%9B%AD%E7%10%8Dm%9A%19N%D1%7C%8A%DE%1F9%7Dp%8C%E6%00%D5%C1%3F_%18%BDA%B8%9DpX6%E3%A35~B%CD%24%AE%11%26%BD%E7%EEti%98%EDe%9A%97Y)%12%25%1C%24%BCbT%AE3li%E6%0B%03%89%9A%E6%D3%ED%F4P%92%B0%9F4%BF43Y%F3%E3%EDP%95%04%EB1%C5%F5%F6KF%F4%BA%BD%D7%DB%91%93%07%E35%3E%A7)%D6%7F%40%FE%BD%F7%F5r%8A%E5y%92%F0%EB%B4%1E%8D%D5%F4%5B%92%3AV%DB%DB%E4%CD%A6%23%C3%C4wQ%3F%03HB%82%8E%1Cd(%E0%91B%0Ca%9Ac%C4%AA%F8L%16%19%22J%A4%D2itTy%B28%D6%3B(%93%96%ED%1CGx%C9_%0E%B8%5E%16%F5%5B%B2%B8%F6%E0%FB%9E%DD%25%D7%8E%BC%15%85%C5%B7%A3%D8Q%ED%B5%81%E9%BA%B2%13%9A%1B%7Fua%A5%A3n%E17%B9%E5%9B%1Bm%AB%0B%08Q%FE%8A%E5%B1H%5Ee%CAO%82Q%D7u6%E6%90S%97%FCu%0B%CF2%94%EE%25v%12X%0C%BA%AC%F0%5E%F8*l%0AO%85%17%C2%97%BF%D4%C8%CE%DE%AD%11%CB%80q%2C%3E%AB%9ES%CD%C6%EC%25%D2L%D2%EBd%B8%BF%8A%F5B%C6%18%F9%901CZ%9D%BE%24M%9C%8A9%F2%DAP%0B'%06w%82%EB%E6%E2%5C%2F%D7%07%9E%BB%CC%5D%E1%FA%B9%08%AD.r%23%8E%C2%17%F5E%7C!%F0%BE3%BE%3E_%B7o%88a%A7%DB%BE%D3d%EB%A31Z%EB%BB%D3%91%BA%A2%B1z%94%8F%DB'%F6%3D%8E%AA%13%19%B2%B1%BE%B1~V%08%2B%B4%A2cjJ%B3tO%00%03%25mN%97%F3%05%93%EF%11%84%0B%7C%88%AE-%89%8F%ABbW%90O%2B%0Ao%99%0C%5E%97%0CI%AFH%D9.%B0%3B%8F%ED%03%B6S%D6%5D%E6i_s9%F3*p%E9%1B%FD%C3%EB.7U%06%5E%19%C0%D1s.%17%A03u%E4%09%B0%7C%5E%2C%EB%15%DB%1F%3C%9E%B7%80%91%3B%DBc%AD%3Dma%BA%8B%3EV%AB%DBt.%5B%1E%01%BB%0F%AB%D5%9F%CF%AA%D5%DD%E7%E4%7F%0Bx%A3%FC%06%A9%23%0A%D6%C2%A1_2%00%00%00%09pHYs%00%00%0B%13%00%00%0B%13%01%00%9A%9C%18%00%00%003IDAT8%11c%FC%FF%FF%7F%3E%03%1A%60%01%F2%3F%A3%891%80%04%FFQ%26%F8w%C0%B43%A1%DB%0C%E2%8F%0A%A2%85%CAh%80%8C%06%08%3C%04%E8%96%18%00%A3S%0D%CD%CF%D8%C1%9D%00%00%00%00IEND%AEB%60%82\");\n    background-repeat: no-repeat, repeat-x;\n    background-position: center center, top left;\n}\n\n.ace_dragging .ace_content {\n    cursor: move;\n}\n\n.ace_folding-enabled > .ace_gutter-cell {\n    padding-right: 13px;\n}\n\n.ace_fold-widget {\n    box-sizing: border-box;\n    -moz-box-sizing: border-box;\n    -webkit-box-sizing: border-box;\n\n    margin: 0 -12px 1px 1px;\n    display: inline-block;\n    height: 14px;\n    width: 11px;\n    vertical-align: text-bottom;\n    \n    background-image: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%05%00%00%00%05%08%06%00%00%00%8Do%26%E5%00%00%004IDATx%DAe%8A%B1%0D%000%0C%C2%F2%2CK%96%BC%D0%8F9%81%88H%E9%D0%0E%96%C0%10%92%3E%02%80%5E%82%E4%A9*-%EEsw%C8%CC%11%EE%96w%D8%DC%E9*Eh%0C%151(%00%00%00%00IEND%AEB%60%82\");\n    background-repeat: no-repeat;\n    background-position: center 5px;\n\n    border-radius: 3px;\n}\n\n.ace_fold-widget.end {\n    background-image: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%05%00%00%00%05%08%06%00%00%00%8Do%26%E5%00%00%004IDATx%DAm%C7%C1%09%000%08C%D1%8C%ECE%C8E(%8E%EC%02)%1EZJ%F1%C1'%04%07I%E1%E5%EE%CAL%F5%A2%99%99%22%E2%D6%1FU%B5%FE0%D9x%A7%26Wz5%0E%D5%00%00%00%00IEND%AEB%60%82\");\n}\n\n.ace_fold-widget.closed {\n    background-image: url(\"data:image/png,%89PNG%0D%0A%1A%0A%00%00%00%0DIHDR%00%00%00%03%00%00%00%06%08%06%00%00%00%06%E5%24%0C%00%00%009IDATx%DA5%CA%C1%09%000%08%03%C0%AC*(%3E%04%C1%0D%BA%B1%23%A4Uh%E0%20%81%C0%CC%F8%82%81%AA%A2%AArGfr%88%08%11%11%1C%DD%7D%E0%EE%5B%F6%F6%CB%B8%05Q%2F%E9tai%D9%00%00%00%00IEND%AEB%60%82\");\n}\n\n.ace_fold-widget:hover {\n    border: 1px solid rgba(0, 0, 0, 0.3);\n    background-color: rgba(255, 255, 255, 0.2);\n    -moz-box-shadow:inset 0 1px 1px rgba(255, 255, 255, 0.7);\n    -moz-box-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);\n    -webkit-box-shadow:inset 0 1px 1px rgba(255, 255, 255, 0.7);\n    -webkit-box-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);\n    box-shadow:inset 0 1px 1px rgba(255, 255, 255, 0.7);\n    box-shadow: 0 1px 1px rgba(255, 255, 255, 0.7);\n    background-position: center 4px;\n}\n\n.ace_fold-widget:active {\n    border: 1px solid rgba(0, 0, 0, 0.4);\n    background-color: rgba(0, 0, 0, 0.05);\n    -moz-box-shadow:inset 0 1px 1px rgba(255, 255, 255);\n    -moz-box-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);\n    -webkit-box-shadow:inset 0 1px 1px rgba(255, 255, 255);\n    -webkit-box-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);\n    box-shadow:inset 0 1px 1px rgba(255, 255, 255);\n    box-shadow: 0 1px 1px rgba(255, 255, 255, 0.8);\n}\n\n.ace_fold-widget.invalid {\n    background-color: #FFB4B4;\n    border-color: #DE5555;\n}\n\n.ace_fade-fold-widgets .ace_fold-widget {\n    -moz-transition: 0.5s opacity;\n    -webkit-transition: 0.5s opacity;\n    -o-transition: 0.5s opacity;\n    -ms-transition: 0.5s opacity;\n    transition: 0.5s opacity;\n    opacity: 0;\n}\n.ace_fade-fold-widgets:hover .ace_fold-widget {\n    -moz-transition-duration: 0.05s;\n    -webkit-transition-duration: 0.05s;\n    -o-transition-duration: 0.05s;\n    -ms-transition-duration: 0.05s;\n    transition-duration: 0.05s;\n    -moz-transition-delay: 0.2s;\n    -webkit-transition-delay: 0.2s;\n    -o-transition-delay: 0.2s;\n    -ms-transition-delay: 0.2s;\n    transition-delay: 0.2s;	\n    opacity:1;\n}\n"),define("ace/multi_select",["require","exports","module","ace/range_list","ace/range","ace/selection","ace/mouse/multi_select_handler","ace/lib/event","ace/commands/multi_select_commands","ace/search","ace/edit_session","ace/editor"],function(a,b,c){function k(a,b,c){return j.$options.wrap=!0,j.$options.needle=b,j.$options.backwards=c==-1,j.find(a)}function n(a,b){return a.row==b.row&&a.column==b.column}function o(a){a.$onAddRange=a.$onAddRange.bind(a),a.$onRemoveRange=a.$onRemoveRange.bind(a),a.$onMultiSelect=a.$onMultiSelect.bind(a),a.$onSingleSelect=a.$onSingleSelect.bind(a),b.onSessionChange.call(a,a),a.on("changeSession",b.onSessionChange.bind(a)),a.on("mousedown",g),a.commands.addCommands(b.commands.defaultCommands),p(a)}function p(a){function e(){c&&(d.style.cursor="",c=!1)}var b=a.textInput.getElement(),c=!1,d=a.renderer.content;h.addListener(b,"keydown",function(a){a.keyCode==18&&!(a.ctrlKey||a.shiftKey||a.metaKey)?c||(d.style.cursor="crosshair",c=!0):c&&(d.style.cursor="")}),h.addListener(b,"keyup",e),h.addListener(b,"blur",e)}var d=a("./range_list").RangeList,e=a("./range").Range,f=a("./selection").Selection,g=a("./mouse/multi_select_handler").onMouseDown,h=a("./lib/event");b.commands=a("./commands/multi_select_commands");var i=a("./search").Search,j=new i,l=a("./edit_session").EditSession;(function(){this.getSelectionMarkers=function(){return this.$selectionMarkers}}).call(l.prototype),function(){this.ranges=null,this.rangeList=null,this.addRange=function(a,b){if(!a)return;if(!this.inMultiSelectMode&&this.rangeCount==0){var c=this.toOrientedRange();if(a.intersects(c))return b||this.fromOrientedRange(a);this.rangeList.add(c),this.$onAddRange(c)}a.cursor||(a.cursor=a.end);var d=this.rangeList.add(a);return this.$onAddRange(a),d.length&&this.$onRemoveRange(d),this.rangeCount>1&&!this.inMultiSelectMode&&(this._emit("multiSelect"),this.inMultiSelectMode=!0,this.session.$undoSelect=!1,this.rangeList.attach(this.session)),b||this.fromOrientedRange(a)},this.toSingleRange=function(a){a=a||this.ranges[0];var b=this.rangeList.removeAll();b.length&&this.$onRemoveRange(b),a&&this.fromOrientedRange(a)},this.substractPoint=function(a){var b=this.rangeList.substractPoint(a);if(b)return this.$onRemoveRange(b),b[0]},this.mergeOverlappingRanges=function(){var a=this.rangeList.merge();a.length?this.$onRemoveRange(a):this.ranges[0]&&this.fromOrientedRange(this.ranges[0])},this.$onAddRange=function(a){this.rangeCount=this.rangeList.ranges.length,this.ranges.unshift(a),this._emit("addRange",{range:a})},this.$onRemoveRange=function(a){this.rangeCount=this.rangeList.ranges.length;if(this.rangeCount==1&&this.inMultiSelectMode){var b=this.rangeList.ranges.pop();a.push(b),this.rangeCount=0}for(var c=a.length;c--;){var d=this.ranges.indexOf(a[c]);this.ranges.splice(d,1)}this._emit("removeRange",{ranges:a}),this.rangeCount==0&&this.inMultiSelectMode&&(this.inMultiSelectMode=!1,this._emit("singleSelect"),this.session.$undoSelect=!0,this.rangeList.detach(this.session)),b=b||this.ranges[0],b&&!b.isEqual(this.getRange())&&this.fromOrientedRange(b)},this.$initRangeList=function(){if(this.rangeList)return;this.rangeList=new d,this.ranges=[],this.rangeCount=0},this.getAllRanges=function(){return this.rangeList.ranges.concat()},this.splitIntoLines=function(){if(this.rangeCount>1){var a=this.rangeList.ranges,b=a[a.length-1],c=e.fromPoints(a[0].start,b.end);this.toSingleRange(),this.setSelectionRange(c,b.cursor==b.start)}else{var c=this.getRange(),d=c.start.row,f=c.end.row;if(d==f)return;var g=[],h=this.getLineRange(d,!0);h.start.column=c.start.column,g.push(h);for(var i=d+1;i<f;i++)g.push(this.getLineRange(i,!0));h=this.getLineRange(f,!0),h.end.column=c.end.column,g.push(h),g.forEach(this.addRange,this)}},this.toggleBlockSelection=function(){if(this.rangeCount>1){var a=this.rangeList.ranges,b=a[a.length-1],c=e.fromPoints(a[0].start,b.end);this.toSingleRange(),this.setSelectionRange(c,b.cursor==b.start)}else{var d=this.session.documentToScreenPosition(this.selectionLead),f=this.session.documentToScreenPosition(this.selectionAnchor),g=this.rectangularRangeBlock(d,f);g.forEach(this.addRange,this)}},this.rectangularRangeBlock=function(a,b,c){var d=[],f=a.column<b.column;if(f)var g=a.column,h=b.column;else var g=b.column,h=a.column;var i=a.row<b.row;if(i)var j=a.row,k=b.row;else var j=b.row,k=a.row;g<0&&(g=0),j<0&&(j=0),j==k&&(c=!0);for(var l=j;l<=k;l++){var m=e.fromPoints(this.session.screenToDocumentPosition(l,g),this.session.screenToDocumentPosition(l,h));if(m.isEmpty()){if(o&&n(m.end,o))break;var o=m.end}m.cursor=f?m.start:m.end,d.push(m)}i&&d.reverse();if(!c){var p=d.length-1;while(d[p].isEmpty()&&p>0)p--;if(p>0){var q=0;while(d[q].isEmpty())q++}for(var r=p;r>=q;r--)d[r].isEmpty()&&d.splice(r,1)}return d}}.call(f.prototype);var m=a("./editor").Editor;(function(){this.updateSelectionMarkers=function(){this.renderer.updateCursor(),this.renderer.updateBackMarkers()},this.addSelectionMarker=function(a){a.cursor||(a.cursor=a.end);var b=this.getSelectionStyle();return a.marker=this.session.addMarker(a,"ace_selection",b),this.session.$selectionMarkers.push(a),this.session.selectionMarkerCount=this.session.$selectionMarkers.length,a},this.removeSelectionMarker=function(a){if(!a.marker)return;this.session.removeMarker(a.marker);var b=this.session.$selectionMarkers.indexOf(a);b!=-1&&this.session.$selectionMarkers.splice(b,1),this.session.selectionMarkerCount=this.session.$selectionMarkers.length},this.removeSelectionMarkers=function(a){var b=this.session.$selectionMarkers;for(var c=a.length;c--;){var d=a[c];if(!d.marker)continue;this.session.removeMarker(d.marker);var e=b.indexOf(d);e!=-1&&b.splice(e,1)}this.session.selectionMarkerCount=b.length},this.$onAddRange=function(a){this.addSelectionMarker(a.range),this.renderer.updateCursor(),this.renderer.updateBackMarkers()},this.$onRemoveRange=function(a){this.removeSelectionMarkers(a.ranges),this.renderer.updateCursor(),this.renderer.updateBackMarkers()},this.$onMultiSelect=function(a){if(this.inMultiSelectMode)return;this.inMultiSelectMode=!0,this.setStyle("multiselect"),this.keyBinding.addKeyboardHandler(b.commands.keyboardHandler),this.commands.on("exec",this.$onMultiSelectExec),this.renderer.updateCursor(),this.renderer.updateBackMarkers()},this.$onSingleSelect=function(a){if(this.session.multiSelect.inVirtualMode)return;this.inMultiSelectMode=!1,this.unsetStyle("multiselect"),this.keyBinding.removeKeyboardHandler(b.commands.keyboardHandler),this.commands.removeEventListener("exec",this.$onMultiSelectExec),this.renderer.updateCursor(),this.renderer.updateBackMarkers()},this.$onMultiSelectExec=function(a){var b=a.command,c=a.editor;b.multiSelectAction?b.multiSelectAction=="forEach"?c.forEachSelection(b,a.args):b.multiSelectAction=="single"?(c.exitMultiSelectMode(),b.exec(c,a.args||{})):b.multiSelectAction(c,a.args||{}):(b.exec(c,a.args||{}),c.multiSelect.addRange(c.multiSelect.toOrientedRange()),c.multiSelect.mergeOverlappingRanges()),a.preventDefault()},this.forEachSelection=function(a,b){if(this.inVirtualSelectionMode)return;var c=this.session,d=this.selection,e=d.rangeList,g=d._eventRegistry;d._eventRegistry={};var h=new f(c);this.inVirtualSelectionMode=!0;for(var i=e.ranges.length;i--;)h.fromOrientedRange(e.ranges[i]),this.selection=c.selection=h,a.exec(this,b||{}),h.toOrientedRange(e.ranges[i]);h.detach(),this.selection=c.selection=d,this.inVirtualSelectionMode=!1,d._eventRegistry=g,d.mergeOverlappingRanges(),this.onCursorChange(),this.onSelectionChange()},this.exitMultiSelectMode=function(){if(this.inVirtualSelectionMode)return;this.multiSelect.toSingleRange()},this.getCopyText=function(){var a="";if(this.inMultiSelectMode){var b=this.multiSelect.rangeList.ranges;a=[];for(var c=0;c<b.length;c++)a.push(this.session.getTextRange(b[c]));a=a.join(this.session.getDocument().getNewLineCharacter())}else this.selection.isEmpty()||(a=this.session.getTextRange(this.getSelectionRange()));return a},this.onPaste=function(a){this._emit("paste",a);if(!this.inMultiSelectMode)return this.insert(a);var b=a.split(this.session.getDocument().getNewLineCharacter()),c=this.selection.rangeList.ranges;if(b.length>c.length){this.commands.exec("insertstring",this,a);return}for(var d=c.length;d--;){var e=c[d];e.isEmpty()||this.session.remove(e),this.session.insert(e.start,b[d])}},this.findAll=function(a,b,c){b=b||{},b.needle=a||b.needle,this.$search.set(b);var d=this.$search.findAll(this.session);if(!d.length)return 0;this.$blockScrolling+=1;var e=this.multiSelect;c||e.toSingleRange(d[0]);for(var f=d.length;f--;)e.addRange(d[f],!0);return this.$blockScrolling-=1,d.length},this.selectMoreLines=function(a,b){var c=this.selection.toOrientedRange(),d=c.cursor==c.end,f=this.session.documentToScreenPosition(c.cursor);this.selection.$desiredColumn&&(f.column=this.selection.$desiredColumn);var g=this.session.screenToDocumentPosition(f.row+a,f.column);if(!c.isEmpty())var h=this.session.documentToScreenPosition(d?c.end:c.start),i=this.session.screenToDocumentPosition(h.row+a,h.column);else var i=g;if(d){var j=e.fromPoints(g,i);j.cursor=j.start}else{var j=e.fromPoints(i,g);j.cursor=j.end}j.desiredColumn=f.column;if(!this.selection.inMultiSelectMode)this.selection.addRange(c);else if(b)var k=c.cursor;this.selection.addRange(j),k&&this.selection.substractPoint(k)},this.transposeSelections=function(a){var b=this.session,c=b.multiSelect,d=c.ranges;for(var e=d.length;e--;){var f=d[e];if(f.isEmpty()){var g=b.getWordRange(f.start.row,f.start.column);f.start.row=g.start.row,f.start.column=g.start.column,f.end.row=g.end.row,f.end.column=g.end.column}}c.mergeOverlappingRanges();var h=[];for(var e=d.length;e--;){var f=d[e];h.unshift(b.getTextRange(f))}a<0?h.unshift(h.pop()):h.push(h.shift());for(var e=d.length;e--;){var f=d[e],g=f.clone();b.replace(f,h[e]),f.start.row=g.start.row,f.start.column=g.start.column}},this.selectMore=function(a,b){var c=this.session,d=c.multiSelect,e=d.toOrientedRange();if(e.isEmpty()){var e=c.getWordRange(e.start.row,e.start.column);e.cursor=e.end,this.multiSelect.addRange(e)}var f=c.getTextRange(e),g=k(c,f,a);g&&(g.cursor=a==-1?g.start:g.end,this.multiSelect.addRange(g)),b&&this.multiSelect.substractPoint(e.cursor)}}).call(m.prototype),b.onSessionChange=function(a){var b=a.session;b.multiSelect||(b.$selectionMarkers=[],b.selection.$initRangeList(),b.multiSelect=b.selection),this.multiSelect=b.multiSelect;var c=a.oldSession;c&&(c.multiSelect&&c.multiSelect.editor==this&&(c.multiSelect.editor=null),b.multiSelect.removeEventListener("addRange",this.$onAddRange),b.multiSelect.removeEventListener("removeRange",this.$onRemoveRange),b.multiSelect.removeEventListener("multiSelect",this.$onMultiSelect),b.multiSelect.removeEventListener("singleSelect",this.$onSingleSelect)),b.multiSelect.on("addRange",this.$onAddRange),b.multiSelect.on("removeRange",this.$onRemoveRange),b.multiSelect.on("multiSelect",this.$onMultiSelect),b.multiSelect.on("singleSelect",this.$onSingleSelect),this.inMultiSelectMode!=b.selection.inMultiSelectMode&&(b.selection.inMultiSelectMode?this.$onMultiSelect():this.$onSingleSelect())},b.MultiSelect=o}),define("ace/range_list",["require","exports","module"],function(a,b,c){"use strict";var d=function(){this.ranges=[]};(function(){this.comparePoints=function(a,b){return a.row-b.row||a.column-b.column},this.pointIndex=function(a,b){var c=this.ranges;for(var d=b||0;d<c.length;d++){var e=c[d],f=this.comparePoints(a,e.end);if(f>0)continue;return f==0?d:(f=this.comparePoints(a,e.start),f>=0?d:-d-1)}return-d-1},this.add=function(a){var b=this.pointIndex(a.start);b<0&&(b=-b-1);var c=this.pointIndex(a.end,b);return c<0?c=-c-1:c++,this.ranges.splice(b,c-b,a)},this.addList=function(a){var b=[];for(var c=a.length;c--;)b.push.call(b,this.add(a[c]));return b},this.substractPoint=function(a){var b=this.pointIndex(a);if(b>=0)return this.ranges.splice(b,1)},this.merge=function(){var a=[],b=this.ranges,c=b[0],d;for(var e=1;e<b.length;e++){d=c,c=b[e];var f=this.comparePoints(d.end,c.start);if(f<0)continue;if(f==0&&!d.isEmpty()&&!c.isEmpty())continue;this.comparePoints(d.end,c.end)<0&&(d.end.row=c.end.row,d.end.column=c.end.column),b.splice(e,1),a.push(c),c=d,e--}return a},this.contains=function(a,b){return this.pointIndex({row:a,column:b})>=0},this.containsPoint=function(a){return this.pointIndex(a)>=0},this.rangeAtPoint=function(a){var b=this.pointIndex(a);if(b>=0)return this.ranges[b]},this.clipRows=function(a,b){var c=this.ranges;if(c[0].start.row>b||c[c.length-1].start.row<a)return[];var d=this.pointIndex({row:a,column:0});d<0&&(d=-d-1);var e=this.pointIndex({row:b,column:0},d);e<0&&(e=-e-1);var f=[];for(var g=d;g<e;g++)f.push(c[g]);return f},this.removeAll=function(){return this.ranges.splice(0,this.ranges.length)},this.attach=function(a){this.session&&this.detach(),this.session=a,this.onChange=this.$onChange.bind(this),this.session.on("change",this.onChange)},this.detach=function(){if(!this.session)return;this.session.removeListener("change",this.onChange),this.session=null},this.$onChange=function(a){var b=a.data.range;if(a.data.action[0]=="i")var c=b.start,d=b.end;else var d=b.start,c=b.end;var e=c.row,f=d.row,g=f-e,h=-c.column+d.column,i=this.ranges;for(var j=0,k=i.length;j<k;j++){var l=i[j];if(l.end.row<e)continue;if(l.start.row>e)break;l.start.row==e&&l.start.column>=c.column&&(l.start.column+=h,l.start.row+=g),l.end.row==e&&l.end.column>=c.column&&(l.end.column+=h,l.end.row+=g)}if(g!=0&&j<k)for(;j<k;j++){var l=i[j];l.start.row+=g,l.end.row+=g}}}).call(d.prototype),b.RangeList=d}),define("ace/mouse/multi_select_handler",["require","exports","module","ace/lib/event"],function(a,b,c){function e(a,b){return a.row==b.row&&a.column==b.column}function f(a){var b=a.domEvent,c=b.altKey,f=b.shiftKey,g=a.getAccelKey(),h=a.getButton();if(!g&&!c){if(a.editor.inMultiSelectMode)if(h==0)a.editor.exitMultiSelectMode();else if(h==2){var i=a.editor,j=i.selection.isEmpty();i.textInput.onContextMenu({x:a.clientX,y:a.clientY},j),d.capture(i.container,function(){},i.textInput.onContextMenuClose),a.stop()}return}var i=a.editor,k=i.selection,l=i.inMultiSelectMode,m=a.getDocumentPosition(),n=k.getCursor(),o=a.inSelection()||k.isEmpty()&&e(m,n),p=a.x,q=a.y,r=function(a){p=a.clientX,q=a.clientY},s=function(){var a=i.renderer.pixelToScreenCoordinates(p,q),b=t.screenToDocumentPosition(a.row,a.column);if(e(v,a)&&e(b,k.selectionLead))return;v=a,i.selection.moveCursorToPosition(b),i.selection.clearSelection(),i.renderer.scrollCursorIntoView(),i.removeSelectionMarkers(y),y=k.rectangularRangeBlock(v,u),y.forEach(i.addSelectionMarker,i),i.updateSelectionMarkers()},t=i.session,u=i.renderer.pixelToScreenCoordinates(p,q),v=u;if(g&&!f&&!c&&h==0){if(!l&&o)return;if(!l){var w=k.toOrientedRange();i.addSelectionMarker(w)}var x=k.rangeList.rangeAtPoint(m);d.capture(i.container,function(){},function(){var a=k.toOrientedRange();x&&a.isEmpty()&&e(x.cursor,a.cursor)?k.substractPoint(a.cursor):(w&&(i.removeSelectionMarker(w),k.addRange(w)),k.addRange(a))})}else if(!f&&c&&h==0){a.stop(),l&&!g?k.toSingleRange():!l&&g&&k.addRange(),k.moveCursorToPosition(m),k.clearSelection();var y=[],z=function(a){clearInterval(B),i.removeSelectionMarkers(y);for(var b=0;b<y.length;b++)k.addRange(y[b])},A=s;d.capture(i.container,r,z);var B=setInterval(function(){A()},20);return a.preventDefault()}}var d=a("../lib/event");b.onMouseDown=f}),define("ace/commands/multi_select_commands",["require","exports","module","ace/keyboard/hash_handler"],function(a,b,c){b.defaultCommands=[{name:"addCursorAbove",exec:function(a){a.selectMoreLines(-1)},bindKey:{win:"Ctrl-Alt-Up",mac:"Ctrl-Alt-Up"},readonly:!0},{name:"addCursorBelow",exec:function(a){a.selectMoreLines(1)},bindKey:{win:"Ctrl-Alt-Down",mac:"Ctrl-Alt-Down"},readonly:!0},{name:"addCursorAboveSkipCurrent",exec:function(a){a.selectMoreLines(-1,!0)},bindKey:{win:"Ctrl-Alt-Shift-Up",mac:"Ctrl-Alt-Shift-Up"},readonly:!0},{name:"addCursorBelowSkipCurrent",exec:function(a){a.selectMoreLines(1,!0)},bindKey:{win:"Ctrl-Alt-Shift-Down",mac:"Ctrl-Alt-Shift-Down"},readonly:!0},{name:"selectMoreBefore",exec:function(a){a.selectMore(-1)},bindKey:{win:"Ctrl-Alt-Left",mac:"Ctrl-Alt-Left"},readonly:!0},{name:"selectMoreAfter",exec:function(a){a.selectMore(1)},bindKey:{win:"Ctrl-Alt-Right",mac:"Ctrl-Alt-Right"},readonly:!0},{name:"selectNextBefore",exec:function(a){a.selectMore(-1,!0)},bindKey:{win:"Ctrl-Alt-Shift-Left",mac:"Ctrl-Alt-Shift-Left"},readonly:!0},{name:"selectNextAfter",exec:function(a){a.selectMore(1,!0)},bindKey:{win:"Ctrl-Alt-Shift-Right",mac:"Ctrl-Alt-Shift-Right"},readonly:!0},{name:"splitIntoLines",exec:function(a){a.multiSelect.splitIntoLines()},bindKey:{win:"Ctrl-Shift-L",mac:"Ctrl-Shift-L"},readonly:!0},{name:"singleSelection",bindKey:"esc",exec:function(a){a.exitMultiSelectMode()},readonly:!0,isAvailable:function(a){return a.inMultiSelectMode}}],b.multiEditCommands={singleSelection:"esc"};var d=a("../keyboard/hash_handler").HashHandler;b.keyboardHandler=new d(b.multiEditCommands)}),define("ace/worker/worker_client",["require","exports","module","ace/lib/oop","ace/lib/event_emitter","ace/config"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../lib/event_emitter").EventEmitter,f=a("../config"),g=function(b,c,d,e){this.changeListener=this.changeListener.bind(this);if(f.get("packaged"))this.$worker=new Worker(f.get("workerPath")+"/"+c);else{var g=this.$normalizePath(a.nameToUrl("ace/worker/worker",null,"_"));this.$worker=new Worker(g);var h={};for(var i=0;i<b.length;i++){var j=b[i],k=this.$normalizePath(a.nameToUrl(j,null,"_").replace(/.js$/,""));h[j]=k}}this.$worker.postMessage({init:!0,tlns:h,module:d,classname:e}),this.callbackId=1,this.callbacks={};var l=this;this.$worker.onerror=function(a){throw window.console&&console.log&&console.log(a),a},this.$worker.onmessage=function(a){var b=a.data;switch(b.type){case"log":window.console&&console.log&&console.log(b.data);break;case"event":l._emit(b.name,{data:b.data});break;case"call":var c=l.callbacks[b.id];c&&(c(b.data),delete l.callbacks[b.id])}}};(function(){d.implement(this,e),this.$normalizePath=function(a){return a=a.replace(/^[a-z]+:\/\/[^\/]+/,""),a=location.protocol+"//"+location.host+(a.charAt(0)=="/"?"":location.pathname.replace(/\/[^\/]*$/,""))+"/"+a.replace(/^[\/]+/,""),a},this.terminate=function(){this._emit("terminate",{}),this.$worker.terminate(),this.$worker=null,this.$doc.removeEventListener("change",this.changeListener),this.$doc=null},this.send=function(a,b){this.$worker.postMessage({command:a,args:b})},this.call=function(a,b,c){if(c){var d=this.callbackId++;this.callbacks[d]=c,b.push(d)}this.send(a,b)},this.emit=function(a,b){try{this.$worker.postMessage({event:a,data:{data:b.data}})}catch(c){}},this.attachToDocument=function(a){this.$doc&&this.terminate(),this.$doc=a,this.call("setValue",[a.getValue()]),a.on("change",this.changeListener)},this.changeListener=function(a){a.range={start:a.data.range.start,end:a.data.range.end},this.emit("change",a)}}).call(g.prototype),b.WorkerClient=g}),define("ace/keyboard/state_handler",["require","exports","module"],function(a,b,c){function e(a){this.keymapping=this.$buildKeymappingRegex(a)}"use strict";var d=!1;e.prototype={$buildKeymappingRegex:function(a){for(var b in a)this.$buildBindingsRegex(a[b]);return a},$buildBindingsRegex:function(a){a.forEach(function(a){a.key?a.key=new RegExp("^"+a.key+"$"):Array.isArray(a.regex)?("key"in a||(a.key=new RegExp("^"+a.regex[1]+"$")),a.regex=new RegExp(a.regex.join("")+"$")):a.regex&&(a.regex=new RegExp(a.regex+"$"))})},$composeBuffer:function(a,b,c,d){if(a.state==null||a.buffer==null)a.state="start",a.buffer="";var e=[];b&1&&e.push("ctrl"),b&8&&e.push("command"),b&2&&e.push("option"),b&4&&e.push("shift"),c&&e.push(c);var f=e.join("-"),g=a.buffer+f;b!=2&&(a.buffer=g);var h={bufferToUse:g,symbolicName:f};return d&&(h.keyIdentifier=d.keyIdentifier),h},$find:function(a,b,c,e,f,g){var h={};return this.keymapping[a.state].some(function(i){var j;if(i.key&&!i.key.test(c))return!1;if(i.regex&&!(j=i.regex.exec(b)))return!1;if(i.match&&!i.match(b,e,f,c,g))return!1;if(i.disallowMatches)for(var k=0;k<i.disallowMatches.length;k++)if(!!j[i.disallowMatches[k]])return!1;if(i.exec){h.command=i.exec;if(i.params){var l;h.args={},i.params.forEach(function(a){a.match!=null&&j!=null?l=j[a.match]||a.defaultValue:l=a.defaultValue,a.type==="number"&&(l=parseInt(l)),h.args[a.name]=l})}a.buffer=""}return i.then&&(a.state=i.then,a.buffer=""),h.command==null&&(h.command="null"),d&&console.log("KeyboardStateMapper#find",i),!0}),h.command?h:(a.buffer="",!1)},handleKeyboard:function(a,b,c,e,f){if(b==0||c!=""&&c!=String.fromCharCode(0)){var g=this.$composeBuffer(a,b,c,f),h=g.bufferToUse,i=g.symbolicName,j=g.keyIdentifier;return g=this.$find(a,h,i,b,c,j),d&&console.log("KeyboardStateMapper#match",h,i,g),g}return null}},b.matchCharacterOnly=function(a,b,c,d){return b==0?!0:b==4&&c.length==1?!0:!1},b.StateHandler=e}),define("ace/placeholder",["require","exports","module","ace/range","ace/lib/event_emitter","ace/lib/oop"],function(a,b,c){"use strict";var d=a("./range").Range,e=a("./lib/event_emitter").EventEmitter,f=a("./lib/oop"),g=function(a,b,c,d,e,f){var g=this;this.length=b,this.session=a,this.doc=a.getDocument(),this.mainClass=e,this.othersClass=f,this.$onUpdate=this.onUpdate.bind(this),this.doc.on("change",this.$onUpdate),this.$others=d,this.$onCursorChange=function(){setTimeout(function(){g.onCursorChange()})},this.$pos=c;var h=a.getUndoManager().$undoStack||a.getUndoManager().$undostack||{length:-1};this.$undoStackDepth=h.length,this.setup(),a.selection.on("changeCursor",this.$onCursorChange)};(function(){f.implement(this,e),this.setup=function(){var a=this,b=this.doc,c=this.session,e=this.$pos;this.pos=b.createAnchor(e.row,e.column),this.markerId=c.addMarker(new d(e.row,e.column,e.row,e.column+this.length),this.mainClass,null,!1),this.pos.on("change",function(b){c.removeMarker(a.markerId),a.markerId=c.addMarker(new d(b.value.row,b.value.column,b.value.row,b.value.column+a.length),a.mainClass,null,!1)}),this.others=[],this.$others.forEach(function(c){var d=b.createAnchor(c.row,c.column);a.others.push(d)}),c.setUndoSelect(!1)},this.showOtherMarkers=function(){if(this.othersActive)return;var a=this.session,b=this;this.othersActive=!0,this.others.forEach(function(c){c.markerId=a.addMarker(new d(c.row,c.column,c.row,c.column+b.length),b.othersClass,null,!1),c.on("change",function(e){a.removeMarker(c.markerId),c.markerId=a.addMarker(new d(e.value.row,e.value.column,e.value.row,e.value.column+b.length),b.othersClass,null,!1)})})},this.hideOtherMarkers=function(){if(!this.othersActive)return;this.othersActive=!1;for(var a=0;a<this.others.length;a++)this.session.removeMarker(this.others[a].markerId)},this.onUpdate=function(a){var b=a.data,c=b.range;if(c.start.row!==c.end.row)return;if(c.start.row!==this.pos.row)return;if(this.$updating)return;this.$updating=!0;var e=b.action==="insertText"?c.end.column-c.start.column:c.start.column-c.end.column;if(c.start.column>=this.pos.column&&c.start.column<=this.pos.column+this.length+1){var f=c.start.column-this.pos.column;this.length+=e;if(!this.session.$fromUndo){if(b.action==="insertText")for(var g=this.others.length-1;g>=0;g--){var h=this.others[g],i={row:h.row,column:h.column+f};h.row===c.start.row&&c.start.column<h.column&&(i.column+=e),this.doc.insert(i,b.text)}else if(b.action==="removeText")for(var g=this.others.length-1;g>=0;g--){var h=this.others[g],i={row:h.row,column:h.column+f};h.row===c.start.row&&c.start.column<h.column&&(i.column+=e),this.doc.remove(new d(i.row,i.column,i.row,i.column-e))}c.start.column===this.pos.column&&b.action==="insertText"?setTimeout(function(){this.pos.setPosition(this.pos.row,this.pos.column-e);for(var a=0;a<this.others.length;a++){var b=this.others[a],d={row:b.row,column:b.column-e};b.row===c.start.row&&c.start.column<b.column&&(d.column+=e),b.setPosition(d.row,d.column)}}.bind(this),0):c.start.column===this.pos.column&&b.action==="removeText"&&setTimeout(function(){for(var a=0;a<this.others.length;a++){var b=this.others[a];b.row===c.start.row&&c.start.column<b.column&&b.setPosition(b.row,b.column-e)}}.bind(this),0)}this.pos._emit("change",{value:this.pos});for(var g=0;g<this.others.length;g++)this.others[g]._emit("change",{value:this.others[g]})}this.$updating=!1},this.onCursorChange=function(a){if(this.$updating)return;var b=this.session.selection.getCursor();b.row===this.pos.row&&b.column>=this.pos.column&&b.column<=this.pos.column+this.length?(this.showOtherMarkers(),this._emit("cursorEnter",a)):(this.hideOtherMarkers(),this._emit("cursorLeave",a))},this.detach=function(){this.session.removeMarker(this.markerId),this.hideOtherMarkers(),this.doc.removeEventListener("change",this.$onUpdate),this.session.selection.removeEventListener("changeCursor",this.$onCursorChange),this.pos.detach();for(var a=0;a<this.others.length;a++)this.others[a].detach();this.session.setUndoSelect(!0)},this.cancel=function(){if(this.$undoStackDepth===-1)throw Error("Canceling placeholders only supported with undo manager attached to session.");var a=this.session.getUndoManager(),b=(a.$undoStack||a.$undostack).length-this.$undoStackDepth;for(var c=0;c<b;c++)a.undo(!0)}}).call(g.prototype),b.PlaceHolder=g}),define("ace/theme/textmate",["require","exports","module","ace/lib/dom"],function(a,b,c){"use strict",b.isDark=!1,b.cssClass="ace-tm",b.cssText=".ace-tm .ace_editor {  border: 2px solid rgb(159, 159, 159);}.ace-tm .ace_editor.ace_focus {  border: 2px solid #327fbd;}.ace-tm .ace_gutter {  background: #e8e8e8;  color: #333;}.ace-tm .ace_print_margin {  width: 1px;  background: #e8e8e8;}.ace-tm .ace_fold {    background-color: #6B72E6;}.ace-tm .ace_text-layer {  cursor: text;}.ace-tm .ace_cursor {  border-left: 2px solid black;}.ace-tm .ace_cursor.ace_overwrite {  border-left: 0px;  border-bottom: 1px solid black;}        .ace-tm .ace_line .ace_invisible {  color: rgb(191, 191, 191);}.ace-tm .ace_line .ace_storage,.ace-tm .ace_line .ace_keyword {  color: blue;}.ace-tm .ace_line .ace_constant {  color: rgb(197, 6, 11);}.ace-tm .ace_line .ace_constant.ace_buildin {  color: rgb(88, 72, 246);}.ace-tm .ace_line .ace_constant.ace_language {  color: rgb(88, 92, 246);}.ace-tm .ace_line .ace_constant.ace_library {  color: rgb(6, 150, 14);}.ace-tm .ace_line .ace_invalid {  background-color: rgba(255, 0, 0, 0.1);  color: red;}.ace-tm .ace_line .ace_support.ace_function {  color: rgb(60, 76, 114);}.ace-tm .ace_line .ace_support.ace_constant {  color: rgb(6, 150, 14);}.ace-tm .ace_line .ace_support.ace_type,.ace-tm .ace_line .ace_support.ace_class {  color: rgb(109, 121, 222);}.ace-tm .ace_line .ace_keyword.ace_operator {  color: rgb(104, 118, 135);}.ace-tm .ace_line .ace_string {  color: rgb(3, 106, 7);}.ace-tm .ace_line .ace_comment {  color: rgb(76, 136, 107);}.ace-tm .ace_line .ace_comment.ace_doc {  color: rgb(0, 102, 255);}.ace-tm .ace_line .ace_comment.ace_doc.ace_tag {  color: rgb(128, 159, 191);}.ace-tm .ace_line .ace_constant.ace_numeric {  color: rgb(0, 0, 205);}.ace-tm .ace_line .ace_variable {  color: rgb(49, 132, 149);}.ace-tm .ace_line .ace_xml_pe {  color: rgb(104, 104, 91);}.ace-tm .ace_entity.ace_name.ace_function {  color: #0000A2;}.ace-tm .ace_markup.ace_markupine {    text-decoration:underline;}.ace-tm .ace_markup.ace_heading {  color: rgb(12, 7, 255);}.ace-tm .ace_markup.ace_list {  color:rgb(185, 6, 144);}.ace-tm .ace_marker-layer .ace_selection {  background: rgb(181, 213, 255);}.ace-tm.multiselect .ace_selection.start {  box-shadow: 0 0 3px 0px white;  border-radius: 2px;}.ace-tm .ace_marker-layer .ace_step {  background: rgb(252, 255, 0);}.ace-tm .ace_marker-layer .ace_stack {  background: rgb(164, 229, 101);}.ace-tm .ace_marker-layer .ace_bracket {  margin: -1px 0 0 -1px;  border: 1px solid rgb(192, 192, 192);}.ace-tm .ace_marker-layer .ace_active_line {  background: rgba(0, 0, 0, 0.07);}.ace-tm .ace_gutter_active_line{    background-color : #dcdcdc;}.ace-tm .ace_marker-layer .ace_selected_word {  background: rgb(250, 250, 255);  border: 1px solid rgb(200, 200, 250);}.ace-tm .ace_meta.ace_tag {  color:rgb(28, 2, 255);}.ace-tm .ace_string.ace_regex {  color: rgb(255, 0, 0)}";var d=a("../lib/dom");d.importCssString(b.cssText,b.cssClass)});
            (function() {
                window.require(["ace/ace"], function(a) {
                    if (!window.ace)
                        window.ace = {};
                    for (var key in a) if (a.hasOwnProperty(key))
                        ace[key] = a[key];
                });
            })();

;
/**
 * Diff Match and Patch
 *
 * Copyright 2006 Google Inc.
 * http://code.google.com/p/google-diff-match-patch/
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Computes the difference between two texts to create a patch.
 * Applies the patch onto another text, allowing for errors.
 * @author fraser@google.com (Neil Fraser)
 */

/**
 * Class containing the diff, match and patch methods.
 * @constructor
 */
function diff_match_patch() {

  // Defaults.
  // Redefine these in your program to override the defaults.

  // Number of seconds to map a diff before giving up (0 for infinity).
  this.Diff_Timeout = 1.0;
  // Cost of an empty edit operation in terms of edit characters.
  this.Diff_EditCost = 4;
  // At what point is no match declared (0.0 = perfection, 1.0 = very loose).
  this.Match_Threshold = 0.5;
  // How far to search for a match (0 = exact location, 1000+ = broad match).
  // A match this many characters away from the expected location will add
  // 1.0 to the score (0.0 is a perfect match).
  this.Match_Distance = 1000;
  // When deleting a large block of text (over ~64 characters), how close do
  // the contents have to be to match the expected contents. (0.0 = perfection,
  // 1.0 = very loose).  Note that Match_Threshold controls how closely the
  // end points of a delete need to match.
  this.Patch_DeleteThreshold = 0.5;
  // Chunk size for context length.
  this.Patch_Margin = 4;

  // The number of bits in an int.
  this.Match_MaxBits = 32;
}


//  DIFF FUNCTIONS


/**
 * The data structure representing a diff is an array of tuples:
 * [[DIFF_DELETE, 'Hello'], [DIFF_INSERT, 'Goodbye'], [DIFF_EQUAL, ' world.']]
 * which means: delete 'Hello', add 'Goodbye' and keep ' world.'
 */
var DIFF_DELETE = -1;
var DIFF_INSERT = 1;
var DIFF_EQUAL = 0;

/** @typedef {{0: number, 1: string}} */
diff_match_patch.Diff;


/**
 * Find the differences between two texts.  Simplifies the problem by stripping
 * any common prefix or suffix off the texts before diffing.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean=} opt_checklines Optional speedup flag. If present and false,
 *     then don't run a line-level diff first to identify the changed areas.
 *     Defaults to true, which does a faster, slightly less optimal diff.
 * @param {number} opt_deadline Optional time when the diff should be complete
 *     by.  Used internally for recursive calls.  Users should set DiffTimeout
 *     instead.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 */
diff_match_patch.prototype.diff_main = function(text1, text2, opt_checklines,
    opt_deadline) {
  // Set a deadline by which time the diff must be complete.
  if (typeof opt_deadline == 'undefined') {
    if (this.Diff_Timeout <= 0) {
      opt_deadline = Number.MAX_VALUE;
    } else {
      opt_deadline = (new Date).getTime() + this.Diff_Timeout * 1000;
    }
  }
  var deadline = opt_deadline;

  // Check for null inputs.
  if (text1 == null || text2 == null) {
    throw new Error('Null input. (diff_main)');
  }

  // Check for equality (speedup).
  if (text1 == text2) {
    if (text1) {
      return [[DIFF_EQUAL, text1]];
    }
    return [];
  }

  if (typeof opt_checklines == 'undefined') {
    opt_checklines = true;
  }
  var checklines = opt_checklines;

  // Trim off common prefix (speedup).
  var commonlength = this.diff_commonPrefix(text1, text2);
  var commonprefix = text1.substring(0, commonlength);
  text1 = text1.substring(commonlength);
  text2 = text2.substring(commonlength);

  // Trim off common suffix (speedup).
  commonlength = this.diff_commonSuffix(text1, text2);
  var commonsuffix = text1.substring(text1.length - commonlength);
  text1 = text1.substring(0, text1.length - commonlength);
  text2 = text2.substring(0, text2.length - commonlength);

  // Compute the diff on the middle block.
  var diffs = this.diff_compute_(text1, text2, checklines, deadline);

  // Restore the prefix and suffix.
  if (commonprefix) {
    diffs.unshift([DIFF_EQUAL, commonprefix]);
  }
  if (commonsuffix) {
    diffs.push([DIFF_EQUAL, commonsuffix]);
  }
  this.diff_cleanupMerge(diffs);
  return diffs;
};


/**
 * Find the differences between two texts.  Assumes that the texts do not
 * have any common prefix or suffix.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {boolean} checklines Speedup flag.  If false, then don't run a
 *     line-level diff first to identify the changed areas.
 *     If true, then run a faster, slightly less optimal diff.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_compute_ = function(text1, text2, checklines,
    deadline) {
  var diffs;

  if (!text1) {
    // Just add some text (speedup).
    return [[DIFF_INSERT, text2]];
  }

  if (!text2) {
    // Just delete some text (speedup).
    return [[DIFF_DELETE, text1]];
  }

  /** @type {?string} */
  var longtext = text1.length > text2.length ? text1 : text2;
  /** @type {?string} */
  var shorttext = text1.length > text2.length ? text2 : text1;
  var i = longtext.indexOf(shorttext);
  if (i != -1) {
    // Shorter text is inside the longer text (speedup).
    diffs = [[DIFF_INSERT, longtext.substring(0, i)],
             [DIFF_EQUAL, shorttext],
             [DIFF_INSERT, longtext.substring(i + shorttext.length)]];
    // Swap insertions for deletions if diff is reversed.
    if (text1.length > text2.length) {
      diffs[0][0] = diffs[2][0] = DIFF_DELETE;
    }
    return diffs;
  }

  if (shorttext.length == 1) {
    // Single character string.
    // After the previous speedup, the character can't be an equality.
    return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
  }
  longtext = shorttext = null;  // Garbage collect.

  // Check to see if the problem can be split in two.
  var hm = this.diff_halfMatch_(text1, text2);
  if (hm) {
    // A half-match was found, sort out the return data.
    var text1_a = hm[0];
    var text1_b = hm[1];
    var text2_a = hm[2];
    var text2_b = hm[3];
    var mid_common = hm[4];
    // Send both pairs off for separate processing.
    var diffs_a = this.diff_main(text1_a, text2_a, checklines, deadline);
    var diffs_b = this.diff_main(text1_b, text2_b, checklines, deadline);
    // Merge the results.
    return diffs_a.concat([[DIFF_EQUAL, mid_common]], diffs_b);
  }

  if (checklines && text1.length > 100 && text2.length > 100) {
    return this.diff_lineMode_(text1, text2, deadline);
  }

  return this.diff_bisect_(text1, text2, deadline);
};


/**
 * Do a quick line-level diff on both strings, then rediff the parts for
 * greater accuracy.
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time when the diff should be complete by.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_lineMode_ = function(text1, text2, deadline) {
  // Scan the text on a line-by-line basis first.
  var a = this.diff_linesToChars_(text1, text2);
  text1 = a.chars1;
  text2 = a.chars2;
  var linearray = a.lineArray;

  var diffs = this.diff_main(text1, text2, false, deadline);

  // Convert the diff back to original text.
  this.diff_charsToLines_(diffs, linearray);
  // Eliminate freak matches (e.g. blank lines)
  this.diff_cleanupSemantic(diffs);

  // Rediff any replacement blocks, this time character-by-character.
  // Add a dummy entry at the end.
  diffs.push([DIFF_EQUAL, '']);
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete >= 1 && count_insert >= 1) {
          // Delete the offending records and add the merged ones.
          diffs.splice(pointer - count_delete - count_insert,
                       count_delete + count_insert);
          pointer = pointer - count_delete - count_insert;
          var a = this.diff_main(text_delete, text_insert, false, deadline);
          for (var j = a.length - 1; j >= 0; j--) {
            diffs.splice(pointer, 0, a[j]);
          }
          pointer = pointer + a.length;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
    pointer++;
  }
  diffs.pop();  // Remove the dummy entry at the end.

  return diffs;
};


/**
 * Find the 'middle snake' of a diff, split the problem in two
 * and return the recursively constructed diff.
 * See Myers 1986 paper: An O(ND) Difference Algorithm and Its Variations.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisect_ = function(text1, text2, deadline) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  var max_d = Math.ceil((text1_length + text2_length) / 2);
  var v_offset = max_d;
  var v_length = 2 * max_d;
  var v1 = new Array(v_length);
  var v2 = new Array(v_length);
  // Setting all elements to -1 is faster in Chrome & Firefox than mixing
  // integers and undefined.
  for (var x = 0; x < v_length; x++) {
    v1[x] = -1;
    v2[x] = -1;
  }
  v1[v_offset + 1] = 0;
  v2[v_offset + 1] = 0;
  var delta = text1_length - text2_length;
  // If the total number of characters is odd, then the front path will collide
  // with the reverse path.
  var front = (delta % 2 != 0);
  // Offsets for start and end of k loop.
  // Prevents mapping of space beyond the grid.
  var k1start = 0;
  var k1end = 0;
  var k2start = 0;
  var k2end = 0;
  for (var d = 0; d < max_d; d++) {
    // Bail out if deadline is reached.
    if ((new Date()).getTime() > deadline) {
      break;
    }

    // Walk the front path one step.
    for (var k1 = -d + k1start; k1 <= d - k1end; k1 += 2) {
      var k1_offset = v_offset + k1;
      var x1;
      if (k1 == -d || (k1 != d && v1[k1_offset - 1] < v1[k1_offset + 1])) {
        x1 = v1[k1_offset + 1];
      } else {
        x1 = v1[k1_offset - 1] + 1;
      }
      var y1 = x1 - k1;
      while (x1 < text1_length && y1 < text2_length &&
             text1.charAt(x1) == text2.charAt(y1)) {
        x1++;
        y1++;
      }
      v1[k1_offset] = x1;
      if (x1 > text1_length) {
        // Ran off the right of the graph.
        k1end += 2;
      } else if (y1 > text2_length) {
        // Ran off the bottom of the graph.
        k1start += 2;
      } else if (front) {
        var k2_offset = v_offset + delta - k1;
        if (k2_offset >= 0 && k2_offset < v_length && v2[k2_offset] != -1) {
          // Mirror x2 onto top-left coordinate system.
          var x2 = text1_length - v2[k2_offset];
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }

    // Walk the reverse path one step.
    for (var k2 = -d + k2start; k2 <= d - k2end; k2 += 2) {
      var k2_offset = v_offset + k2;
      var x2;
      if (k2 == -d || (k2 != d && v2[k2_offset - 1] < v2[k2_offset + 1])) {
        x2 = v2[k2_offset + 1];
      } else {
        x2 = v2[k2_offset - 1] + 1;
      }
      var y2 = x2 - k2;
      while (x2 < text1_length && y2 < text2_length &&
             text1.charAt(text1_length - x2 - 1) ==
             text2.charAt(text2_length - y2 - 1)) {
        x2++;
        y2++;
      }
      v2[k2_offset] = x2;
      if (x2 > text1_length) {
        // Ran off the left of the graph.
        k2end += 2;
      } else if (y2 > text2_length) {
        // Ran off the top of the graph.
        k2start += 2;
      } else if (!front) {
        var k1_offset = v_offset + delta - k2;
        if (k1_offset >= 0 && k1_offset < v_length && v1[k1_offset] != -1) {
          var x1 = v1[k1_offset];
          var y1 = v_offset + x1 - k1_offset;
          // Mirror x2 onto top-left coordinate system.
          x2 = text1_length - x2;
          if (x1 >= x2) {
            // Overlap detected.
            return this.diff_bisectSplit_(text1, text2, x1, y1, deadline);
          }
        }
      }
    }
  }
  // Diff took too long and hit the deadline or
  // number of diffs equals number of characters, no commonality at all.
  return [[DIFF_DELETE, text1], [DIFF_INSERT, text2]];
};


/**
 * Given the location of the 'middle snake', split the diff in two parts
 * and recurse.
 * @param {string} text1 Old string to be diffed.
 * @param {string} text2 New string to be diffed.
 * @param {number} x Index of split point in text1.
 * @param {number} y Index of split point in text2.
 * @param {number} deadline Time at which to bail if not yet complete.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @private
 */
diff_match_patch.prototype.diff_bisectSplit_ = function(text1, text2, x, y,
    deadline) {
  var text1a = text1.substring(0, x);
  var text2a = text2.substring(0, y);
  var text1b = text1.substring(x);
  var text2b = text2.substring(y);

  // Compute both diffs serially.
  var diffs = this.diff_main(text1a, text2a, false, deadline);
  var diffsb = this.diff_main(text1b, text2b, false, deadline);

  return diffs.concat(diffsb);
};


/**
 * Split two texts into an array of strings.  Reduce the texts to a string of
 * hashes where each Unicode character represents one line.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {{chars1: string, chars2: string, lineArray: !Array.<string>}}
 *     An object containing the encoded text1, the encoded text2 and
 *     the array of unique strings.
 *     The zeroth element of the array of unique strings is intentionally blank.
 * @private
 */
diff_match_patch.prototype.diff_linesToChars_ = function(text1, text2) {
  var lineArray = [];  // e.g. lineArray[4] == 'Hello\n'
  var lineHash = {};   // e.g. lineHash['Hello\n'] == 4

  // '\x00' is a valid character, but various debuggers don't like it.
  // So we'll insert a junk entry to avoid generating a null character.
  lineArray[0] = '';

  /**
   * Split a text into an array of strings.  Reduce the texts to a string of
   * hashes where each Unicode character represents one line.
   * Modifies linearray and linehash through being a closure.
   * @param {string} text String to encode.
   * @return {string} Encoded string.
   * @private
   */
  function diff_linesToCharsMunge_(text) {
    var chars = '';
    // Walk the text, pulling out a substring for each line.
    // text.split('\n') would would temporarily double our memory footprint.
    // Modifying text would create many large strings to garbage collect.
    var lineStart = 0;
    var lineEnd = -1;
    // Keeping our own length variable is faster than looking it up.
    var lineArrayLength = lineArray.length;
    while (lineEnd < text.length - 1) {
      lineEnd = text.indexOf('\n', lineStart);
      if (lineEnd == -1) {
        lineEnd = text.length - 1;
      }
      var line = text.substring(lineStart, lineEnd + 1);
      lineStart = lineEnd + 1;

      if (lineHash.hasOwnProperty ? lineHash.hasOwnProperty(line) :
          (lineHash[line] !== undefined)) {
        chars += String.fromCharCode(lineHash[line]);
      } else {
        chars += String.fromCharCode(lineArrayLength);
        lineHash[line] = lineArrayLength;
        lineArray[lineArrayLength++] = line;
      }
    }
    return chars;
  }

  var chars1 = diff_linesToCharsMunge_(text1);
  var chars2 = diff_linesToCharsMunge_(text2);
  return {chars1: chars1, chars2: chars2, lineArray: lineArray};
};


/**
 * Rehydrate the text in a diff from a string of line hashes to real lines of
 * text.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {!Array.<string>} lineArray Array of unique strings.
 * @private
 */
diff_match_patch.prototype.diff_charsToLines_ = function(diffs, lineArray) {
  for (var x = 0; x < diffs.length; x++) {
    var chars = diffs[x][1];
    var text = [];
    for (var y = 0; y < chars.length; y++) {
      text[y] = lineArray[chars.charCodeAt(y)];
    }
    diffs[x][1] = text.join('');
  }
};


/**
 * Determine the common prefix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the start of each
 *     string.
 */
diff_match_patch.prototype.diff_commonPrefix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerstart = 0;
  while (pointermin < pointermid) {
    if (text1.substring(pointerstart, pointermid) ==
        text2.substring(pointerstart, pointermid)) {
      pointermin = pointermid;
      pointerstart = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine the common suffix of two strings.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of each string.
 */
diff_match_patch.prototype.diff_commonSuffix = function(text1, text2) {
  // Quick check for common null cases.
  if (!text1 || !text2 ||
      text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
    return 0;
  }
  // Binary search.
  // Performance analysis: http://neil.fraser.name/news/2007/10/09/
  var pointermin = 0;
  var pointermax = Math.min(text1.length, text2.length);
  var pointermid = pointermax;
  var pointerend = 0;
  while (pointermin < pointermid) {
    if (text1.substring(text1.length - pointermid, text1.length - pointerend) ==
        text2.substring(text2.length - pointermid, text2.length - pointerend)) {
      pointermin = pointermid;
      pointerend = pointermin;
    } else {
      pointermax = pointermid;
    }
    pointermid = Math.floor((pointermax - pointermin) / 2 + pointermin);
  }
  return pointermid;
};


/**
 * Determine if the suffix of one string is the prefix of another.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {number} The number of characters common to the end of the first
 *     string and the start of the second string.
 * @private
 */
diff_match_patch.prototype.diff_commonOverlap_ = function(text1, text2) {
  // Cache the text lengths to prevent multiple calls.
  var text1_length = text1.length;
  var text2_length = text2.length;
  // Eliminate the null case.
  if (text1_length == 0 || text2_length == 0) {
    return 0;
  }
  // Truncate the longer string.
  if (text1_length > text2_length) {
    text1 = text1.substring(text1_length - text2_length);
  } else if (text1_length < text2_length) {
    text2 = text2.substring(0, text1_length);
  }
  var text_length = Math.min(text1_length, text2_length);
  // Quick check for the worst case.
  if (text1 == text2) {
    return text_length;
  }

  // Start by looking for a single character match
  // and increase length until no match is found.
  // Performance analysis: http://neil.fraser.name/news/2010/11/04/
  var best = 0;
  var length = 1;
  while (true) {
    var pattern = text1.substring(text_length - length);
    var found = text2.indexOf(pattern);
    if (found == -1) {
      return best;
    }
    length += found;
    if (found == 0 || text1.substring(text_length - length) ==
        text2.substring(0, length)) {
      best = length;
      length++;
    }
  }
};


/**
 * Do the two texts share a substring which is at least half the length of the
 * longer text?
 * This speedup can produce non-minimal diffs.
 * @param {string} text1 First string.
 * @param {string} text2 Second string.
 * @return {Array.<string>} Five element Array, containing the prefix of
 *     text1, the suffix of text1, the prefix of text2, the suffix of
 *     text2 and the common middle.  Or null if there was no match.
 * @private
 */
diff_match_patch.prototype.diff_halfMatch_ = function(text1, text2) {
  if (this.Diff_Timeout <= 0) {
    // Don't risk returning a non-optimal diff if we have unlimited time.
    return null;
  }
  var longtext = text1.length > text2.length ? text1 : text2;
  var shorttext = text1.length > text2.length ? text2 : text1;
  if (longtext.length < 4 || shorttext.length * 2 < longtext.length) {
    return null;  // Pointless.
  }
  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Does a substring of shorttext exist within longtext such that the substring
   * is at least half the length of longtext?
   * Closure, but does not reference any external variables.
   * @param {string} longtext Longer string.
   * @param {string} shorttext Shorter string.
   * @param {number} i Start index of quarter length substring within longtext.
   * @return {Array.<string>} Five element Array, containing the prefix of
   *     longtext, the suffix of longtext, the prefix of shorttext, the suffix
   *     of shorttext and the common middle.  Or null if there was no match.
   * @private
   */
  function diff_halfMatchI_(longtext, shorttext, i) {
    // Start with a 1/4 length substring at position i as a seed.
    var seed = longtext.substring(i, i + Math.floor(longtext.length / 4));
    var j = -1;
    var best_common = '';
    var best_longtext_a, best_longtext_b, best_shorttext_a, best_shorttext_b;
    while ((j = shorttext.indexOf(seed, j + 1)) != -1) {
      var prefixLength = dmp.diff_commonPrefix(longtext.substring(i),
                                               shorttext.substring(j));
      var suffixLength = dmp.diff_commonSuffix(longtext.substring(0, i),
                                               shorttext.substring(0, j));
      if (best_common.length < suffixLength + prefixLength) {
        best_common = shorttext.substring(j - suffixLength, j) +
            shorttext.substring(j, j + prefixLength);
        best_longtext_a = longtext.substring(0, i - suffixLength);
        best_longtext_b = longtext.substring(i + prefixLength);
        best_shorttext_a = shorttext.substring(0, j - suffixLength);
        best_shorttext_b = shorttext.substring(j + prefixLength);
      }
    }
    if (best_common.length * 2 >= longtext.length) {
      return [best_longtext_a, best_longtext_b,
              best_shorttext_a, best_shorttext_b, best_common];
    } else {
      return null;
    }
  }

  // First check if the second quarter is the seed for a half-match.
  var hm1 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 4));
  // Check again based on the third quarter.
  var hm2 = diff_halfMatchI_(longtext, shorttext,
                             Math.ceil(longtext.length / 2));
  var hm;
  if (!hm1 && !hm2) {
    return null;
  } else if (!hm2) {
    hm = hm1;
  } else if (!hm1) {
    hm = hm2;
  } else {
    // Both matched.  Select the longest.
    hm = hm1[4].length > hm2[4].length ? hm1 : hm2;
  }

  // A half-match was found, sort out the return data.
  var text1_a, text1_b, text2_a, text2_b;
  if (text1.length > text2.length) {
    text1_a = hm[0];
    text1_b = hm[1];
    text2_a = hm[2];
    text2_b = hm[3];
  } else {
    text2_a = hm[0];
    text2_b = hm[1];
    text1_a = hm[2];
    text1_b = hm[3];
  }
  var mid_common = hm[4];
  return [text1_a, text1_b, text2_a, text2_b, mid_common];
};


/**
 * Reduce the number of edits by eliminating semantically trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemantic = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Number of characters that changed prior to the equality.
  var length_insertions1 = 0;
  var length_deletions1 = 0;
  // Number of characters that changed after the equality.
  var length_insertions2 = 0;
  var length_deletions2 = 0;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      equalities[equalitiesLength++] = pointer;
      length_insertions1 = length_insertions2;
      length_deletions1 = length_deletions2;
      length_insertions2 = 0;
      length_deletions2 = 0;
      lastequality = diffs[pointer][1];
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_INSERT) {
        length_insertions2 += diffs[pointer][1].length;
      } else {
        length_deletions2 += diffs[pointer][1].length;
      }
      // Eliminate an equality that is smaller or equal to the edits on both
      // sides of it.
      if (lastequality && (lastequality.length <=
          Math.max(length_insertions1, length_deletions1)) &&
          (lastequality.length <= Math.max(length_insertions2,
                                           length_deletions2))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        // Throw away the equality we just deleted.
        equalitiesLength--;
        // Throw away the previous equality (it needs to be reevaluated).
        equalitiesLength--;
        pointer = equalitiesLength > 0 ? equalities[equalitiesLength - 1] : -1;
        length_insertions1 = 0;  // Reset the counters.
        length_deletions1 = 0;
        length_insertions2 = 0;
        length_deletions2 = 0;
        lastequality = null;
        changes = true;
      }
    }
    pointer++;
  }

  // Normalize the diff.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
  this.diff_cleanupSemanticLossless(diffs);

  // Find any overlaps between deletions and insertions.
  // e.g: <del>abcxxx</del><ins>xxxdef</ins>
  //   -> <del>abc</del>xxx<ins>def</ins>
  // e.g: <del>xxxabc</del><ins>defxxx</ins>
  //   -> <ins>def</ins>xxx<del>abc</del>
  // Only extract an overlap if it is as big as the edit ahead or behind it.
  pointer = 1;
  while (pointer < diffs.length) {
    if (diffs[pointer - 1][0] == DIFF_DELETE &&
        diffs[pointer][0] == DIFF_INSERT) {
      var deletion = diffs[pointer - 1][1];
      var insertion = diffs[pointer][1];
      var overlap_length1 = this.diff_commonOverlap_(deletion, insertion);
      var overlap_length2 = this.diff_commonOverlap_(insertion, deletion);
      if (overlap_length1 >= overlap_length2) {
        if (overlap_length1 >= deletion.length / 2 ||
            overlap_length1 >= insertion.length / 2) {
          // Overlap found.  Insert an equality and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, insertion.substring(0, overlap_length1)]);
          diffs[pointer - 1][1] =
              deletion.substring(0, deletion.length - overlap_length1);
          diffs[pointer + 1][1] = insertion.substring(overlap_length1);
          pointer++;
        }
      } else {
        if (overlap_length2 >= deletion.length / 2 ||
            overlap_length2 >= insertion.length / 2) {
          // Reverse overlap found.
          // Insert an equality and swap and trim the surrounding edits.
          diffs.splice(pointer, 0,
              [DIFF_EQUAL, deletion.substring(0, overlap_length2)]);
          diffs[pointer - 1][0] = DIFF_INSERT;
          diffs[pointer - 1][1] =
              insertion.substring(0, insertion.length - overlap_length2);
          diffs[pointer + 1][0] = DIFF_DELETE;
          diffs[pointer + 1][1] =
              deletion.substring(overlap_length2);
          pointer++;
        }
      }
      pointer++;
    }
    pointer++;
  }
};


/**
 * Look for single edits surrounded on both sides by equalities
 * which can be shifted sideways to align the edit to a word boundary.
 * e.g: The c<ins>at c</ins>ame. -> The <ins>cat </ins>came.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupSemanticLossless = function(diffs) {
  /**
   * Given two strings, compute a score representing whether the internal
   * boundary falls on logical boundaries.
   * Scores range from 6 (best) to 0 (worst).
   * Closure, but does not reference any external variables.
   * @param {string} one First string.
   * @param {string} two Second string.
   * @return {number} The score.
   * @private
   */
  function diff_cleanupSemanticScore_(one, two) {
    if (!one || !two) {
      // Edges are the best.
      return 6;
    }

    // Each port of this function behaves slightly differently due to
    // subtle differences in each language's definition of things like
    // 'whitespace'.  Since this function's purpose is largely cosmetic,
    // the choice has been made to use each language's native features
    // rather than force total conformity.
    var char1 = one.charAt(one.length - 1);
    var char2 = two.charAt(0);
    var nonAlphaNumeric1 = char1.match(diff_match_patch.nonAlphaNumericRegex_);
    var nonAlphaNumeric2 = char2.match(diff_match_patch.nonAlphaNumericRegex_);
    var whitespace1 = nonAlphaNumeric1 &&
        char1.match(diff_match_patch.whitespaceRegex_);
    var whitespace2 = nonAlphaNumeric2 &&
        char2.match(diff_match_patch.whitespaceRegex_);
    var lineBreak1 = whitespace1 &&
        char1.match(diff_match_patch.linebreakRegex_);
    var lineBreak2 = whitespace2 &&
        char2.match(diff_match_patch.linebreakRegex_);
    var blankLine1 = lineBreak1 &&
        one.match(diff_match_patch.blanklineEndRegex_);
    var blankLine2 = lineBreak2 &&
        two.match(diff_match_patch.blanklineStartRegex_);

    if (blankLine1 || blankLine2) {
      // Five points for blank lines.
      return 5;
    } else if (lineBreak1 || lineBreak2) {
      // Four points for line breaks.
      return 4;
    } else if (nonAlphaNumeric1 && !whitespace1 && whitespace2) {
      // Three points for end of sentences.
      return 3;
    } else if (whitespace1 || whitespace2) {
      // Two points for whitespace.
      return 2;
    } else if (nonAlphaNumeric1 || nonAlphaNumeric2) {
      // One point for non-alphanumeric.
      return 1;
    }
    return 0;
  }

  var pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      var equality1 = diffs[pointer - 1][1];
      var edit = diffs[pointer][1];
      var equality2 = diffs[pointer + 1][1];

      // First, shift the edit as far left as possible.
      var commonOffset = this.diff_commonSuffix(equality1, edit);
      if (commonOffset) {
        var commonString = edit.substring(edit.length - commonOffset);
        equality1 = equality1.substring(0, equality1.length - commonOffset);
        edit = commonString + edit.substring(0, edit.length - commonOffset);
        equality2 = commonString + equality2;
      }

      // Second, step character by character right, looking for the best fit.
      var bestEquality1 = equality1;
      var bestEdit = edit;
      var bestEquality2 = equality2;
      var bestScore = diff_cleanupSemanticScore_(equality1, edit) +
          diff_cleanupSemanticScore_(edit, equality2);
      while (edit.charAt(0) === equality2.charAt(0)) {
        equality1 += edit.charAt(0);
        edit = edit.substring(1) + equality2.charAt(0);
        equality2 = equality2.substring(1);
        var score = diff_cleanupSemanticScore_(equality1, edit) +
            diff_cleanupSemanticScore_(edit, equality2);
        // The >= encourages trailing rather than leading whitespace on edits.
        if (score >= bestScore) {
          bestScore = score;
          bestEquality1 = equality1;
          bestEdit = edit;
          bestEquality2 = equality2;
        }
      }

      if (diffs[pointer - 1][1] != bestEquality1) {
        // We have an improvement, save it back to the diff.
        if (bestEquality1) {
          diffs[pointer - 1][1] = bestEquality1;
        } else {
          diffs.splice(pointer - 1, 1);
          pointer--;
        }
        diffs[pointer][1] = bestEdit;
        if (bestEquality2) {
          diffs[pointer + 1][1] = bestEquality2;
        } else {
          diffs.splice(pointer + 1, 1);
          pointer--;
        }
      }
    }
    pointer++;
  }
};

// Define some regex patterns for matching boundaries.
diff_match_patch.nonAlphaNumericRegex_ = /[^a-zA-Z0-9]/;
diff_match_patch.whitespaceRegex_ = /\s/;
diff_match_patch.linebreakRegex_ = /[\r\n]/;
diff_match_patch.blanklineEndRegex_ = /\n\r?\n$/;
diff_match_patch.blanklineStartRegex_ = /^\r?\n\r?\n/;

/**
 * Reduce the number of edits by eliminating operationally trivial equalities.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupEfficiency = function(diffs) {
  var changes = false;
  var equalities = [];  // Stack of indices where equalities are found.
  var equalitiesLength = 0;  // Keeping our own length var is faster in JS.
  /** @type {?string} */
  var lastequality = null;
  // Always equal to diffs[equalities[equalitiesLength - 1]][1]
  var pointer = 0;  // Index of current position.
  // Is there an insertion operation before the last equality.
  var pre_ins = false;
  // Is there a deletion operation before the last equality.
  var pre_del = false;
  // Is there an insertion operation after the last equality.
  var post_ins = false;
  // Is there a deletion operation after the last equality.
  var post_del = false;
  while (pointer < diffs.length) {
    if (diffs[pointer][0] == DIFF_EQUAL) {  // Equality found.
      if (diffs[pointer][1].length < this.Diff_EditCost &&
          (post_ins || post_del)) {
        // Candidate found.
        equalities[equalitiesLength++] = pointer;
        pre_ins = post_ins;
        pre_del = post_del;
        lastequality = diffs[pointer][1];
      } else {
        // Not a candidate, and can never become one.
        equalitiesLength = 0;
        lastequality = null;
      }
      post_ins = post_del = false;
    } else {  // An insertion or deletion.
      if (diffs[pointer][0] == DIFF_DELETE) {
        post_del = true;
      } else {
        post_ins = true;
      }
      /*
       * Five types to be split:
       * <ins>A</ins><del>B</del>XY<ins>C</ins><del>D</del>
       * <ins>A</ins>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<ins>C</ins>
       * <ins>A</del>X<ins>C</ins><del>D</del>
       * <ins>A</ins><del>B</del>X<del>C</del>
       */
      if (lastequality && ((pre_ins && pre_del && post_ins && post_del) ||
                           ((lastequality.length < this.Diff_EditCost / 2) &&
                            (pre_ins + pre_del + post_ins + post_del) == 3))) {
        // Duplicate record.
        diffs.splice(equalities[equalitiesLength - 1], 0,
                     [DIFF_DELETE, lastequality]);
        // Change second copy to insert.
        diffs[equalities[equalitiesLength - 1] + 1][0] = DIFF_INSERT;
        equalitiesLength--;  // Throw away the equality we just deleted;
        lastequality = null;
        if (pre_ins && pre_del) {
          // No changes made which could affect previous entry, keep going.
          post_ins = post_del = true;
          equalitiesLength = 0;
        } else {
          equalitiesLength--;  // Throw away the previous equality.
          pointer = equalitiesLength > 0 ?
              equalities[equalitiesLength - 1] : -1;
          post_ins = post_del = false;
        }
        changes = true;
      }
    }
    pointer++;
  }

  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * Reorder and merge like edit sections.  Merge equalities.
 * Any edit section can move as long as it doesn't cross an equality.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 */
diff_match_patch.prototype.diff_cleanupMerge = function(diffs) {
  diffs.push([DIFF_EQUAL, '']);  // Add a dummy entry at the end.
  var pointer = 0;
  var count_delete = 0;
  var count_insert = 0;
  var text_delete = '';
  var text_insert = '';
  var commonlength;
  while (pointer < diffs.length) {
    switch (diffs[pointer][0]) {
      case DIFF_INSERT:
        count_insert++;
        text_insert += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_DELETE:
        count_delete++;
        text_delete += diffs[pointer][1];
        pointer++;
        break;
      case DIFF_EQUAL:
        // Upon reaching an equality, check for prior redundancies.
        if (count_delete + count_insert > 1) {
          if (count_delete !== 0 && count_insert !== 0) {
            // Factor out any common prefixies.
            commonlength = this.diff_commonPrefix(text_insert, text_delete);
            if (commonlength !== 0) {
              if ((pointer - count_delete - count_insert) > 0 &&
                  diffs[pointer - count_delete - count_insert - 1][0] ==
                  DIFF_EQUAL) {
                diffs[pointer - count_delete - count_insert - 1][1] +=
                    text_insert.substring(0, commonlength);
              } else {
                diffs.splice(0, 0, [DIFF_EQUAL,
                                    text_insert.substring(0, commonlength)]);
                pointer++;
              }
              text_insert = text_insert.substring(commonlength);
              text_delete = text_delete.substring(commonlength);
            }
            // Factor out any common suffixies.
            commonlength = this.diff_commonSuffix(text_insert, text_delete);
            if (commonlength !== 0) {
              diffs[pointer][1] = text_insert.substring(text_insert.length -
                  commonlength) + diffs[pointer][1];
              text_insert = text_insert.substring(0, text_insert.length -
                  commonlength);
              text_delete = text_delete.substring(0, text_delete.length -
                  commonlength);
            }
          }
          // Delete the offending records and add the merged ones.
          if (count_delete === 0) {
            diffs.splice(pointer - count_insert,
                count_delete + count_insert, [DIFF_INSERT, text_insert]);
          } else if (count_insert === 0) {
            diffs.splice(pointer - count_delete,
                count_delete + count_insert, [DIFF_DELETE, text_delete]);
          } else {
            diffs.splice(pointer - count_delete - count_insert,
                count_delete + count_insert, [DIFF_DELETE, text_delete],
                [DIFF_INSERT, text_insert]);
          }
          pointer = pointer - count_delete - count_insert +
                    (count_delete ? 1 : 0) + (count_insert ? 1 : 0) + 1;
        } else if (pointer !== 0 && diffs[pointer - 1][0] == DIFF_EQUAL) {
          // Merge this equality with the previous one.
          diffs[pointer - 1][1] += diffs[pointer][1];
          diffs.splice(pointer, 1);
        } else {
          pointer++;
        }
        count_insert = 0;
        count_delete = 0;
        text_delete = '';
        text_insert = '';
        break;
    }
  }
  if (diffs[diffs.length - 1][1] === '') {
    diffs.pop();  // Remove the dummy entry at the end.
  }

  // Second pass: look for single edits surrounded on both sides by equalities
  // which can be shifted sideways to eliminate an equality.
  // e.g: A<ins>BA</ins>C -> <ins>AB</ins>AC
  var changes = false;
  pointer = 1;
  // Intentionally ignore the first and last element (don't need checking).
  while (pointer < diffs.length - 1) {
    if (diffs[pointer - 1][0] == DIFF_EQUAL &&
        diffs[pointer + 1][0] == DIFF_EQUAL) {
      // This is a single edit surrounded by equalities.
      if (diffs[pointer][1].substring(diffs[pointer][1].length -
          diffs[pointer - 1][1].length) == diffs[pointer - 1][1]) {
        // Shift the edit over the previous equality.
        diffs[pointer][1] = diffs[pointer - 1][1] +
            diffs[pointer][1].substring(0, diffs[pointer][1].length -
                                        diffs[pointer - 1][1].length);
        diffs[pointer + 1][1] = diffs[pointer - 1][1] + diffs[pointer + 1][1];
        diffs.splice(pointer - 1, 1);
        changes = true;
      } else if (diffs[pointer][1].substring(0, diffs[pointer + 1][1].length) ==
          diffs[pointer + 1][1]) {
        // Shift the edit over the next equality.
        diffs[pointer - 1][1] += diffs[pointer + 1][1];
        diffs[pointer][1] =
            diffs[pointer][1].substring(diffs[pointer + 1][1].length) +
            diffs[pointer + 1][1];
        diffs.splice(pointer + 1, 1);
        changes = true;
      }
    }
    pointer++;
  }
  // If shifts were made, the diff needs reordering and another shift sweep.
  if (changes) {
    this.diff_cleanupMerge(diffs);
  }
};


/**
 * loc is a location in text1, compute and return the equivalent location in
 * text2.
 * e.g. 'The cat' vs 'The big cat', 1->1, 5->8
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @param {number} loc Location within text1.
 * @return {number} Location within text2.
 */
diff_match_patch.prototype.diff_xIndex = function(diffs, loc) {
  var chars1 = 0;
  var chars2 = 0;
  var last_chars1 = 0;
  var last_chars2 = 0;
  var x;
  for (x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {  // Equality or deletion.
      chars1 += diffs[x][1].length;
    }
    if (diffs[x][0] !== DIFF_DELETE) {  // Equality or insertion.
      chars2 += diffs[x][1].length;
    }
    if (chars1 > loc) {  // Overshot the location.
      break;
    }
    last_chars1 = chars1;
    last_chars2 = chars2;
  }
  // Was the location was deleted?
  if (diffs.length != x && diffs[x][0] === DIFF_DELETE) {
    return last_chars2;
  }
  // Add the remaining character length.
  return last_chars2 + (loc - last_chars1);
};


/**
 * Convert a diff array into a pretty HTML report.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} HTML representation.
 */
diff_match_patch.prototype.diff_prettyHtml = function(diffs) {
  var html = [];
  var pattern_amp = /&/g;
  var pattern_lt = /</g;
  var pattern_gt = />/g;
  var pattern_para = /\n/g;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];    // Operation (insert, delete, equal)
    var data = diffs[x][1];  // Text of change.
    var text = data.replace(pattern_amp, '&amp;').replace(pattern_lt, '&lt;')
        .replace(pattern_gt, '&gt;').replace(pattern_para, '&para;<br>');
    switch (op) {
      case DIFF_INSERT:
        html[x] = '<ins style="background:#e6ffe6;">' + text + '</ins>';
        break;
      case DIFF_DELETE:
        html[x] = '<del style="background:#ffe6e6;">' + text + '</del>';
        break;
      case DIFF_EQUAL:
        html[x] = '<span>' + text + '</span>';
        break;
    }
  }
  return html.join('');
};


/**
 * Compute and return the source text (all equalities and deletions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Source text.
 */
diff_match_patch.prototype.diff_text1 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_INSERT) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute and return the destination text (all equalities and insertions).
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Destination text.
 */
diff_match_patch.prototype.diff_text2 = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    if (diffs[x][0] !== DIFF_DELETE) {
      text[x] = diffs[x][1];
    }
  }
  return text.join('');
};


/**
 * Compute the Levenshtein distance; the number of inserted, deleted or
 * substituted characters.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {number} Number of changes.
 */
diff_match_patch.prototype.diff_levenshtein = function(diffs) {
  var levenshtein = 0;
  var insertions = 0;
  var deletions = 0;
  for (var x = 0; x < diffs.length; x++) {
    var op = diffs[x][0];
    var data = diffs[x][1];
    switch (op) {
      case DIFF_INSERT:
        insertions += data.length;
        break;
      case DIFF_DELETE:
        deletions += data.length;
        break;
      case DIFF_EQUAL:
        // A deletion and an insertion is one substitution.
        levenshtein += Math.max(insertions, deletions);
        insertions = 0;
        deletions = 0;
        break;
    }
  }
  levenshtein += Math.max(insertions, deletions);
  return levenshtein;
};


/**
 * Crush the diff into an encoded string which describes the operations
 * required to transform text1 into text2.
 * E.g. =3\t-2\t+ing  -> Keep 3 chars, delete 2 chars, insert 'ing'.
 * Operations are tab-separated.  Inserted text is escaped using %xx notation.
 * @param {!Array.<!diff_match_patch.Diff>} diffs Array of diff tuples.
 * @return {string} Delta text.
 */
diff_match_patch.prototype.diff_toDelta = function(diffs) {
  var text = [];
  for (var x = 0; x < diffs.length; x++) {
    switch (diffs[x][0]) {
      case DIFF_INSERT:
        text[x] = '+' + encodeURI(diffs[x][1]);
        break;
      case DIFF_DELETE:
        text[x] = '-' + diffs[x][1].length;
        break;
      case DIFF_EQUAL:
        text[x] = '=' + diffs[x][1].length;
        break;
    }
  }
  return text.join('\t').replace(/%20/g, ' ');
};


/**
 * Given the original text1, and an encoded string which describes the
 * operations required to transform text1 into text2, compute the full diff.
 * @param {string} text1 Source string for the diff.
 * @param {string} delta Delta text.
 * @return {!Array.<!diff_match_patch.Diff>} Array of diff tuples.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.diff_fromDelta = function(text1, delta) {
  var diffs = [];
  var diffsLength = 0;  // Keeping our own length var is faster in JS.
  var pointer = 0;  // Cursor in text1
  var tokens = delta.split(/\t/g);
  for (var x = 0; x < tokens.length; x++) {
    // Each token begins with a one character parameter which specifies the
    // operation of this token (delete, insert, equality).
    var param = tokens[x].substring(1);
    switch (tokens[x].charAt(0)) {
      case '+':
        try {
          diffs[diffsLength++] = [DIFF_INSERT, decodeURI(param)];
        } catch (ex) {
          // Malformed URI sequence.
          throw new Error('Illegal escape in diff_fromDelta: ' + param);
        }
        break;
      case '-':
        // Fall through.
      case '=':
        var n = parseInt(param, 10);
        if (isNaN(n) || n < 0) {
          throw new Error('Invalid number in diff_fromDelta: ' + param);
        }
        var text = text1.substring(pointer, pointer += n);
        if (tokens[x].charAt(0) == '=') {
          diffs[diffsLength++] = [DIFF_EQUAL, text];
        } else {
          diffs[diffsLength++] = [DIFF_DELETE, text];
        }
        break;
      default:
        // Blank tokens are ok (from a trailing \t).
        // Anything else is an error.
        if (tokens[x]) {
          throw new Error('Invalid diff operation in diff_fromDelta: ' +
                          tokens[x]);
        }
    }
  }
  if (pointer != text1.length) {
    throw new Error('Delta length (' + pointer +
        ') does not equal source text length (' + text1.length + ').');
  }
  return diffs;
};


//  MATCH FUNCTIONS


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc'.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 */
diff_match_patch.prototype.match_main = function(text, pattern, loc) {
  // Check for null inputs.
  if (text == null || pattern == null || loc == null) {
    throw new Error('Null input. (match_main)');
  }

  loc = Math.max(0, Math.min(loc, text.length));
  if (text == pattern) {
    // Shortcut (potentially not guaranteed by the algorithm)
    return 0;
  } else if (!text.length) {
    // Nothing to match.
    return -1;
  } else if (text.substring(loc, loc + pattern.length) == pattern) {
    // Perfect match at the perfect spot!  (Includes case of null pattern)
    return loc;
  } else {
    // Do a fuzzy compare.
    return this.match_bitap_(text, pattern, loc);
  }
};


/**
 * Locate the best instance of 'pattern' in 'text' near 'loc' using the
 * Bitap algorithm.
 * @param {string} text The text to search.
 * @param {string} pattern The pattern to search for.
 * @param {number} loc The location to search around.
 * @return {number} Best match index or -1.
 * @private
 */
diff_match_patch.prototype.match_bitap_ = function(text, pattern, loc) {
  if (pattern.length > this.Match_MaxBits) {
    throw new Error('Pattern too long for this browser.');
  }

  // Initialise the alphabet.
  var s = this.match_alphabet_(pattern);

  var dmp = this;  // 'this' becomes 'window' in a closure.

  /**
   * Compute and return the score for a match with e errors and x location.
   * Accesses loc and pattern through being a closure.
   * @param {number} e Number of errors in match.
   * @param {number} x Location of match.
   * @return {number} Overall score for match (0.0 = good, 1.0 = bad).
   * @private
   */
  function match_bitapScore_(e, x) {
    var accuracy = e / pattern.length;
    var proximity = Math.abs(loc - x);
    if (!dmp.Match_Distance) {
      // Dodge divide by zero error.
      return proximity ? 1.0 : accuracy;
    }
    return accuracy + (proximity / dmp.Match_Distance);
  }

  // Highest score beyond which we give up.
  var score_threshold = this.Match_Threshold;
  // Is there a nearby exact match? (speedup)
  var best_loc = text.indexOf(pattern, loc);
  if (best_loc != -1) {
    score_threshold = Math.min(match_bitapScore_(0, best_loc), score_threshold);
    // What about in the other direction? (speedup)
    best_loc = text.lastIndexOf(pattern, loc + pattern.length);
    if (best_loc != -1) {
      score_threshold =
          Math.min(match_bitapScore_(0, best_loc), score_threshold);
    }
  }

  // Initialise the bit arrays.
  var matchmask = 1 << (pattern.length - 1);
  best_loc = -1;

  var bin_min, bin_mid;
  var bin_max = pattern.length + text.length;
  var last_rd;
  for (var d = 0; d < pattern.length; d++) {
    // Scan for the best match; each iteration allows for one more error.
    // Run a binary search to determine how far from 'loc' we can stray at this
    // error level.
    bin_min = 0;
    bin_mid = bin_max;
    while (bin_min < bin_mid) {
      if (match_bitapScore_(d, loc + bin_mid) <= score_threshold) {
        bin_min = bin_mid;
      } else {
        bin_max = bin_mid;
      }
      bin_mid = Math.floor((bin_max - bin_min) / 2 + bin_min);
    }
    // Use the result from this iteration as the maximum for the next.
    bin_max = bin_mid;
    var start = Math.max(1, loc - bin_mid + 1);
    var finish = Math.min(loc + bin_mid, text.length) + pattern.length;

    var rd = Array(finish + 2);
    rd[finish + 1] = (1 << d) - 1;
    for (var j = finish; j >= start; j--) {
      // The alphabet (s) is a sparse hash, so the following line generates
      // warnings.
      var charMatch = s[text.charAt(j - 1)];
      if (d === 0) {  // First pass: exact match.
        rd[j] = ((rd[j + 1] << 1) | 1) & charMatch;
      } else {  // Subsequent passes: fuzzy match.
        rd[j] = (((rd[j + 1] << 1) | 1) & charMatch) |
                (((last_rd[j + 1] | last_rd[j]) << 1) | 1) |
                last_rd[j + 1];
      }
      if (rd[j] & matchmask) {
        var score = match_bitapScore_(d, j - 1);
        // This match will almost certainly be better than any existing match.
        // But check anyway.
        if (score <= score_threshold) {
          // Told you so.
          score_threshold = score;
          best_loc = j - 1;
          if (best_loc > loc) {
            // When passing loc, don't exceed our current distance from loc.
            start = Math.max(1, 2 * loc - best_loc);
          } else {
            // Already passed loc, downhill from here on in.
            break;
          }
        }
      }
    }
    // No hope for a (better) match at greater error levels.
    if (match_bitapScore_(d + 1, loc) > score_threshold) {
      break;
    }
    last_rd = rd;
  }
  return best_loc;
};


/**
 * Initialise the alphabet for the Bitap algorithm.
 * @param {string} pattern The text to encode.
 * @return {!Object} Hash of character locations.
 * @private
 */
diff_match_patch.prototype.match_alphabet_ = function(pattern) {
  var s = {};
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] = 0;
  }
  for (var i = 0; i < pattern.length; i++) {
    s[pattern.charAt(i)] |= 1 << (pattern.length - i - 1);
  }
  return s;
};


//  PATCH FUNCTIONS


/**
 * Increase the context until it is unique,
 * but don't let the pattern expand beyond Match_MaxBits.
 * @param {!diff_match_patch.patch_obj} patch The patch to grow.
 * @param {string} text Source text.
 * @private
 */
diff_match_patch.prototype.patch_addContext_ = function(patch, text) {
  if (text.length == 0) {
    return;
  }
  var pattern = text.substring(patch.start2, patch.start2 + patch.length1);
  var padding = 0;

  // Look for the first and last matches of pattern in text.  If two different
  // matches are found, increase the pattern length.
  while (text.indexOf(pattern) != text.lastIndexOf(pattern) &&
         pattern.length < this.Match_MaxBits - this.Patch_Margin -
         this.Patch_Margin) {
    padding += this.Patch_Margin;
    pattern = text.substring(patch.start2 - padding,
                             patch.start2 + patch.length1 + padding);
  }
  // Add one chunk for good luck.
  padding += this.Patch_Margin;

  // Add the prefix.
  var prefix = text.substring(patch.start2 - padding, patch.start2);
  if (prefix) {
    patch.diffs.unshift([DIFF_EQUAL, prefix]);
  }
  // Add the suffix.
  var suffix = text.substring(patch.start2 + patch.length1,
                              patch.start2 + patch.length1 + padding);
  if (suffix) {
    patch.diffs.push([DIFF_EQUAL, suffix]);
  }

  // Roll back the start points.
  patch.start1 -= prefix.length;
  patch.start2 -= prefix.length;
  // Extend the lengths.
  patch.length1 += prefix.length + suffix.length;
  patch.length2 += prefix.length + suffix.length;
};


/**
 * Compute a list of patches to turn text1 into text2.
 * Use diffs if provided, otherwise compute it ourselves.
 * There are four ways to call this function, depending on what data is
 * available to the caller:
 * Method 1:
 * a = text1, b = text2
 * Method 2:
 * a = diffs
 * Method 3 (optimal):
 * a = text1, b = diffs
 * Method 4 (deprecated, use method 3):
 * a = text1, b = text2, c = diffs
 *
 * @param {string|!Array.<!diff_match_patch.Diff>} a text1 (methods 1,3,4) or
 * Array of diff tuples for text1 to text2 (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_b text2 (methods 1,4) or
 * Array of diff tuples for text1 to text2 (method 3) or undefined (method 2).
 * @param {string|!Array.<!diff_match_patch.Diff>} opt_c Array of diff tuples
 * for text1 to text2 (method 4) or undefined (methods 1,2,3).
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_make = function(a, opt_b, opt_c) {
  var text1, diffs;
  if (typeof a == 'string' && typeof opt_b == 'string' &&
      typeof opt_c == 'undefined') {
    // Method 1: text1, text2
    // Compute diffs from text1 and text2.
    text1 = /** @type {string} */(a);
    diffs = this.diff_main(text1, /** @type {string} */(opt_b), true);
    if (diffs.length > 2) {
      this.diff_cleanupSemantic(diffs);
      this.diff_cleanupEfficiency(diffs);
    }
  } else if (a && typeof a == 'object' && typeof opt_b == 'undefined' &&
      typeof opt_c == 'undefined') {
    // Method 2: diffs
    // Compute text1 from diffs.
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(a);
    text1 = this.diff_text1(diffs);
  } else if (typeof a == 'string' && opt_b && typeof opt_b == 'object' &&
      typeof opt_c == 'undefined') {
    // Method 3: text1, diffs
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_b);
  } else if (typeof a == 'string' && typeof opt_b == 'string' &&
      opt_c && typeof opt_c == 'object') {
    // Method 4: text1, text2, diffs
    // text2 is not used.
    text1 = /** @type {string} */(a);
    diffs = /** @type {!Array.<!diff_match_patch.Diff>} */(opt_c);
  } else {
    throw new Error('Unknown call format to patch_make.');
  }

  if (diffs.length === 0) {
    return [];  // Get rid of the null case.
  }
  var patches = [];
  var patch = new diff_match_patch.patch_obj();
  var patchDiffLength = 0;  // Keeping our own length var is faster in JS.
  var char_count1 = 0;  // Number of characters into the text1 string.
  var char_count2 = 0;  // Number of characters into the text2 string.
  // Start with text1 (prepatch_text) and apply the diffs until we arrive at
  // text2 (postpatch_text).  We recreate the patches one by one to determine
  // context info.
  var prepatch_text = text1;
  var postpatch_text = text1;
  for (var x = 0; x < diffs.length; x++) {
    var diff_type = diffs[x][0];
    var diff_text = diffs[x][1];

    if (!patchDiffLength && diff_type !== DIFF_EQUAL) {
      // A new patch starts here.
      patch.start1 = char_count1;
      patch.start2 = char_count2;
    }

    switch (diff_type) {
      case DIFF_INSERT:
        patch.diffs[patchDiffLength++] = diffs[x];
        patch.length2 += diff_text.length;
        postpatch_text = postpatch_text.substring(0, char_count2) + diff_text +
                         postpatch_text.substring(char_count2);
        break;
      case DIFF_DELETE:
        patch.length1 += diff_text.length;
        patch.diffs[patchDiffLength++] = diffs[x];
        postpatch_text = postpatch_text.substring(0, char_count2) +
                         postpatch_text.substring(char_count2 +
                             diff_text.length);
        break;
      case DIFF_EQUAL:
        if (diff_text.length <= 2 * this.Patch_Margin &&
            patchDiffLength && diffs.length != x + 1) {
          // Small equality inside a patch.
          patch.diffs[patchDiffLength++] = diffs[x];
          patch.length1 += diff_text.length;
          patch.length2 += diff_text.length;
        } else if (diff_text.length >= 2 * this.Patch_Margin) {
          // Time for a new patch.
          if (patchDiffLength) {
            this.patch_addContext_(patch, prepatch_text);
            patches.push(patch);
            patch = new diff_match_patch.patch_obj();
            patchDiffLength = 0;
            // Unlike Unidiff, our patch lists have a rolling context.
            // http://code.google.com/p/google-diff-match-patch/wiki/Unidiff
            // Update prepatch text & pos to reflect the application of the
            // just completed patch.
            prepatch_text = postpatch_text;
            char_count1 = char_count2;
          }
        }
        break;
    }

    // Update the current character count.
    if (diff_type !== DIFF_INSERT) {
      char_count1 += diff_text.length;
    }
    if (diff_type !== DIFF_DELETE) {
      char_count2 += diff_text.length;
    }
  }
  // Pick up the leftover patch if not empty.
  if (patchDiffLength) {
    this.patch_addContext_(patch, prepatch_text);
    patches.push(patch);
  }

  return patches;
};


/**
 * Given an array of patches, return another array that is identical.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 */
diff_match_patch.prototype.patch_deepCopy = function(patches) {
  // Making deep copies is hard in JavaScript.
  var patchesCopy = [];
  for (var x = 0; x < patches.length; x++) {
    var patch = patches[x];
    var patchCopy = new diff_match_patch.patch_obj();
    patchCopy.diffs = [];
    for (var y = 0; y < patch.diffs.length; y++) {
      patchCopy.diffs[y] = patch.diffs[y].slice();
    }
    patchCopy.start1 = patch.start1;
    patchCopy.start2 = patch.start2;
    patchCopy.length1 = patch.length1;
    patchCopy.length2 = patch.length2;
    patchesCopy[x] = patchCopy;
  }
  return patchesCopy;
};


/**
 * Merge a set of patches onto the text.  Return a patched text, as well
 * as a list of true/false values indicating which patches were applied.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @param {string} text Old text.
 * @return {!Array.<string|!Array.<boolean>>} Two element Array, containing the
 *      new text and an array of boolean values.
 */
diff_match_patch.prototype.patch_apply = function(patches, text) {
  if (patches.length == 0) {
    return [text, []];
  }

  // Deep copy the patches so that no changes are made to originals.
  patches = this.patch_deepCopy(patches);

  var nullPadding = this.patch_addPadding(patches);
  text = nullPadding + text + nullPadding;

  this.patch_splitMax(patches);
  // delta keeps track of the offset between the expected and actual location
  // of the previous patch.  If there are patches expected at positions 10 and
  // 20, but the first patch was found at 12, delta is 2 and the second patch
  // has an effective expected position of 22.
  var delta = 0;
  var results = [];
  for (var x = 0; x < patches.length; x++) {
    var expected_loc = patches[x].start2 + delta;
    var text1 = this.diff_text1(patches[x].diffs);
    var start_loc;
    var end_loc = -1;
    if (text1.length > this.Match_MaxBits) {
      // patch_splitMax will only provide an oversized pattern in the case of
      // a monster delete.
      start_loc = this.match_main(text, text1.substring(0, this.Match_MaxBits),
                                  expected_loc);
      if (start_loc != -1) {
        end_loc = this.match_main(text,
            text1.substring(text1.length - this.Match_MaxBits),
            expected_loc + text1.length - this.Match_MaxBits);
        if (end_loc == -1 || start_loc >= end_loc) {
          // Can't find valid trailing context.  Drop this patch.
          start_loc = -1;
        }
      }
    } else {
      start_loc = this.match_main(text, text1, expected_loc);
    }
    if (start_loc == -1) {
      // No match found.  :(
      results[x] = false;
      // Subtract the delta for this failed patch from subsequent patches.
      delta -= patches[x].length2 - patches[x].length1;
    } else {
      // Found a match.  :)
      results[x] = true;
      delta = start_loc - expected_loc;
      var text2;
      if (end_loc == -1) {
        text2 = text.substring(start_loc, start_loc + text1.length);
      } else {
        text2 = text.substring(start_loc, end_loc + this.Match_MaxBits);
      }
      if (text1 == text2) {
        // Perfect match, just shove the replacement text in.
        text = text.substring(0, start_loc) +
               this.diff_text2(patches[x].diffs) +
               text.substring(start_loc + text1.length);
      } else {
        // Imperfect match.  Run a diff to get a framework of equivalent
        // indices.
        var diffs = this.diff_main(text1, text2, false);
        if (text1.length > this.Match_MaxBits &&
            this.diff_levenshtein(diffs) / text1.length >
            this.Patch_DeleteThreshold) {
          // The end points match, but the content is unacceptably bad.
          results[x] = false;
        } else {
          this.diff_cleanupSemanticLossless(diffs);
          var index1 = 0;
          var index2;
          for (var y = 0; y < patches[x].diffs.length; y++) {
            var mod = patches[x].diffs[y];
            if (mod[0] !== DIFF_EQUAL) {
              index2 = this.diff_xIndex(diffs, index1);
            }
            if (mod[0] === DIFF_INSERT) {  // Insertion
              text = text.substring(0, start_loc + index2) + mod[1] +
                     text.substring(start_loc + index2);
            } else if (mod[0] === DIFF_DELETE) {  // Deletion
              text = text.substring(0, start_loc + index2) +
                     text.substring(start_loc + this.diff_xIndex(diffs,
                         index1 + mod[1].length));
            }
            if (mod[0] !== DIFF_DELETE) {
              index1 += mod[1].length;
            }
          }
        }
      }
    }
  }
  // Strip the padding off.
  text = text.substring(nullPadding.length, text.length - nullPadding.length);
  return [text, results];
};


/**
 * Add some padding on text start and end so that edges can match something.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} The padding string added to each side.
 */
diff_match_patch.prototype.patch_addPadding = function(patches) {
  var paddingLength = this.Patch_Margin;
  var nullPadding = '';
  for (var x = 1; x <= paddingLength; x++) {
    nullPadding += String.fromCharCode(x);
  }

  // Bump all the patches forward.
  for (var x = 0; x < patches.length; x++) {
    patches[x].start1 += paddingLength;
    patches[x].start2 += paddingLength;
  }

  // Add some padding on start of first diff.
  var patch = patches[0];
  var diffs = patch.diffs;
  if (diffs.length == 0 || diffs[0][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.unshift([DIFF_EQUAL, nullPadding]);
    patch.start1 -= paddingLength;  // Should be 0.
    patch.start2 -= paddingLength;  // Should be 0.
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[0][1].length) {
    // Grow first equality.
    var extraLength = paddingLength - diffs[0][1].length;
    diffs[0][1] = nullPadding.substring(diffs[0][1].length) + diffs[0][1];
    patch.start1 -= extraLength;
    patch.start2 -= extraLength;
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  // Add some padding on end of last diff.
  patch = patches[patches.length - 1];
  diffs = patch.diffs;
  if (diffs.length == 0 || diffs[diffs.length - 1][0] != DIFF_EQUAL) {
    // Add nullPadding equality.
    diffs.push([DIFF_EQUAL, nullPadding]);
    patch.length1 += paddingLength;
    patch.length2 += paddingLength;
  } else if (paddingLength > diffs[diffs.length - 1][1].length) {
    // Grow last equality.
    var extraLength = paddingLength - diffs[diffs.length - 1][1].length;
    diffs[diffs.length - 1][1] += nullPadding.substring(0, extraLength);
    patch.length1 += extraLength;
    patch.length2 += extraLength;
  }

  return nullPadding;
};


/**
 * Look through the patches and break up any which are longer than the maximum
 * limit of the match algorithm.
 * Intended to be called only from within patch_apply.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 */
diff_match_patch.prototype.patch_splitMax = function(patches) {
  var patch_size = this.Match_MaxBits;
  for (var x = 0; x < patches.length; x++) {
    if (patches[x].length1 <= patch_size) {
      continue;
    }
    var bigpatch = patches[x];
    // Remove the big old patch.
    patches.splice(x--, 1);
    var start1 = bigpatch.start1;
    var start2 = bigpatch.start2;
    var precontext = '';
    while (bigpatch.diffs.length !== 0) {
      // Create one of several smaller patches.
      var patch = new diff_match_patch.patch_obj();
      var empty = true;
      patch.start1 = start1 - precontext.length;
      patch.start2 = start2 - precontext.length;
      if (precontext !== '') {
        patch.length1 = patch.length2 = precontext.length;
        patch.diffs.push([DIFF_EQUAL, precontext]);
      }
      while (bigpatch.diffs.length !== 0 &&
             patch.length1 < patch_size - this.Patch_Margin) {
        var diff_type = bigpatch.diffs[0][0];
        var diff_text = bigpatch.diffs[0][1];
        if (diff_type === DIFF_INSERT) {
          // Insertions are harmless.
          patch.length2 += diff_text.length;
          start2 += diff_text.length;
          patch.diffs.push(bigpatch.diffs.shift());
          empty = false;
        } else if (diff_type === DIFF_DELETE && patch.diffs.length == 1 &&
                   patch.diffs[0][0] == DIFF_EQUAL &&
                   diff_text.length > 2 * patch_size) {
          // This is a large deletion.  Let it pass in one chunk.
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          empty = false;
          patch.diffs.push([diff_type, diff_text]);
          bigpatch.diffs.shift();
        } else {
          // Deletion or equality.  Only take as much as we can stomach.
          diff_text = diff_text.substring(0,
              patch_size - patch.length1 - this.Patch_Margin);
          patch.length1 += diff_text.length;
          start1 += diff_text.length;
          if (diff_type === DIFF_EQUAL) {
            patch.length2 += diff_text.length;
            start2 += diff_text.length;
          } else {
            empty = false;
          }
          patch.diffs.push([diff_type, diff_text]);
          if (diff_text == bigpatch.diffs[0][1]) {
            bigpatch.diffs.shift();
          } else {
            bigpatch.diffs[0][1] =
                bigpatch.diffs[0][1].substring(diff_text.length);
          }
        }
      }
      // Compute the head context for the next patch.
      precontext = this.diff_text2(patch.diffs);
      precontext =
          precontext.substring(precontext.length - this.Patch_Margin);
      // Append the end context for this patch.
      var postcontext = this.diff_text1(bigpatch.diffs)
                            .substring(0, this.Patch_Margin);
      if (postcontext !== '') {
        patch.length1 += postcontext.length;
        patch.length2 += postcontext.length;
        if (patch.diffs.length !== 0 &&
            patch.diffs[patch.diffs.length - 1][0] === DIFF_EQUAL) {
          patch.diffs[patch.diffs.length - 1][1] += postcontext;
        } else {
          patch.diffs.push([DIFF_EQUAL, postcontext]);
        }
      }
      if (!empty) {
        patches.splice(++x, 0, patch);
      }
    }
  }
};


/**
 * Take a list of patches and return a textual representation.
 * @param {!Array.<!diff_match_patch.patch_obj>} patches Array of Patch objects.
 * @return {string} Text representation of patches.
 */
diff_match_patch.prototype.patch_toText = function(patches) {
  var text = [];
  for (var x = 0; x < patches.length; x++) {
    text[x] = patches[x];
  }
  return text.join('');
};


/**
 * Parse a textual representation of patches and return a list of Patch objects.
 * @param {string} textline Text representation of patches.
 * @return {!Array.<!diff_match_patch.patch_obj>} Array of Patch objects.
 * @throws {!Error} If invalid input.
 */
diff_match_patch.prototype.patch_fromText = function(textline) {
  var patches = [];
  if (!textline) {
    return patches;
  }
  var text = textline.split('\n');
  var textPointer = 0;
  var patchHeader = /^@@ -(\d+),?(\d*) \+(\d+),?(\d*) @@$/;
  while (textPointer < text.length) {
    var m = text[textPointer].match(patchHeader);
    if (!m) {
      throw new Error('Invalid patch string: ' + text[textPointer]);
    }
    var patch = new diff_match_patch.patch_obj();
    patches.push(patch);
    patch.start1 = parseInt(m[1], 10);
    if (m[2] === '') {
      patch.start1--;
      patch.length1 = 1;
    } else if (m[2] == '0') {
      patch.length1 = 0;
    } else {
      patch.start1--;
      patch.length1 = parseInt(m[2], 10);
    }

    patch.start2 = parseInt(m[3], 10);
    if (m[4] === '') {
      patch.start2--;
      patch.length2 = 1;
    } else if (m[4] == '0') {
      patch.length2 = 0;
    } else {
      patch.start2--;
      patch.length2 = parseInt(m[4], 10);
    }
    textPointer++;

    while (textPointer < text.length) {
      var sign = text[textPointer].charAt(0);
      try {
        var line = decodeURI(text[textPointer].substring(1));
      } catch (ex) {
        // Malformed URI sequence.
        throw new Error('Illegal escape in patch_fromText: ' + line);
      }
      if (sign == '-') {
        // Deletion.
        patch.diffs.push([DIFF_DELETE, line]);
      } else if (sign == '+') {
        // Insertion.
        patch.diffs.push([DIFF_INSERT, line]);
      } else if (sign == ' ') {
        // Minor equality.
        patch.diffs.push([DIFF_EQUAL, line]);
      } else if (sign == '@') {
        // Start of next patch.
        break;
      } else if (sign === '') {
        // Blank line?  Whatever.
      } else {
        // WTF?
        throw new Error('Invalid patch mode "' + sign + '" in: ' + line);
      }
      textPointer++;
    }
  }
  return patches;
};


/**
 * Class representing one patch operation.
 * @constructor
 */
diff_match_patch.patch_obj = function() {
  /** @type {!Array.<!diff_match_patch.Diff>} */
  this.diffs = [];
  /** @type {?number} */
  this.start1 = null;
  /** @type {?number} */
  this.start2 = null;
  /** @type {number} */
  this.length1 = 0;
  /** @type {number} */
  this.length2 = 0;
};


/**
 * Emmulate GNU diff's format.
 * Header: @@ -382,8 +481,9 @@
 * Indicies are printed as 1-based, not 0-based.
 * @return {string} The GNU diff string.
 */
diff_match_patch.patch_obj.prototype.toString = function() {
  var coords1, coords2;
  if (this.length1 === 0) {
    coords1 = this.start1 + ',0';
  } else if (this.length1 == 1) {
    coords1 = this.start1 + 1;
  } else {
    coords1 = (this.start1 + 1) + ',' + this.length1;
  }
  if (this.length2 === 0) {
    coords2 = this.start2 + ',0';
  } else if (this.length2 == 1) {
    coords2 = this.start2 + 1;
  } else {
    coords2 = (this.start2 + 1) + ',' + this.length2;
  }
  var text = ['@@ -' + coords1 + ' +' + coords2 + ' @@\n'];
  var op;
  // Escape the body of the patch with %xx notation.
  for (var x = 0; x < this.diffs.length; x++) {
    switch (this.diffs[x][0]) {
      case DIFF_INSERT:
        op = '+';
        break;
      case DIFF_DELETE:
        op = '-';
        break;
      case DIFF_EQUAL:
        op = ' ';
        break;
    }
    text[x + 1] = op + encodeURI(this.diffs[x][1]) + '\n';
  }
  return text.join('').replace(/%20/g, ' ');
};


// Export these global variables so that they survive Google's JS compiler.
// In a browser, 'this' will be 'window'.
// Users of node.js should 'require' the uncompressed version since Google's
// JS compiler may break the following exports for non-browser environments.
this['diff_match_patch'] = diff_match_patch;
this['DIFF_DELETE'] = DIFF_DELETE;
this['DIFF_INSERT'] = DIFF_INSERT;
this['DIFF_EQUAL'] = DIFF_EQUAL;

;
// Copyright (c) 2008, 2009 Andrew Cantino
// Copyright (c) 2008, 2009 Kyle Maxwell

function DomPredictionHelper() {};
DomPredictionHelper.prototype = new Object();

DomPredictionHelper.prototype.recursiveNodes = function(e){
  var n;
  if(e.nodeName && e.parentNode && e != document.body) {
    n = this.recursiveNodes(e.parentNode);
  } else {
    n = new Array();
  }
  n.push(e);
  return n;
};

DomPredictionHelper.prototype.escapeCssNames = function(name) {
  if (name) {
    try {
      return name.replace(/\s*sg_\w+\s*/g, '').replace(/\\/g, '\\\\').
                  replace(/\./g, '\\.').replace(/#/g, '\\#').replace(/\>/g, '\\>').replace(/\,/g, '\\,').replace(/\:/g, '\\:');
    } catch(e) {
      console.log('---');
      console.log("exception in escapeCssNames");
      console.log(name);
      console.log('---');
      return '';
    }
  } else {
    return '';
  }
};

DomPredictionHelper.prototype.childElemNumber = function(elem) {
  var count = 0;
  while (elem.previousSibling && (elem = elem.previousSibling)) {
    if (elem.nodeType == 1) count++;
  }
  return count;
};

DomPredictionHelper.prototype.pathOf = function(elem){
  var nodes = this.recursiveNodes(elem);
  var self = this;
  var path = "";
  for(var i = 0; i < nodes.length; i++) {
    var e = nodes[i];
    var tmp = "";
    var ignored = false;
    if (e) {
      tmp += e.nodeName.toLowerCase();
      var escaped = e.id && self.escapeCssNames(new String(e.id));
      if(escaped && escaped.length > 0) tmp += '#' + escaped;

      if(e.nodeName.toLowerCase() == "#document") {
        ignored = true;
      }

      if(e.className) {
        jQuery.each(e.className.split(/ /), function() {
          var escaped = self.escapeCssNames(this);
          if(this == "f_ignore") {
            ignored = true;
          }
          if (this && escaped.length > 0) {
            tmp += '.' + escaped;
          }
        });
      }
      // path += ':nth-child(' + (self.childElemNumber(e) + 1) + ')';
      if(!ignored) {
        path += tmp + ' ';
      }
    }
  }
  if (path.charAt(path.length - 1) == ' ') path = path.substring(0, path.length - 1);

  return path;
};

DomPredictionHelper.prototype.commonCss = function(array) {
  try {
    var dmp = new diff_match_patch();
  } catch(e) {
    throw "Please include the diff_match_patch library.";
  }

  if (typeof array == 'undefined' || array.length == 0) return '';

  var existing_tokens = {};
  var encoded_css_array = this.encodeCssForDiff(array, existing_tokens);

  var collective_common = encoded_css_array.pop();
  jQuery.each(encoded_css_array, function(e) {
    var diff = dmp.diff_main(collective_common, this);
    collective_common = '';
    jQuery.each(diff, function() {
      if (this[0] == 0) collective_common += this[1];
    });
  });
  return this.decodeCss(collective_common, existing_tokens);
};

DomPredictionHelper.prototype.tokenizeCss = function(css_string) {
  var skip = false;
  var word = '';
  var tokens = [];

  var css_string = css_string.replace(/,/, ' , ').replace(/\s+/g, ' ');
  var length = css_string.length;
  var c = '';

  for (var i = 0; i < length; i++){
    c = css_string[i];

    if (skip) {
      skip = false;
    } else if (c == '\\') {
      skip = true;
    } else if (c == '.' || c == ' ' || c == '#' || c == '>' || c == ':' || c == ',') {
      if (word.length > 0) tokens.push(word);
      word = '';
    }
    word += c;
    if (c == ' ' || c == ',') {
      tokens.push(word);
      word = '';
    }
  }
  if (word.length > 0) tokens.push(word);
  return tokens;
};

DomPredictionHelper.prototype.decodeCss = function(string, existing_tokens) {
  var inverted = this.invertObject(existing_tokens);
  var out = '';
  jQuery.each(string.split(''), function() {
    out += inverted[this];
  });
  return this.cleanCss(out);
};

// Encode css paths for diff using unicode codepoints to allow for a large number of tokens.
DomPredictionHelper.prototype.encodeCssForDiff = function(strings, existing_tokens) {
  var codepoint = 50;
  var self = this;
  var strings_out = [];
  jQuery.each(strings, function() {
    var out = new String();
    jQuery.each(self.tokenizeCss(this), function() {
      if (!existing_tokens[this]) {
        existing_tokens[this] = String.fromCharCode(codepoint++);
      }
      out += existing_tokens[this];
    });
    strings_out.push(out);
  });
  return strings_out;
};

DomPredictionHelper.prototype.countMatches = function(css, context) {
  return jQuery(css, context).size();
}

DomPredictionHelper.prototype.simplifyCss = function(css, selected_paths, rejected_paths, context) {
  var self = this;
  var clauses = css.split(",");
  var matches_are_correct = false;
  var best_so_far = [];
  var match_count = 0;
  if (clauses.length == 1 && self.selectorGets('all', selected_paths, css) && self.selectorGets('none', rejected_paths, css)) {
    matches_are_correct = true;
    best_so_far[0] = css;
    match_count = this.countMatches(css, context);
    console.log(match_count + " matches!");
    console.log(context);
  }

  for(var i = 0; i < clauses.length; i++) {
    var css = clauses[i];
    var parts = self.tokenizeCss(css);
    best_so_far[i] = best_so_far[i] || "";

    for (var pass = 0; pass < 4; pass++) {
      for (var part = 0; part < parts.length; part++) {
        var first = parts[part].substring(0,1);
        if (self.wouldLeaveFreeFloatingNthChild(parts, part)) continue;
        if ((pass == 0 && first == ':') || // :nth-child
            (pass == 1 && first != ':' && first != '.' && first != '#' && first != ' ') || // elem, etc.
            (pass == 2 && first == '.') || // classes
            (pass == 3 && first == '#')) // ids
        {
          var tmp = parts[part];
          parts[part] = '';
          var selector = self.cleanCss(parts.join(''));
          if (selector == '') {
            parts[part] = tmp;
            continue;
          }

          var other = clauses.slice(0,i).concat(clauses.slice(i+1))
          other.push(selector);
          var full_selector = other.join(",");

          if (self.selectorGets('all', selected_paths, full_selector) && self.selectorGets('none', rejected_paths, full_selector)) {
            best_so_far[i] = selector;
            console.log("F: "+selector);
          } else {
            parts[part] = tmp;
          }
        }
      }
    }
  }
  return self.cleanCss(best_so_far.join(" , "));
};

DomPredictionHelper.prototype.wouldLeaveFreeFloatingNthChild = function(parts, part) {
  return (((part - 1 >= 0 && parts[part - 1].substring(0, 1) == ':') &&
           (part - 2 < 0 || parts[part - 2] == ' ') &&
           (part + 1 >= parts.length || parts[part + 1] == ' ')) ||
          ((part + 1 < parts.length && parts[part + 1].substring(0, 1) == ':') &&
           (part + 2 >= parts.length || parts[part + 2] == ' ') &&
           (part - 1 < 0 || parts[part - 1] == ' ')));
};

DomPredictionHelper.prototype.cleanCss = function(css) {
  return css.replace(/\>/, ' > ').replace(/,/, ' , ').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '').replace(/,$/, '');
};

DomPredictionHelper.prototype.getPathsFor = function(arr) {
  var self = this;
  var out = [];
  jQuery.each(arr, function() {
    if (this && this.nodeName) {
      out.push(self.pathOf(this));
    }
  })
  return out;
};

DomPredictionHelper.prototype.predictCss = function(s, r) {
  var self = this;
  var context = $(s[0]).parent("body");

  if (s.length == 0) return '';
  var selected_paths = self.getPathsFor(s);
  var rejected_paths = self.getPathsFor(r);

  var css = self.commonCss(selected_paths);
  var simplest = self.simplifyCss(css, selected_paths, rejected_paths, context);

  // Do we get off easy?
  if (simplest.length > 0) return simplest;

  // Okay, then make a union and possibly try to reduce subsets.
  var union = '';
  jQuery.each(s, function() {
    union = self.pathOf(this) + ", " + union;
  });
  union = self.cleanCss(union);

  return self.simplifyCss(union, selected_paths, rejected_paths, context);
};

DomPredictionHelper.prototype.fragmentSelector = function(selector) {
  var self = this;
  var out = [];
  jQuery.each(selector.split(/\,/), function() {
    var out2 = [];
    jQuery.each(self.cleanCss(this).split(/\s+/), function() {
      out2.push(self.tokenizeCss(this));
    });
    out.push(out2);
  });
  return out;
};

// Everything in the first selector must be present in the second.
DomPredictionHelper.prototype.selectorBlockMatchesSelectorBlock = function(selector_block1, selector_block2) {
  for (var j = 0; j < selector_block1.length; j++) {
    if (jQuery.inArray(selector_block1[j], selector_block2) == -1) {
      return false;
    }
  }
  return true;
};

// Assumes list is an array of complete CSS selectors represented as strings.
DomPredictionHelper.prototype.selectorGets = function(type, list, the_selector) {
  var self = this;
  var result = true;

  if (list.length == 0 && type == 'all') return false;
  if (list.length == 0 && type == 'none') return true;

  var selectors = self.fragmentSelector(the_selector);

  var cleaned_list = [];
  jQuery.each(list, function() {
    cleaned_list.push(self.fragmentSelector(this)[0]);
  });

  jQuery.each(selectors, function() {
    if (!result) return;
    var selector = this;
    jQuery.each(cleaned_list, function(pos) {
      if (!result || this == '') return;
      if (self._selectorGets(this, selector)) {
        if (type == 'none') result = false;
        cleaned_list[pos] = '';
      }
    });
  });

  if (type == 'all' && cleaned_list.join('').length > 0) { // Some candidates didn't get matched.
    result = false;
  }

  return result;
};

DomPredictionHelper.prototype._selectorGets = function(candidate_as_blocks, selector_as_blocks) {
  var cannot_match = false;
  var position = candidate_as_blocks.length - 1;
  for (var i = selector_as_blocks.length - 1; i > -1; i--) {
    if (cannot_match) break;
    if (i == selector_as_blocks.length - 1) { // First element on right.
      // If we don't match the first element, we cannot match.
      if (!this.selectorBlockMatchesSelectorBlock(selector_as_blocks[i], candidate_as_blocks[position])) cannot_match = true;
      position--;
    } else {
      var found = false;
      while (position > -1 && !found) {
        found = this.selectorBlockMatchesSelectorBlock(selector_as_blocks[i], candidate_as_blocks[position]);
        position--;
      }
      if (!found) cannot_match = true;
    }
  }
  return !cannot_match;
};

DomPredictionHelper.prototype.invertObject = function(object) {
  var new_object = {};
  jQuery.each(object, function(key, value) {
    new_object[value] = key;
  });
  return new_object;
};

DomPredictionHelper.prototype.cssToXPath = function(css_string) {
  var tokens = this.tokenizeCss(css_string);
  if (tokens[0] && tokens[0] == ' ') tokens.splice(0, 1);
  if (tokens[tokens.length - 1] && tokens[tokens.length - 1] == ' ') tokens.splice(tokens.length - 1, 1);

  var css_block = [];
  var out = "";

  for(var i = 0; i < tokens.length; i++) {
    if (tokens[i] == ' ') {
      out += this.cssToXPathBlockHelper(css_block);
      css_block = [];
    } else {
      css_block.push(tokens[i]);
    }
  }

  return out + this.cssToXPathBlockHelper(css_block);
};

// Process a block (html entity, class(es), id, :nth-child()) of css
DomPredictionHelper.prototype.cssToXPathBlockHelper = function(css_block) {
  if (css_block.length == 0) return '//';
  var out = '//';
  var first = css_block[0].substring(0,1);

  if (first == ',') return " | ";

  if (jQuery.inArray(first, [':', '#', '.']) != -1) {
    out += '*';
  }

  var expressions = [];
  var re = null;

  for(var i = 0; i < css_block.length; i++) {
    var current = css_block[i];
    first = current.substring(0,1);
    var rest = current.substring(1);

    if (first == ':') {
      // We only support :nth-child(n) at the moment.
      if (re = rest.match(/^nth-child\((\d+)\)$/))
        expressions.push('(((count(preceding-sibling::*) + 1) = ' + re[1] + ') and parent::*)');
    } else if (first == '.') {
      expressions.push('contains(concat( " ", @class, " " ), concat( " ", "' + rest + '", " " ))');
    } else if (first == '#') {
      expressions.push('(@id = "' + rest + '")');
    } else if (first == ',') {
    } else {
      out += current;
    }
  }

  if (expressions.length > 0) out += '[';
  for (var i = 0; i < expressions.length; i++) {
    out += expressions[i];
    if (i < expressions.length - 1) out += ' and ';
  }
  if (expressions.length > 0) out += ']';
  return out;
};

;
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
;
/*!
 * jQuery JavaScript Library v1.7.2
 * http://jquery.com/
 *
 * Copyright 2011, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://jquery.org/license
 *
 * Includes Sizzle.js
 * http://sizzlejs.com/
 * Copyright 2011, The Dojo Foundation
 * Released under the MIT, BSD, and GPL Licenses.
 *
 * Date: Wed Mar 21 12:46:34 2012 -0700
 */
(function( window, undefined ) {

// Use the correct document accordingly with window argument (sandbox)
var document = window.document,
	navigator = window.navigator,
	location = window.location;
var jQuery = (function() {

// Define a local copy of jQuery
var jQuery = function( selector, context ) {
		// The jQuery object is actually just the init constructor 'enhanced'
		return new jQuery.fn.init( selector, context, rootjQuery );
	},

	// Map over jQuery in case of overwrite
	_jQuery = window.jQuery,

	// Map over the $ in case of overwrite
	_$ = window.$,

	// A central reference to the root jQuery(document)
	rootjQuery,

	// A simple way to check for HTML strings or ID strings
	// Prioritize #id over <tag> to avoid XSS via location.hash (#9521)
	quickExpr = /^(?:[^#<]*(<[\w\W]+>)[^>]*$|#([\w\-]*)$)/,

	// Check if a string has a non-whitespace character in it
	rnotwhite = /\S/,

	// Used for trimming whitespace
	trimLeft = /^\s+/,
	trimRight = /\s+$/,

	// Match a standalone tag
	rsingleTag = /^<(\w+)\s*\/?>(?:<\/\1>)?$/,

	// JSON RegExp
	rvalidchars = /^[\],:{}\s]*$/,
	rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,
	rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,
	rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g,

	// Useragent RegExp
	rwebkit = /(webkit)[ \/]([\w.]+)/,
	ropera = /(opera)(?:.*version)?[ \/]([\w.]+)/,
	rmsie = /(msie) ([\w.]+)/,
	rmozilla = /(mozilla)(?:.*? rv:([\w.]+))?/,

	// Matches dashed string for camelizing
	rdashAlpha = /-([a-z]|[0-9])/ig,
	rmsPrefix = /^-ms-/,

	// Used by jQuery.camelCase as callback to replace()
	fcamelCase = function( all, letter ) {
		return ( letter + "" ).toUpperCase();
	},

	// Keep a UserAgent string for use with jQuery.browser
	userAgent = navigator.userAgent,

	// For matching the engine and version of the browser
	browserMatch,

	// The deferred used on DOM ready
	readyList,

	// The ready event handler
	DOMContentLoaded,

	// Save a reference to some core methods
	toString = Object.prototype.toString,
	hasOwn = Object.prototype.hasOwnProperty,
	push = Array.prototype.push,
	slice = Array.prototype.slice,
	trim = String.prototype.trim,
	indexOf = Array.prototype.indexOf,

	// [[Class]] -> type pairs
	class2type = {};

jQuery.fn = jQuery.prototype = {
	constructor: jQuery,
	init: function( selector, context, rootjQuery ) {
		var match, elem, ret, doc;

		// Handle $(""), $(null), or $(undefined)
		if ( !selector ) {
			return this;
		}

		// Handle $(DOMElement)
		if ( selector.nodeType ) {
			this.context = this[0] = selector;
			this.length = 1;
			return this;
		}

		// The body element only exists once, optimize finding it
		if ( selector === "body" && !context && document.body ) {
			this.context = document;
			this[0] = document.body;
			this.selector = selector;
			this.length = 1;
			return this;
		}

		// Handle HTML strings
		if ( typeof selector === "string" ) {
			// Are we dealing with HTML string or an ID?
			if ( selector.charAt(0) === "<" && selector.charAt( selector.length - 1 ) === ">" && selector.length >= 3 ) {
				// Assume that strings that start and end with <> are HTML and skip the regex check
				match = [ null, selector, null ];

			} else {
				match = quickExpr.exec( selector );
			}

			// Verify a match, and that no context was specified for #id
			if ( match && (match[1] || !context) ) {

				// HANDLE: $(html) -> $(array)
				if ( match[1] ) {
					context = context instanceof jQuery ? context[0] : context;
					doc = ( context ? context.ownerDocument || context : document );

					// If a single string is passed in and it's a single tag
					// just do a createElement and skip the rest
					ret = rsingleTag.exec( selector );

					if ( ret ) {
						if ( jQuery.isPlainObject( context ) ) {
							selector = [ document.createElement( ret[1] ) ];
							jQuery.fn.attr.call( selector, context, true );

						} else {
							selector = [ doc.createElement( ret[1] ) ];
						}

					} else {
						ret = jQuery.buildFragment( [ match[1] ], [ doc ] );
						selector = ( ret.cacheable ? jQuery.clone(ret.fragment) : ret.fragment ).childNodes;
					}

					return jQuery.merge( this, selector );

				// HANDLE: $("#id")
				} else {
					elem = document.getElementById( match[2] );

					// Check parentNode to catch when Blackberry 4.6 returns
					// nodes that are no longer in the document #6963
					if ( elem && elem.parentNode ) {
						// Handle the case where IE and Opera return items
						// by name instead of ID
						if ( elem.id !== match[2] ) {
							return rootjQuery.find( selector );
						}

						// Otherwise, we inject the element directly into the jQuery object
						this.length = 1;
						this[0] = elem;
					}

					this.context = document;
					this.selector = selector;
					return this;
				}

			// HANDLE: $(expr, $(...))
			} else if ( !context || context.jquery ) {
				return ( context || rootjQuery ).find( selector );

			// HANDLE: $(expr, context)
			// (which is just equivalent to: $(context).find(expr)
			} else {
				return this.constructor( context ).find( selector );
			}

		// HANDLE: $(function)
		// Shortcut for document ready
		} else if ( jQuery.isFunction( selector ) ) {
			return rootjQuery.ready( selector );
		}

		if ( selector.selector !== undefined ) {
			this.selector = selector.selector;
			this.context = selector.context;
		}

		return jQuery.makeArray( selector, this );
	},

	// Start with an empty selector
	selector: "",

	// The current version of jQuery being used
	jquery: "1.7.2",

	// The default length of a jQuery object is 0
	length: 0,

	// The number of elements contained in the matched element set
	size: function() {
		return this.length;
	},

	toArray: function() {
		return slice.call( this, 0 );
	},

	// Get the Nth element in the matched element set OR
	// Get the whole matched element set as a clean array
	get: function( num ) {
		return num == null ?

			// Return a 'clean' array
			this.toArray() :

			// Return just the object
			( num < 0 ? this[ this.length + num ] : this[ num ] );
	},

	// Take an array of elements and push it onto the stack
	// (returning the new matched element set)
	pushStack: function( elems, name, selector ) {
		// Build a new jQuery matched element set
		var ret = this.constructor();

		if ( jQuery.isArray( elems ) ) {
			push.apply( ret, elems );

		} else {
			jQuery.merge( ret, elems );
		}

		// Add the old object onto the stack (as a reference)
		ret.prevObject = this;

		ret.context = this.context;

		if ( name === "find" ) {
			ret.selector = this.selector + ( this.selector ? " " : "" ) + selector;
		} else if ( name ) {
			ret.selector = this.selector + "." + name + "(" + selector + ")";
		}

		// Return the newly-formed element set
		return ret;
	},

	// Execute a callback for every element in the matched set.
	// (You can seed the arguments with an array of args, but this is
	// only used internally.)
	each: function( callback, args ) {
		return jQuery.each( this, callback, args );
	},

	ready: function( fn ) {
		// Attach the listeners
		jQuery.bindReady();

		// Add the callback
		readyList.add( fn );

		return this;
	},

	eq: function( i ) {
		i = +i;
		return i === -1 ?
			this.slice( i ) :
			this.slice( i, i + 1 );
	},

	first: function() {
		return this.eq( 0 );
	},

	last: function() {
		return this.eq( -1 );
	},

	slice: function() {
		return this.pushStack( slice.apply( this, arguments ),
			"slice", slice.call(arguments).join(",") );
	},

	map: function( callback ) {
		return this.pushStack( jQuery.map(this, function( elem, i ) {
			return callback.call( elem, i, elem );
		}));
	},

	end: function() {
		return this.prevObject || this.constructor(null);
	},

	// For internal use only.
	// Behaves like an Array's method, not like a jQuery method.
	push: push,
	sort: [].sort,
	splice: [].splice
};

// Give the init function the jQuery prototype for later instantiation
jQuery.fn.init.prototype = jQuery.fn;

jQuery.extend = jQuery.fn.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	// Handle a deep copy situation
	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[1] || {};
		// skip the boolean and the target
		i = 2;
	}

	// Handle case when target is a string or something (possible in deep copy)
	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	// extend jQuery itself if only one argument is passed
	if ( length === i ) {
		target = this;
		--i;
	}

	for ( ; i < length; i++ ) {
		// Only deal with non-null/undefined values
		if ( (options = arguments[ i ]) != null ) {
			// Extend the base object
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				// Prevent never-ending loop
				if ( target === copy ) {
					continue;
				}

				// Recurse if we're merging plain objects or arrays
				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					// Never move original objects, clone them
					target[ name ] = jQuery.extend( deep, clone, copy );

				// Don't bring in undefined values
				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	// Return the modified object
	return target;
};

jQuery.extend({
	noConflict: function( deep ) {
		if ( window.$ === jQuery ) {
			window.$ = _$;
		}

		if ( deep && window.jQuery === jQuery ) {
			window.jQuery = _jQuery;
		}

		return jQuery;
	},

	// Is the DOM ready to be used? Set to true once it occurs.
	isReady: false,

	// A counter to track how many items to wait for before
	// the ready event fires. See #6781
	readyWait: 1,

	// Hold (or release) the ready event
	holdReady: function( hold ) {
		if ( hold ) {
			jQuery.readyWait++;
		} else {
			jQuery.ready( true );
		}
	},

	// Handle when the DOM is ready
	ready: function( wait ) {
		// Either a released hold or an DOMready/load event and not yet ready
		if ( (wait === true && !--jQuery.readyWait) || (wait !== true && !jQuery.isReady) ) {
			// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
			if ( !document.body ) {
				return setTimeout( jQuery.ready, 1 );
			}

			// Remember that the DOM is ready
			jQuery.isReady = true;

			// If a normal DOM Ready event fired, decrement, and wait if need be
			if ( wait !== true && --jQuery.readyWait > 0 ) {
				return;
			}

			// If there are functions bound, to execute
			readyList.fireWith( document, [ jQuery ] );

			// Trigger any bound ready events
			if ( jQuery.fn.trigger ) {
				jQuery( document ).trigger( "ready" ).off( "ready" );
			}
		}
	},

	bindReady: function() {
		if ( readyList ) {
			return;
		}

		readyList = jQuery.Callbacks( "once memory" );

		// Catch cases where $(document).ready() is called after the
		// browser event has already occurred.
		if ( document.readyState === "complete" ) {
			// Handle it asynchronously to allow scripts the opportunity to delay ready
			return setTimeout( jQuery.ready, 1 );
		}

		// Mozilla, Opera and webkit nightlies currently support this event
		if ( document.addEventListener ) {
			// Use the handy event callback
			document.addEventListener( "DOMContentLoaded", DOMContentLoaded, false );

			// A fallback to window.onload, that will always work
			window.addEventListener( "load", jQuery.ready, false );

		// If IE event model is used
		} else if ( document.attachEvent ) {
			// ensure firing before onload,
			// maybe late but safe also for iframes
			document.attachEvent( "onreadystatechange", DOMContentLoaded );

			// A fallback to window.onload, that will always work
			window.attachEvent( "onload", jQuery.ready );

			// If IE and not a frame
			// continually check to see if the document is ready
			var toplevel = false;

			try {
				toplevel = window.frameElement == null;
			} catch(e) {}

			if ( document.documentElement.doScroll && toplevel ) {
				doScrollCheck();
			}
		}
	},

	// See test/unit/core.js for details concerning isFunction.
	// Since version 1.3, DOM methods and functions like alert
	// aren't supported. They return false on IE (#2968).
	isFunction: function( obj ) {
		return jQuery.type(obj) === "function";
	},

	isArray: Array.isArray || function( obj ) {
		return jQuery.type(obj) === "array";
	},

	isWindow: function( obj ) {
		return obj != null && obj == obj.window;
	},

	isNumeric: function( obj ) {
		return !isNaN( parseFloat(obj) ) && isFinite( obj );
	},

	type: function( obj ) {
		return obj == null ?
			String( obj ) :
			class2type[ toString.call(obj) ] || "object";
	},

	isPlainObject: function( obj ) {
		// Must be an Object.
		// Because of IE, we also have to check the presence of the constructor property.
		// Make sure that DOM nodes and window objects don't pass through, as well
		if ( !obj || jQuery.type(obj) !== "object" || obj.nodeType || jQuery.isWindow( obj ) ) {
			return false;
		}

		try {
			// Not own constructor property must be Object
			if ( obj.constructor &&
				!hasOwn.call(obj, "constructor") &&
				!hasOwn.call(obj.constructor.prototype, "isPrototypeOf") ) {
				return false;
			}
		} catch ( e ) {
			// IE8,9 Will throw exceptions on certain host objects #9897
			return false;
		}

		// Own properties are enumerated firstly, so to speed up,
		// if last one is own, then all properties are own.

		var key;
		for ( key in obj ) {}

		return key === undefined || hasOwn.call( obj, key );
	},

	isEmptyObject: function( obj ) {
		for ( var name in obj ) {
			return false;
		}
		return true;
	},

	error: function( msg ) {
		throw new Error( msg );
	},

	parseJSON: function( data ) {
		if ( typeof data !== "string" || !data ) {
			return null;
		}

		// Make sure leading/trailing whitespace is removed (IE can't handle it)
		data = jQuery.trim( data );

		// Attempt to parse using the native JSON parser first
		if ( window.JSON && window.JSON.parse ) {
			return window.JSON.parse( data );
		}

		// Make sure the incoming data is actual JSON
		// Logic borrowed from http://json.org/json2.js
		if ( rvalidchars.test( data.replace( rvalidescape, "@" )
			.replace( rvalidtokens, "]" )
			.replace( rvalidbraces, "")) ) {

			return ( new Function( "return " + data ) )();

		}
		jQuery.error( "Invalid JSON: " + data );
	},

	// Cross-browser xml parsing
	parseXML: function( data ) {
		if ( typeof data !== "string" || !data ) {
			return null;
		}
		var xml, tmp;
		try {
			if ( window.DOMParser ) { // Standard
				tmp = new DOMParser();
				xml = tmp.parseFromString( data , "text/xml" );
			} else { // IE
				xml = new ActiveXObject( "Microsoft.XMLDOM" );
				xml.async = "false";
				xml.loadXML( data );
			}
		} catch( e ) {
			xml = undefined;
		}
		if ( !xml || !xml.documentElement || xml.getElementsByTagName( "parsererror" ).length ) {
			jQuery.error( "Invalid XML: " + data );
		}
		return xml;
	},

	noop: function() {},

	// Evaluates a script in a global context
	// Workarounds based on findings by Jim Driscoll
	// http://weblogs.java.net/blog/driscoll/archive/2009/09/08/eval-javascript-global-context
	globalEval: function( data ) {
		if ( data && rnotwhite.test( data ) ) {
			// We use execScript on Internet Explorer
			// We use an anonymous function so that context is window
			// rather than jQuery in Firefox
			( window.execScript || function( data ) {
				window[ "eval" ].call( window, data );
			} )( data );
		}
	},

	// Convert dashed to camelCase; used by the css and data modules
	// Microsoft forgot to hump their vendor prefix (#9572)
	camelCase: function( string ) {
		return string.replace( rmsPrefix, "ms-" ).replace( rdashAlpha, fcamelCase );
	},

	nodeName: function( elem, name ) {
		return elem.nodeName && elem.nodeName.toUpperCase() === name.toUpperCase();
	},

	// args is for internal usage only
	each: function( object, callback, args ) {
		var name, i = 0,
			length = object.length,
			isObj = length === undefined || jQuery.isFunction( object );

		if ( args ) {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.apply( object[ name ], args ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.apply( object[ i++ ], args ) === false ) {
						break;
					}
				}
			}

		// A special, fast, case for the most common use of each
		} else {
			if ( isObj ) {
				for ( name in object ) {
					if ( callback.call( object[ name ], name, object[ name ] ) === false ) {
						break;
					}
				}
			} else {
				for ( ; i < length; ) {
					if ( callback.call( object[ i ], i, object[ i++ ] ) === false ) {
						break;
					}
				}
			}
		}

		return object;
	},

	// Use native String.trim function wherever possible
	trim: trim ?
		function( text ) {
			return text == null ?
				"" :
				trim.call( text );
		} :

		// Otherwise use our own trimming functionality
		function( text ) {
			return text == null ?
				"" :
				text.toString().replace( trimLeft, "" ).replace( trimRight, "" );
		},

	// results is for internal usage only
	makeArray: function( array, results ) {
		var ret = results || [];

		if ( array != null ) {
			// The window, strings (and functions) also have 'length'
			// Tweaked logic slightly to handle Blackberry 4.7 RegExp issues #6930
			var type = jQuery.type( array );

			if ( array.length == null || type === "string" || type === "function" || type === "regexp" || jQuery.isWindow( array ) ) {
				push.call( ret, array );
			} else {
				jQuery.merge( ret, array );
			}
		}

		return ret;
	},

	inArray: function( elem, array, i ) {
		var len;

		if ( array ) {
			if ( indexOf ) {
				return indexOf.call( array, elem, i );
			}

			len = array.length;
			i = i ? i < 0 ? Math.max( 0, len + i ) : i : 0;

			for ( ; i < len; i++ ) {
				// Skip accessing in sparse arrays
				if ( i in array && array[ i ] === elem ) {
					return i;
				}
			}
		}

		return -1;
	},

	merge: function( first, second ) {
		var i = first.length,
			j = 0;

		if ( typeof second.length === "number" ) {
			for ( var l = second.length; j < l; j++ ) {
				first[ i++ ] = second[ j ];
			}

		} else {
			while ( second[j] !== undefined ) {
				first[ i++ ] = second[ j++ ];
			}
		}

		first.length = i;

		return first;
	},

	grep: function( elems, callback, inv ) {
		var ret = [], retVal;
		inv = !!inv;

		// Go through the array, only saving the items
		// that pass the validator function
		for ( var i = 0, length = elems.length; i < length; i++ ) {
			retVal = !!callback( elems[ i ], i );
			if ( inv !== retVal ) {
				ret.push( elems[ i ] );
			}
		}

		return ret;
	},

	// arg is for internal usage only
	map: function( elems, callback, arg ) {
		var value, key, ret = [],
			i = 0,
			length = elems.length,
			// jquery objects are treated as arrays
			isArray = elems instanceof jQuery || length !== undefined && typeof length === "number" && ( ( length > 0 && elems[ 0 ] && elems[ length -1 ] ) || length === 0 || jQuery.isArray( elems ) ) ;

		// Go through the array, translating each of the items to their
		if ( isArray ) {
			for ( ; i < length; i++ ) {
				value = callback( elems[ i ], i, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}

		// Go through every key on the object,
		} else {
			for ( key in elems ) {
				value = callback( elems[ key ], key, arg );

				if ( value != null ) {
					ret[ ret.length ] = value;
				}
			}
		}

		// Flatten any nested arrays
		return ret.concat.apply( [], ret );
	},

	// A global GUID counter for objects
	guid: 1,

	// Bind a function to a context, optionally partially applying any
	// arguments.
	proxy: function( fn, context ) {
		if ( typeof context === "string" ) {
			var tmp = fn[ context ];
			context = fn;
			fn = tmp;
		}

		// Quick check to determine if target is callable, in the spec
		// this throws a TypeError, but we will just return undefined.
		if ( !jQuery.isFunction( fn ) ) {
			return undefined;
		}

		// Simulated bind
		var args = slice.call( arguments, 2 ),
			proxy = function() {
				return fn.apply( context, args.concat( slice.call( arguments ) ) );
			};

		// Set the guid of unique handler to the same of original handler, so it can be removed
		proxy.guid = fn.guid = fn.guid || proxy.guid || jQuery.guid++;

		return proxy;
	},

	// Mutifunctional method to get and set values to a collection
	// The value/s can optionally be executed if it's a function
	access: function( elems, fn, key, value, chainable, emptyGet, pass ) {
		var exec,
			bulk = key == null,
			i = 0,
			length = elems.length;

		// Sets many values
		if ( key && typeof key === "object" ) {
			for ( i in key ) {
				jQuery.access( elems, fn, i, key[i], 1, emptyGet, value );
			}
			chainable = 1;

		// Sets one value
		} else if ( value !== undefined ) {
			// Optionally, function values get executed if exec is true
			exec = pass === undefined && jQuery.isFunction( value );

			if ( bulk ) {
				// Bulk operations only iterate when executing function values
				if ( exec ) {
					exec = fn;
					fn = function( elem, key, value ) {
						return exec.call( jQuery( elem ), value );
					};

				// Otherwise they run against the entire set
				} else {
					fn.call( elems, value );
					fn = null;
				}
			}

			if ( fn ) {
				for (; i < length; i++ ) {
					fn( elems[i], key, exec ? value.call( elems[i], i, fn( elems[i], key ) ) : value, pass );
				}
			}

			chainable = 1;
		}

		return chainable ?
			elems :

			// Gets
			bulk ?
				fn.call( elems ) :
				length ? fn( elems[0], key ) : emptyGet;
	},

	now: function() {
		return ( new Date() ).getTime();
	},

	// Use of jQuery.browser is frowned upon.
	// More details: http://docs.jquery.com/Utilities/jQuery.browser
	uaMatch: function( ua ) {
		ua = ua.toLowerCase();

		var match = rwebkit.exec( ua ) ||
			ropera.exec( ua ) ||
			rmsie.exec( ua ) ||
			ua.indexOf("compatible") < 0 && rmozilla.exec( ua ) ||
			[];

		return { browser: match[1] || "", version: match[2] || "0" };
	},

	sub: function() {
		function jQuerySub( selector, context ) {
			return new jQuerySub.fn.init( selector, context );
		}
		jQuery.extend( true, jQuerySub, this );
		jQuerySub.superclass = this;
		jQuerySub.fn = jQuerySub.prototype = this();
		jQuerySub.fn.constructor = jQuerySub;
		jQuerySub.sub = this.sub;
		jQuerySub.fn.init = function init( selector, context ) {
			if ( context && context instanceof jQuery && !(context instanceof jQuerySub) ) {
				context = jQuerySub( context );
			}

			return jQuery.fn.init.call( this, selector, context, rootjQuerySub );
		};
		jQuerySub.fn.init.prototype = jQuerySub.fn;
		var rootjQuerySub = jQuerySub(document);
		return jQuerySub;
	},

	browser: {}
});

// Populate the class2type map
jQuery.each("Boolean Number String Function Array Date RegExp Object".split(" "), function(i, name) {
	class2type[ "[object " + name + "]" ] = name.toLowerCase();
});

browserMatch = jQuery.uaMatch( userAgent );
if ( browserMatch.browser ) {
	jQuery.browser[ browserMatch.browser ] = true;
	jQuery.browser.version = browserMatch.version;
}

// Deprecated, use jQuery.browser.webkit instead
if ( jQuery.browser.webkit ) {
	jQuery.browser.safari = true;
}

// IE doesn't match non-breaking spaces with \s
if ( rnotwhite.test( "\xA0" ) ) {
	trimLeft = /^[\s\xA0]+/;
	trimRight = /[\s\xA0]+$/;
}

// All jQuery objects should point back to these
rootjQuery = jQuery(document);

// Cleanup functions for the document ready method
if ( document.addEventListener ) {
	DOMContentLoaded = function() {
		document.removeEventListener( "DOMContentLoaded", DOMContentLoaded, false );
		jQuery.ready();
	};

} else if ( document.attachEvent ) {
	DOMContentLoaded = function() {
		// Make sure body exists, at least, in case IE gets a little overzealous (ticket #5443).
		if ( document.readyState === "complete" ) {
			document.detachEvent( "onreadystatechange", DOMContentLoaded );
			jQuery.ready();
		}
	};
}

// The DOM ready check for Internet Explorer
function doScrollCheck() {
	if ( jQuery.isReady ) {
		return;
	}

	try {
		// If IE is used, use the trick by Diego Perini
		// http://javascript.nwbox.com/IEContentLoaded/
		document.documentElement.doScroll("left");
	} catch(e) {
		setTimeout( doScrollCheck, 1 );
		return;
	}

	// and execute any waiting functions
	jQuery.ready();
}

return jQuery;

})();


// String to Object flags format cache
var flagsCache = {};

// Convert String-formatted flags into Object-formatted ones and store in cache
function createFlags( flags ) {
	var object = flagsCache[ flags ] = {},
		i, length;
	flags = flags.split( /\s+/ );
	for ( i = 0, length = flags.length; i < length; i++ ) {
		object[ flags[i] ] = true;
	}
	return object;
}

/*
 * Create a callback list using the following parameters:
 *
 *	flags:	an optional list of space-separated flags that will change how
 *			the callback list behaves
 *
 * By default a callback list will act like an event callback list and can be
 * "fired" multiple times.
 *
 * Possible flags:
 *
 *	once:			will ensure the callback list can only be fired once (like a Deferred)
 *
 *	memory:			will keep track of previous values and will call any callback added
 *					after the list has been fired right away with the latest "memorized"
 *					values (like a Deferred)
 *
 *	unique:			will ensure a callback can only be added once (no duplicate in the list)
 *
 *	stopOnFalse:	interrupt callings when a callback returns false
 *
 */
jQuery.Callbacks = function( flags ) {

	// Convert flags from String-formatted to Object-formatted
	// (we check in cache first)
	flags = flags ? ( flagsCache[ flags ] || createFlags( flags ) ) : {};

	var // Actual callback list
		list = [],
		// Stack of fire calls for repeatable lists
		stack = [],
		// Last fire value (for non-forgettable lists)
		memory,
		// Flag to know if list was already fired
		fired,
		// Flag to know if list is currently firing
		firing,
		// First callback to fire (used internally by add and fireWith)
		firingStart,
		// End of the loop when firing
		firingLength,
		// Index of currently firing callback (modified by remove if needed)
		firingIndex,
		// Add one or several callbacks to the list
		add = function( args ) {
			var i,
				length,
				elem,
				type,
				actual;
			for ( i = 0, length = args.length; i < length; i++ ) {
				elem = args[ i ];
				type = jQuery.type( elem );
				if ( type === "array" ) {
					// Inspect recursively
					add( elem );
				} else if ( type === "function" ) {
					// Add if not in unique mode and callback is not in
					if ( !flags.unique || !self.has( elem ) ) {
						list.push( elem );
					}
				}
			}
		},
		// Fire callbacks
		fire = function( context, args ) {
			args = args || [];
			memory = !flags.memory || [ context, args ];
			fired = true;
			firing = true;
			firingIndex = firingStart || 0;
			firingStart = 0;
			firingLength = list.length;
			for ( ; list && firingIndex < firingLength; firingIndex++ ) {
				if ( list[ firingIndex ].apply( context, args ) === false && flags.stopOnFalse ) {
					memory = true; // Mark as halted
					break;
				}
			}
			firing = false;
			if ( list ) {
				if ( !flags.once ) {
					if ( stack && stack.length ) {
						memory = stack.shift();
						self.fireWith( memory[ 0 ], memory[ 1 ] );
					}
				} else if ( memory === true ) {
					self.disable();
				} else {
					list = [];
				}
			}
		},
		// Actual Callbacks object
		self = {
			// Add a callback or a collection of callbacks to the list
			add: function() {
				if ( list ) {
					var length = list.length;
					add( arguments );
					// Do we need to add the callbacks to the
					// current firing batch?
					if ( firing ) {
						firingLength = list.length;
					// With memory, if we're not firing then
					// we should call right away, unless previous
					// firing was halted (stopOnFalse)
					} else if ( memory && memory !== true ) {
						firingStart = length;
						fire( memory[ 0 ], memory[ 1 ] );
					}
				}
				return this;
			},
			// Remove a callback from the list
			remove: function() {
				if ( list ) {
					var args = arguments,
						argIndex = 0,
						argLength = args.length;
					for ( ; argIndex < argLength ; argIndex++ ) {
						for ( var i = 0; i < list.length; i++ ) {
							if ( args[ argIndex ] === list[ i ] ) {
								// Handle firingIndex and firingLength
								if ( firing ) {
									if ( i <= firingLength ) {
										firingLength--;
										if ( i <= firingIndex ) {
											firingIndex--;
										}
									}
								}
								// Remove the element
								list.splice( i--, 1 );
								// If we have some unicity property then
								// we only need to do this once
								if ( flags.unique ) {
									break;
								}
							}
						}
					}
				}
				return this;
			},
			// Control if a given callback is in the list
			has: function( fn ) {
				if ( list ) {
					var i = 0,
						length = list.length;
					for ( ; i < length; i++ ) {
						if ( fn === list[ i ] ) {
							return true;
						}
					}
				}
				return false;
			},
			// Remove all callbacks from the list
			empty: function() {
				list = [];
				return this;
			},
			// Have the list do nothing anymore
			disable: function() {
				list = stack = memory = undefined;
				return this;
			},
			// Is it disabled?
			disabled: function() {
				return !list;
			},
			// Lock the list in its current state
			lock: function() {
				stack = undefined;
				if ( !memory || memory === true ) {
					self.disable();
				}
				return this;
			},
			// Is it locked?
			locked: function() {
				return !stack;
			},
			// Call all callbacks with the given context and arguments
			fireWith: function( context, args ) {
				if ( stack ) {
					if ( firing ) {
						if ( !flags.once ) {
							stack.push( [ context, args ] );
						}
					} else if ( !( flags.once && memory ) ) {
						fire( context, args );
					}
				}
				return this;
			},
			// Call all the callbacks with the given arguments
			fire: function() {
				self.fireWith( this, arguments );
				return this;
			},
			// To know if the callbacks have already been called at least once
			fired: function() {
				return !!fired;
			}
		};

	return self;
};




var // Static reference to slice
	sliceDeferred = [].slice;

jQuery.extend({

	Deferred: function( func ) {
		var doneList = jQuery.Callbacks( "once memory" ),
			failList = jQuery.Callbacks( "once memory" ),
			progressList = jQuery.Callbacks( "memory" ),
			state = "pending",
			lists = {
				resolve: doneList,
				reject: failList,
				notify: progressList
			},
			promise = {
				done: doneList.add,
				fail: failList.add,
				progress: progressList.add,

				state: function() {
					return state;
				},

				// Deprecated
				isResolved: doneList.fired,
				isRejected: failList.fired,

				then: function( doneCallbacks, failCallbacks, progressCallbacks ) {
					deferred.done( doneCallbacks ).fail( failCallbacks ).progress( progressCallbacks );
					return this;
				},
				always: function() {
					deferred.done.apply( deferred, arguments ).fail.apply( deferred, arguments );
					return this;
				},
				pipe: function( fnDone, fnFail, fnProgress ) {
					return jQuery.Deferred(function( newDefer ) {
						jQuery.each( {
							done: [ fnDone, "resolve" ],
							fail: [ fnFail, "reject" ],
							progress: [ fnProgress, "notify" ]
						}, function( handler, data ) {
							var fn = data[ 0 ],
								action = data[ 1 ],
								returned;
							if ( jQuery.isFunction( fn ) ) {
								deferred[ handler ](function() {
									returned = fn.apply( this, arguments );
									if ( returned && jQuery.isFunction( returned.promise ) ) {
										returned.promise().then( newDefer.resolve, newDefer.reject, newDefer.notify );
									} else {
										newDefer[ action + "With" ]( this === deferred ? newDefer : this, [ returned ] );
									}
								});
							} else {
								deferred[ handler ]( newDefer[ action ] );
							}
						});
					}).promise();
				},
				// Get a promise for this deferred
				// If obj is provided, the promise aspect is added to the object
				promise: function( obj ) {
					if ( obj == null ) {
						obj = promise;
					} else {
						for ( var key in promise ) {
							obj[ key ] = promise[ key ];
						}
					}
					return obj;
				}
			},
			deferred = promise.promise({}),
			key;

		for ( key in lists ) {
			deferred[ key ] = lists[ key ].fire;
			deferred[ key + "With" ] = lists[ key ].fireWith;
		}

		// Handle state
		deferred.done( function() {
			state = "resolved";
		}, failList.disable, progressList.lock ).fail( function() {
			state = "rejected";
		}, doneList.disable, progressList.lock );

		// Call given func if any
		if ( func ) {
			func.call( deferred, deferred );
		}

		// All done!
		return deferred;
	},

	// Deferred helper
	when: function( firstParam ) {
		var args = sliceDeferred.call( arguments, 0 ),
			i = 0,
			length = args.length,
			pValues = new Array( length ),
			count = length,
			pCount = length,
			deferred = length <= 1 && firstParam && jQuery.isFunction( firstParam.promise ) ?
				firstParam :
				jQuery.Deferred(),
			promise = deferred.promise();
		function resolveFunc( i ) {
			return function( value ) {
				args[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
				if ( !( --count ) ) {
					deferred.resolveWith( deferred, args );
				}
			};
		}
		function progressFunc( i ) {
			return function( value ) {
				pValues[ i ] = arguments.length > 1 ? sliceDeferred.call( arguments, 0 ) : value;
				deferred.notifyWith( promise, pValues );
			};
		}
		if ( length > 1 ) {
			for ( ; i < length; i++ ) {
				if ( args[ i ] && args[ i ].promise && jQuery.isFunction( args[ i ].promise ) ) {
					args[ i ].promise().then( resolveFunc(i), deferred.reject, progressFunc(i) );
				} else {
					--count;
				}
			}
			if ( !count ) {
				deferred.resolveWith( deferred, args );
			}
		} else if ( deferred !== firstParam ) {
			deferred.resolveWith( deferred, length ? [ firstParam ] : [] );
		}
		return promise;
	}
});




jQuery.support = (function() {

	var support,
		all,
		a,
		select,
		opt,
		input,
		fragment,
		tds,
		events,
		eventName,
		i,
		isSupported,
		div = document.createElement( "div" ),
		documentElement = document.documentElement;

	// Preliminary tests
	div.setAttribute("className", "t");
	div.innerHTML = "   <link/><table></table><a href='/a' style='top:1px;float:left;opacity:.55;'>a</a><input type='checkbox'/>";

	all = div.getElementsByTagName( "*" );
	a = div.getElementsByTagName( "a" )[ 0 ];

	// Can't get basic test support
	if ( !all || !all.length || !a ) {
		return {};
	}

	// First batch of supports tests
	select = document.createElement( "select" );
	opt = select.appendChild( document.createElement("option") );
	input = div.getElementsByTagName( "input" )[ 0 ];

	support = {
		// IE strips leading whitespace when .innerHTML is used
		leadingWhitespace: ( div.firstChild.nodeType === 3 ),

		// Make sure that tbody elements aren't automatically inserted
		// IE will insert them into empty tables
		tbody: !div.getElementsByTagName("tbody").length,

		// Make sure that link elements get serialized correctly by innerHTML
		// This requires a wrapper element in IE
		htmlSerialize: !!div.getElementsByTagName("link").length,

		// Get the style information from getAttribute
		// (IE uses .cssText instead)
		style: /top/.test( a.getAttribute("style") ),

		// Make sure that URLs aren't manipulated
		// (IE normalizes it by default)
		hrefNormalized: ( a.getAttribute("href") === "/a" ),

		// Make sure that element opacity exists
		// (IE uses filter instead)
		// Use a regex to work around a WebKit issue. See #5145
		opacity: /^0.55/.test( a.style.opacity ),

		// Verify style float existence
		// (IE uses styleFloat instead of cssFloat)
		cssFloat: !!a.style.cssFloat,

		// Make sure that if no value is specified for a checkbox
		// that it defaults to "on".
		// (WebKit defaults to "" instead)
		checkOn: ( input.value === "on" ),

		// Make sure that a selected-by-default option has a working selected property.
		// (WebKit defaults to false instead of true, IE too, if it's in an optgroup)
		optSelected: opt.selected,

		// Test setAttribute on camelCase class. If it works, we need attrFixes when doing get/setAttribute (ie6/7)
		getSetAttribute: div.className !== "t",

		// Tests for enctype support on a form(#6743)
		enctype: !!document.createElement("form").enctype,

		// Makes sure cloning an html5 element does not cause problems
		// Where outerHTML is undefined, this still works
		html5Clone: document.createElement("nav").cloneNode( true ).outerHTML !== "<:nav></:nav>",

		// Will be defined later
		submitBubbles: true,
		changeBubbles: true,
		focusinBubbles: false,
		deleteExpando: true,
		noCloneEvent: true,
		inlineBlockNeedsLayout: false,
		shrinkWrapBlocks: false,
		reliableMarginRight: true,
		pixelMargin: true
	};

	// jQuery.boxModel DEPRECATED in 1.3, use jQuery.support.boxModel instead
	jQuery.boxModel = support.boxModel = (document.compatMode === "CSS1Compat");

	// Make sure checked status is properly cloned
	input.checked = true;
	support.noCloneChecked = input.cloneNode( true ).checked;

	// Make sure that the options inside disabled selects aren't marked as disabled
	// (WebKit marks them as disabled)
	select.disabled = true;
	support.optDisabled = !opt.disabled;

	// Test to see if it's possible to delete an expando from an element
	// Fails in Internet Explorer
	try {
		delete div.test;
	} catch( e ) {
		support.deleteExpando = false;
	}

	if ( !div.addEventListener && div.attachEvent && div.fireEvent ) {
		div.attachEvent( "onclick", function() {
			// Cloning a node shouldn't copy over any
			// bound event handlers (IE does this)
			support.noCloneEvent = false;
		});
		div.cloneNode( true ).fireEvent( "onclick" );
	}

	// Check if a radio maintains its value
	// after being appended to the DOM
	input = document.createElement("input");
	input.value = "t";
	input.setAttribute("type", "radio");
	support.radioValue = input.value === "t";

	input.setAttribute("checked", "checked");

	// #11217 - WebKit loses check when the name is after the checked attribute
	input.setAttribute( "name", "t" );

	div.appendChild( input );
	fragment = document.createDocumentFragment();
	fragment.appendChild( div.lastChild );

	// WebKit doesn't clone checked state correctly in fragments
	support.checkClone = fragment.cloneNode( true ).cloneNode( true ).lastChild.checked;

	// Check if a disconnected checkbox will retain its checked
	// value of true after appended to the DOM (IE6/7)
	support.appendChecked = input.checked;

	fragment.removeChild( input );
	fragment.appendChild( div );

	// Technique from Juriy Zaytsev
	// http://perfectionkills.com/detecting-event-support-without-browser-sniffing/
	// We only care about the case where non-standard event systems
	// are used, namely in IE. Short-circuiting here helps us to
	// avoid an eval call (in setAttribute) which can cause CSP
	// to go haywire. See: https://developer.mozilla.org/en/Security/CSP
	if ( div.attachEvent ) {
		for ( i in {
			submit: 1,
			change: 1,
			focusin: 1
		}) {
			eventName = "on" + i;
			isSupported = ( eventName in div );
			if ( !isSupported ) {
				div.setAttribute( eventName, "return;" );
				isSupported = ( typeof div[ eventName ] === "function" );
			}
			support[ i + "Bubbles" ] = isSupported;
		}
	}

	fragment.removeChild( div );

	// Null elements to avoid leaks in IE
	fragment = select = opt = div = input = null;

	// Run tests that need a body at doc ready
	jQuery(function() {
		var container, outer, inner, table, td, offsetSupport,
			marginDiv, conMarginTop, style, html, positionTopLeftWidthHeight,
			paddingMarginBorderVisibility, paddingMarginBorder,
			body = document.getElementsByTagName("body")[0];

		if ( !body ) {
			// Return for frameset docs that don't have a body
			return;
		}

		conMarginTop = 1;
		paddingMarginBorder = "padding:0;margin:0;border:";
		positionTopLeftWidthHeight = "position:absolute;top:0;left:0;width:1px;height:1px;";
		paddingMarginBorderVisibility = paddingMarginBorder + "0;visibility:hidden;";
		style = "style='" + positionTopLeftWidthHeight + paddingMarginBorder + "5px solid #000;";
		html = "<div " + style + "display:block;'><div style='" + paddingMarginBorder + "0;display:block;overflow:hidden;'></div></div>" +
			"<table " + style + "' cellpadding='0' cellspacing='0'>" +
			"<tr><td></td></tr></table>";

		container = document.createElement("div");
		container.style.cssText = paddingMarginBorderVisibility + "width:0;height:0;position:static;top:0;margin-top:" + conMarginTop + "px";
		body.insertBefore( container, body.firstChild );

		// Construct the test element
		div = document.createElement("div");
		container.appendChild( div );

		// Check if table cells still have offsetWidth/Height when they are set
		// to display:none and there are still other visible table cells in a
		// table row; if so, offsetWidth/Height are not reliable for use when
		// determining if an element has been hidden directly using
		// display:none (it is still safe to use offsets if a parent element is
		// hidden; don safety goggles and see bug #4512 for more information).
		// (only IE 8 fails this test)
		div.innerHTML = "<table><tr><td style='" + paddingMarginBorder + "0;display:none'></td><td>t</td></tr></table>";
		tds = div.getElementsByTagName( "td" );
		isSupported = ( tds[ 0 ].offsetHeight === 0 );

		tds[ 0 ].style.display = "";
		tds[ 1 ].style.display = "none";

		// Check if empty table cells still have offsetWidth/Height
		// (IE <= 8 fail this test)
		support.reliableHiddenOffsets = isSupported && ( tds[ 0 ].offsetHeight === 0 );

		// Check if div with explicit width and no margin-right incorrectly
		// gets computed margin-right based on width of container. For more
		// info see bug #3333
		// Fails in WebKit before Feb 2011 nightlies
		// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
		if ( window.getComputedStyle ) {
			div.innerHTML = "";
			marginDiv = document.createElement( "div" );
			marginDiv.style.width = "0";
			marginDiv.style.marginRight = "0";
			div.style.width = "2px";
			div.appendChild( marginDiv );
			support.reliableMarginRight =
				( parseInt( ( window.getComputedStyle( marginDiv, null ) || { marginRight: 0 } ).marginRight, 10 ) || 0 ) === 0;
		}

		if ( typeof div.style.zoom !== "undefined" ) {
			// Check if natively block-level elements act like inline-block
			// elements when setting their display to 'inline' and giving
			// them layout
			// (IE < 8 does this)
			div.innerHTML = "";
			div.style.width = div.style.padding = "1px";
			div.style.border = 0;
			div.style.overflow = "hidden";
			div.style.display = "inline";
			div.style.zoom = 1;
			support.inlineBlockNeedsLayout = ( div.offsetWidth === 3 );

			// Check if elements with layout shrink-wrap their children
			// (IE 6 does this)
			div.style.display = "block";
			div.style.overflow = "visible";
			div.innerHTML = "<div style='width:5px;'></div>";
			support.shrinkWrapBlocks = ( div.offsetWidth !== 3 );
		}

		div.style.cssText = positionTopLeftWidthHeight + paddingMarginBorderVisibility;
		div.innerHTML = html;

		outer = div.firstChild;
		inner = outer.firstChild;
		td = outer.nextSibling.firstChild.firstChild;

		offsetSupport = {
			doesNotAddBorder: ( inner.offsetTop !== 5 ),
			doesAddBorderForTableAndCells: ( td.offsetTop === 5 )
		};

		inner.style.position = "fixed";
		inner.style.top = "20px";

		// safari subtracts parent border width here which is 5px
		offsetSupport.fixedPosition = ( inner.offsetTop === 20 || inner.offsetTop === 15 );
		inner.style.position = inner.style.top = "";

		outer.style.overflow = "hidden";
		outer.style.position = "relative";

		offsetSupport.subtractsBorderForOverflowNotVisible = ( inner.offsetTop === -5 );
		offsetSupport.doesNotIncludeMarginInBodyOffset = ( body.offsetTop !== conMarginTop );

		if ( window.getComputedStyle ) {
			div.style.marginTop = "1%";
			support.pixelMargin = ( window.getComputedStyle( div, null ) || { marginTop: 0 } ).marginTop !== "1%";
		}

		if ( typeof container.style.zoom !== "undefined" ) {
			container.style.zoom = 1;
		}

		body.removeChild( container );
		marginDiv = div = container = null;

		jQuery.extend( support, offsetSupport );
	});

	return support;
})();




var rbrace = /^(?:\{.*\}|\[.*\])$/,
	rmultiDash = /([A-Z])/g;

jQuery.extend({
	cache: {},

	// Please use with caution
	uuid: 0,

	// Unique for each copy of jQuery on the page
	// Non-digits removed to match rinlinejQuery
	expando: "jQuery" + ( jQuery.fn.jquery + Math.random() ).replace( /\D/g, "" ),

	// The following elements throw uncatchable exceptions if you
	// attempt to add expando properties to them.
	noData: {
		"embed": true,
		// Ban all objects except for Flash (which handle expandos)
		"object": "clsid:D27CDB6E-AE6D-11cf-96B8-444553540000",
		"applet": true
	},

	hasData: function( elem ) {
		elem = elem.nodeType ? jQuery.cache[ elem[jQuery.expando] ] : elem[ jQuery.expando ];
		return !!elem && !isEmptyDataObject( elem );
	},

	data: function( elem, name, data, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var privateCache, thisCache, ret,
			internalKey = jQuery.expando,
			getByName = typeof name === "string",

			// We have to handle DOM nodes and JS objects differently because IE6-7
			// can't GC object references properly across the DOM-JS boundary
			isNode = elem.nodeType,

			// Only DOM nodes need the global jQuery cache; JS object data is
			// attached directly to the object so GC can occur automatically
			cache = isNode ? jQuery.cache : elem,

			// Only defining an ID for JS objects if its cache already exists allows
			// the code to shortcut on the same path as a DOM node with no cache
			id = isNode ? elem[ internalKey ] : elem[ internalKey ] && internalKey,
			isEvents = name === "events";

		// Avoid doing any more work than we need to when trying to get data on an
		// object that has no data at all
		if ( (!id || !cache[id] || (!isEvents && !pvt && !cache[id].data)) && getByName && data === undefined ) {
			return;
		}

		if ( !id ) {
			// Only DOM nodes need a new unique ID for each element since their data
			// ends up in the global cache
			if ( isNode ) {
				elem[ internalKey ] = id = ++jQuery.uuid;
			} else {
				id = internalKey;
			}
		}

		if ( !cache[ id ] ) {
			cache[ id ] = {};

			// Avoids exposing jQuery metadata on plain JS objects when the object
			// is serialized using JSON.stringify
			if ( !isNode ) {
				cache[ id ].toJSON = jQuery.noop;
			}
		}

		// An object can be passed to jQuery.data instead of a key/value pair; this gets
		// shallow copied over onto the existing cache
		if ( typeof name === "object" || typeof name === "function" ) {
			if ( pvt ) {
				cache[ id ] = jQuery.extend( cache[ id ], name );
			} else {
				cache[ id ].data = jQuery.extend( cache[ id ].data, name );
			}
		}

		privateCache = thisCache = cache[ id ];

		// jQuery data() is stored in a separate object inside the object's internal data
		// cache in order to avoid key collisions between internal data and user-defined
		// data.
		if ( !pvt ) {
			if ( !thisCache.data ) {
				thisCache.data = {};
			}

			thisCache = thisCache.data;
		}

		if ( data !== undefined ) {
			thisCache[ jQuery.camelCase( name ) ] = data;
		}

		// Users should not attempt to inspect the internal events object using jQuery.data,
		// it is undocumented and subject to change. But does anyone listen? No.
		if ( isEvents && !thisCache[ name ] ) {
			return privateCache.events;
		}

		// Check for both converted-to-camel and non-converted data property names
		// If a data property was specified
		if ( getByName ) {

			// First Try to find as-is property data
			ret = thisCache[ name ];

			// Test for null|undefined property data
			if ( ret == null ) {

				// Try to find the camelCased property
				ret = thisCache[ jQuery.camelCase( name ) ];
			}
		} else {
			ret = thisCache;
		}

		return ret;
	},

	removeData: function( elem, name, pvt /* Internal Use Only */ ) {
		if ( !jQuery.acceptData( elem ) ) {
			return;
		}

		var thisCache, i, l,

			// Reference to internal data cache key
			internalKey = jQuery.expando,

			isNode = elem.nodeType,

			// See jQuery.data for more information
			cache = isNode ? jQuery.cache : elem,

			// See jQuery.data for more information
			id = isNode ? elem[ internalKey ] : internalKey;

		// If there is already no cache entry for this object, there is no
		// purpose in continuing
		if ( !cache[ id ] ) {
			return;
		}

		if ( name ) {

			thisCache = pvt ? cache[ id ] : cache[ id ].data;

			if ( thisCache ) {

				// Support array or space separated string names for data keys
				if ( !jQuery.isArray( name ) ) {

					// try the string as a key before any manipulation
					if ( name in thisCache ) {
						name = [ name ];
					} else {

						// split the camel cased version by spaces unless a key with the spaces exists
						name = jQuery.camelCase( name );
						if ( name in thisCache ) {
							name = [ name ];
						} else {
							name = name.split( " " );
						}
					}
				}

				for ( i = 0, l = name.length; i < l; i++ ) {
					delete thisCache[ name[i] ];
				}

				// If there is no data left in the cache, we want to continue
				// and let the cache object itself get destroyed
				if ( !( pvt ? isEmptyDataObject : jQuery.isEmptyObject )( thisCache ) ) {
					return;
				}
			}
		}

		// See jQuery.data for more information
		if ( !pvt ) {
			delete cache[ id ].data;

			// Don't destroy the parent cache unless the internal data object
			// had been the only thing left in it
			if ( !isEmptyDataObject(cache[ id ]) ) {
				return;
			}
		}

		// Browsers that fail expando deletion also refuse to delete expandos on
		// the window, but it will allow it on all other JS objects; other browsers
		// don't care
		// Ensure that `cache` is not a window object #10080
		if ( jQuery.support.deleteExpando || !cache.setInterval ) {
			delete cache[ id ];
		} else {
			cache[ id ] = null;
		}

		// We destroyed the cache and need to eliminate the expando on the node to avoid
		// false lookups in the cache for entries that no longer exist
		if ( isNode ) {
			// IE does not allow us to delete expando properties from nodes,
			// nor does it have a removeAttribute function on Document nodes;
			// we must handle all of these cases
			if ( jQuery.support.deleteExpando ) {
				delete elem[ internalKey ];
			} else if ( elem.removeAttribute ) {
				elem.removeAttribute( internalKey );
			} else {
				elem[ internalKey ] = null;
			}
		}
	},

	// For internal use only.
	_data: function( elem, name, data ) {
		return jQuery.data( elem, name, data, true );
	},

	// A method for determining if a DOM node can handle the data expando
	acceptData: function( elem ) {
		if ( elem.nodeName ) {
			var match = jQuery.noData[ elem.nodeName.toLowerCase() ];

			if ( match ) {
				return !(match === true || elem.getAttribute("classid") !== match);
			}
		}

		return true;
	}
});

jQuery.fn.extend({
	data: function( key, value ) {
		var parts, part, attr, name, l,
			elem = this[0],
			i = 0,
			data = null;

		// Gets all values
		if ( key === undefined ) {
			if ( this.length ) {
				data = jQuery.data( elem );

				if ( elem.nodeType === 1 && !jQuery._data( elem, "parsedAttrs" ) ) {
					attr = elem.attributes;
					for ( l = attr.length; i < l; i++ ) {
						name = attr[i].name;

						if ( name.indexOf( "data-" ) === 0 ) {
							name = jQuery.camelCase( name.substring(5) );

							dataAttr( elem, name, data[ name ] );
						}
					}
					jQuery._data( elem, "parsedAttrs", true );
				}
			}

			return data;
		}

		// Sets multiple values
		if ( typeof key === "object" ) {
			return this.each(function() {
				jQuery.data( this, key );
			});
		}

		parts = key.split( ".", 2 );
		parts[1] = parts[1] ? "." + parts[1] : "";
		part = parts[1] + "!";

		return jQuery.access( this, function( value ) {

			if ( value === undefined ) {
				data = this.triggerHandler( "getData" + part, [ parts[0] ] );

				// Try to fetch any internally stored data first
				if ( data === undefined && elem ) {
					data = jQuery.data( elem, key );
					data = dataAttr( elem, key, data );
				}

				return data === undefined && parts[1] ?
					this.data( parts[0] ) :
					data;
			}

			parts[1] = value;
			this.each(function() {
				var self = jQuery( this );

				self.triggerHandler( "setData" + part, parts );
				jQuery.data( this, key, value );
				self.triggerHandler( "changeData" + part, parts );
			});
		}, null, value, arguments.length > 1, null, false );
	},

	removeData: function( key ) {
		return this.each(function() {
			jQuery.removeData( this, key );
		});
	}
});

function dataAttr( elem, key, data ) {
	// If nothing was found internally, try to fetch any
	// data from the HTML5 data-* attribute
	if ( data === undefined && elem.nodeType === 1 ) {

		var name = "data-" + key.replace( rmultiDash, "-$1" ).toLowerCase();

		data = elem.getAttribute( name );

		if ( typeof data === "string" ) {
			try {
				data = data === "true" ? true :
				data === "false" ? false :
				data === "null" ? null :
				jQuery.isNumeric( data ) ? +data :
					rbrace.test( data ) ? jQuery.parseJSON( data ) :
					data;
			} catch( e ) {}

			// Make sure we set the data so it isn't changed later
			jQuery.data( elem, key, data );

		} else {
			data = undefined;
		}
	}

	return data;
}

// checks a cache object for emptiness
function isEmptyDataObject( obj ) {
	for ( var name in obj ) {

		// if the public data object is empty, the private is still empty
		if ( name === "data" && jQuery.isEmptyObject( obj[name] ) ) {
			continue;
		}
		if ( name !== "toJSON" ) {
			return false;
		}
	}

	return true;
}




function handleQueueMarkDefer( elem, type, src ) {
	var deferDataKey = type + "defer",
		queueDataKey = type + "queue",
		markDataKey = type + "mark",
		defer = jQuery._data( elem, deferDataKey );
	if ( defer &&
		( src === "queue" || !jQuery._data(elem, queueDataKey) ) &&
		( src === "mark" || !jQuery._data(elem, markDataKey) ) ) {
		// Give room for hard-coded callbacks to fire first
		// and eventually mark/queue something else on the element
		setTimeout( function() {
			if ( !jQuery._data( elem, queueDataKey ) &&
				!jQuery._data( elem, markDataKey ) ) {
				jQuery.removeData( elem, deferDataKey, true );
				defer.fire();
			}
		}, 0 );
	}
}

jQuery.extend({

	_mark: function( elem, type ) {
		if ( elem ) {
			type = ( type || "fx" ) + "mark";
			jQuery._data( elem, type, (jQuery._data( elem, type ) || 0) + 1 );
		}
	},

	_unmark: function( force, elem, type ) {
		if ( force !== true ) {
			type = elem;
			elem = force;
			force = false;
		}
		if ( elem ) {
			type = type || "fx";
			var key = type + "mark",
				count = force ? 0 : ( (jQuery._data( elem, key ) || 1) - 1 );
			if ( count ) {
				jQuery._data( elem, key, count );
			} else {
				jQuery.removeData( elem, key, true );
				handleQueueMarkDefer( elem, type, "mark" );
			}
		}
	},

	queue: function( elem, type, data ) {
		var q;
		if ( elem ) {
			type = ( type || "fx" ) + "queue";
			q = jQuery._data( elem, type );

			// Speed up dequeue by getting out quickly if this is just a lookup
			if ( data ) {
				if ( !q || jQuery.isArray(data) ) {
					q = jQuery._data( elem, type, jQuery.makeArray(data) );
				} else {
					q.push( data );
				}
			}
			return q || [];
		}
	},

	dequeue: function( elem, type ) {
		type = type || "fx";

		var queue = jQuery.queue( elem, type ),
			fn = queue.shift(),
			hooks = {};

		// If the fx queue is dequeued, always remove the progress sentinel
		if ( fn === "inprogress" ) {
			fn = queue.shift();
		}

		if ( fn ) {
			// Add a progress sentinel to prevent the fx queue from being
			// automatically dequeued
			if ( type === "fx" ) {
				queue.unshift( "inprogress" );
			}

			jQuery._data( elem, type + ".run", hooks );
			fn.call( elem, function() {
				jQuery.dequeue( elem, type );
			}, hooks );
		}

		if ( !queue.length ) {
			jQuery.removeData( elem, type + "queue " + type + ".run", true );
			handleQueueMarkDefer( elem, type, "queue" );
		}
	}
});

jQuery.fn.extend({
	queue: function( type, data ) {
		var setter = 2;

		if ( typeof type !== "string" ) {
			data = type;
			type = "fx";
			setter--;
		}

		if ( arguments.length < setter ) {
			return jQuery.queue( this[0], type );
		}

		return data === undefined ?
			this :
			this.each(function() {
				var queue = jQuery.queue( this, type, data );

				if ( type === "fx" && queue[0] !== "inprogress" ) {
					jQuery.dequeue( this, type );
				}
			});
	},
	dequeue: function( type ) {
		return this.each(function() {
			jQuery.dequeue( this, type );
		});
	},
	// Based off of the plugin by Clint Helfers, with permission.
	// http://blindsignals.com/index.php/2009/07/jquery-delay/
	delay: function( time, type ) {
		time = jQuery.fx ? jQuery.fx.speeds[ time ] || time : time;
		type = type || "fx";

		return this.queue( type, function( next, hooks ) {
			var timeout = setTimeout( next, time );
			hooks.stop = function() {
				clearTimeout( timeout );
			};
		});
	},
	clearQueue: function( type ) {
		return this.queue( type || "fx", [] );
	},
	// Get a promise resolved when queues of a certain type
	// are emptied (fx is the type by default)
	promise: function( type, object ) {
		if ( typeof type !== "string" ) {
			object = type;
			type = undefined;
		}
		type = type || "fx";
		var defer = jQuery.Deferred(),
			elements = this,
			i = elements.length,
			count = 1,
			deferDataKey = type + "defer",
			queueDataKey = type + "queue",
			markDataKey = type + "mark",
			tmp;
		function resolve() {
			if ( !( --count ) ) {
				defer.resolveWith( elements, [ elements ] );
			}
		}
		while( i-- ) {
			if (( tmp = jQuery.data( elements[ i ], deferDataKey, undefined, true ) ||
					( jQuery.data( elements[ i ], queueDataKey, undefined, true ) ||
						jQuery.data( elements[ i ], markDataKey, undefined, true ) ) &&
					jQuery.data( elements[ i ], deferDataKey, jQuery.Callbacks( "once memory" ), true ) )) {
				count++;
				tmp.add( resolve );
			}
		}
		resolve();
		return defer.promise( object );
	}
});




var rclass = /[\n\t\r]/g,
	rspace = /\s+/,
	rreturn = /\r/g,
	rtype = /^(?:button|input)$/i,
	rfocusable = /^(?:button|input|object|select|textarea)$/i,
	rclickable = /^a(?:rea)?$/i,
	rboolean = /^(?:autofocus|autoplay|async|checked|controls|defer|disabled|hidden|loop|multiple|open|readonly|required|scoped|selected)$/i,
	getSetAttribute = jQuery.support.getSetAttribute,
	nodeHook, boolHook, fixSpecified;

jQuery.fn.extend({
	attr: function( name, value ) {
		return jQuery.access( this, jQuery.attr, name, value, arguments.length > 1 );
	},

	removeAttr: function( name ) {
		return this.each(function() {
			jQuery.removeAttr( this, name );
		});
	},

	prop: function( name, value ) {
		return jQuery.access( this, jQuery.prop, name, value, arguments.length > 1 );
	},

	removeProp: function( name ) {
		name = jQuery.propFix[ name ] || name;
		return this.each(function() {
			// try/catch handles cases where IE balks (such as removing a property on window)
			try {
				this[ name ] = undefined;
				delete this[ name ];
			} catch( e ) {}
		});
	},

	addClass: function( value ) {
		var classNames, i, l, elem,
			setClass, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).addClass( value.call(this, j, this.className) );
			});
		}

		if ( value && typeof value === "string" ) {
			classNames = value.split( rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 ) {
					if ( !elem.className && classNames.length === 1 ) {
						elem.className = value;

					} else {
						setClass = " " + elem.className + " ";

						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							if ( !~setClass.indexOf( " " + classNames[ c ] + " " ) ) {
								setClass += classNames[ c ] + " ";
							}
						}
						elem.className = jQuery.trim( setClass );
					}
				}
			}
		}

		return this;
	},

	removeClass: function( value ) {
		var classNames, i, l, elem, className, c, cl;

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( j ) {
				jQuery( this ).removeClass( value.call(this, j, this.className) );
			});
		}

		if ( (value && typeof value === "string") || value === undefined ) {
			classNames = ( value || "" ).split( rspace );

			for ( i = 0, l = this.length; i < l; i++ ) {
				elem = this[ i ];

				if ( elem.nodeType === 1 && elem.className ) {
					if ( value ) {
						className = (" " + elem.className + " ").replace( rclass, " " );
						for ( c = 0, cl = classNames.length; c < cl; c++ ) {
							className = className.replace(" " + classNames[ c ] + " ", " ");
						}
						elem.className = jQuery.trim( className );

					} else {
						elem.className = "";
					}
				}
			}
		}

		return this;
	},

	toggleClass: function( value, stateVal ) {
		var type = typeof value,
			isBool = typeof stateVal === "boolean";

		if ( jQuery.isFunction( value ) ) {
			return this.each(function( i ) {
				jQuery( this ).toggleClass( value.call(this, i, this.className, stateVal), stateVal );
			});
		}

		return this.each(function() {
			if ( type === "string" ) {
				// toggle individual class names
				var className,
					i = 0,
					self = jQuery( this ),
					state = stateVal,
					classNames = value.split( rspace );

				while ( (className = classNames[ i++ ]) ) {
					// check each className given, space seperated list
					state = isBool ? state : !self.hasClass( className );
					self[ state ? "addClass" : "removeClass" ]( className );
				}

			} else if ( type === "undefined" || type === "boolean" ) {
				if ( this.className ) {
					// store className if set
					jQuery._data( this, "__className__", this.className );
				}

				// toggle whole className
				this.className = this.className || value === false ? "" : jQuery._data( this, "__className__" ) || "";
			}
		});
	},

	hasClass: function( selector ) {
		var className = " " + selector + " ",
			i = 0,
			l = this.length;
		for ( ; i < l; i++ ) {
			if ( this[i].nodeType === 1 && (" " + this[i].className + " ").replace(rclass, " ").indexOf( className ) > -1 ) {
				return true;
			}
		}

		return false;
	},

	val: function( value ) {
		var hooks, ret, isFunction,
			elem = this[0];

		if ( !arguments.length ) {
			if ( elem ) {
				hooks = jQuery.valHooks[ elem.type ] || jQuery.valHooks[ elem.nodeName.toLowerCase() ];

				if ( hooks && "get" in hooks && (ret = hooks.get( elem, "value" )) !== undefined ) {
					return ret;
				}

				ret = elem.value;

				return typeof ret === "string" ?
					// handle most common string cases
					ret.replace(rreturn, "") :
					// handle cases where value is null/undef or number
					ret == null ? "" : ret;
			}

			return;
		}

		isFunction = jQuery.isFunction( value );

		return this.each(function( i ) {
			var self = jQuery(this), val;

			if ( this.nodeType !== 1 ) {
				return;
			}

			if ( isFunction ) {
				val = value.call( this, i, self.val() );
			} else {
				val = value;
			}

			// Treat null/undefined as ""; convert numbers to string
			if ( val == null ) {
				val = "";
			} else if ( typeof val === "number" ) {
				val += "";
			} else if ( jQuery.isArray( val ) ) {
				val = jQuery.map(val, function ( value ) {
					return value == null ? "" : value + "";
				});
			}

			hooks = jQuery.valHooks[ this.type ] || jQuery.valHooks[ this.nodeName.toLowerCase() ];

			// If set returns undefined, fall back to normal setting
			if ( !hooks || !("set" in hooks) || hooks.set( this, val, "value" ) === undefined ) {
				this.value = val;
			}
		});
	}
});

jQuery.extend({
	valHooks: {
		option: {
			get: function( elem ) {
				// attributes.value is undefined in Blackberry 4.7 but
				// uses .value. See #6932
				var val = elem.attributes.value;
				return !val || val.specified ? elem.value : elem.text;
			}
		},
		select: {
			get: function( elem ) {
				var value, i, max, option,
					index = elem.selectedIndex,
					values = [],
					options = elem.options,
					one = elem.type === "select-one";

				// Nothing was selected
				if ( index < 0 ) {
					return null;
				}

				// Loop through all the selected options
				i = one ? index : 0;
				max = one ? index + 1 : options.length;
				for ( ; i < max; i++ ) {
					option = options[ i ];

					// Don't return options that are disabled or in a disabled optgroup
					if ( option.selected && (jQuery.support.optDisabled ? !option.disabled : option.getAttribute("disabled") === null) &&
							(!option.parentNode.disabled || !jQuery.nodeName( option.parentNode, "optgroup" )) ) {

						// Get the specific value for the option
						value = jQuery( option ).val();

						// We don't need an array for one selects
						if ( one ) {
							return value;
						}

						// Multi-Selects return an array
						values.push( value );
					}
				}

				// Fixes Bug #2551 -- select.val() broken in IE after form.reset()
				if ( one && !values.length && options.length ) {
					return jQuery( options[ index ] ).val();
				}

				return values;
			},

			set: function( elem, value ) {
				var values = jQuery.makeArray( value );

				jQuery(elem).find("option").each(function() {
					this.selected = jQuery.inArray( jQuery(this).val(), values ) >= 0;
				});

				if ( !values.length ) {
					elem.selectedIndex = -1;
				}
				return values;
			}
		}
	},

	attrFn: {
		val: true,
		css: true,
		html: true,
		text: true,
		data: true,
		width: true,
		height: true,
		offset: true
	},

	attr: function( elem, name, value, pass ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set attributes on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		if ( pass && name in jQuery.attrFn ) {
			return jQuery( elem )[ name ]( value );
		}

		// Fallback to prop when attributes are not supported
		if ( typeof elem.getAttribute === "undefined" ) {
			return jQuery.prop( elem, name, value );
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		// All attributes are lowercase
		// Grab necessary hook if one is defined
		if ( notxml ) {
			name = name.toLowerCase();
			hooks = jQuery.attrHooks[ name ] || ( rboolean.test( name ) ? boolHook : nodeHook );
		}

		if ( value !== undefined ) {

			if ( value === null ) {
				jQuery.removeAttr( elem, name );
				return;

			} else if ( hooks && "set" in hooks && notxml && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				elem.setAttribute( name, "" + value );
				return value;
			}

		} else if ( hooks && "get" in hooks && notxml && (ret = hooks.get( elem, name )) !== null ) {
			return ret;

		} else {

			ret = elem.getAttribute( name );

			// Non-existent attributes return null, we normalize to undefined
			return ret === null ?
				undefined :
				ret;
		}
	},

	removeAttr: function( elem, value ) {
		var propName, attrNames, name, l, isBool,
			i = 0;

		if ( value && elem.nodeType === 1 ) {
			attrNames = value.toLowerCase().split( rspace );
			l = attrNames.length;

			for ( ; i < l; i++ ) {
				name = attrNames[ i ];

				if ( name ) {
					propName = jQuery.propFix[ name ] || name;
					isBool = rboolean.test( name );

					// See #9699 for explanation of this approach (setting first, then removal)
					// Do not do this for boolean attributes (see #10870)
					if ( !isBool ) {
						jQuery.attr( elem, name, "" );
					}
					elem.removeAttribute( getSetAttribute ? name : propName );

					// Set corresponding property to false for boolean attributes
					if ( isBool && propName in elem ) {
						elem[ propName ] = false;
					}
				}
			}
		}
	},

	attrHooks: {
		type: {
			set: function( elem, value ) {
				// We can't allow the type property to be changed (since it causes problems in IE)
				if ( rtype.test( elem.nodeName ) && elem.parentNode ) {
					jQuery.error( "type property can't be changed" );
				} else if ( !jQuery.support.radioValue && value === "radio" && jQuery.nodeName(elem, "input") ) {
					// Setting the type on a radio button after the value resets the value in IE6-9
					// Reset value to it's default in case type is set after value
					// This is for element creation
					var val = elem.value;
					elem.setAttribute( "type", value );
					if ( val ) {
						elem.value = val;
					}
					return value;
				}
			}
		},
		// Use the value property for back compat
		// Use the nodeHook for button elements in IE6/7 (#1954)
		value: {
			get: function( elem, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.get( elem, name );
				}
				return name in elem ?
					elem.value :
					null;
			},
			set: function( elem, value, name ) {
				if ( nodeHook && jQuery.nodeName( elem, "button" ) ) {
					return nodeHook.set( elem, value, name );
				}
				// Does not return so that setAttribute is also used
				elem.value = value;
			}
		}
	},

	propFix: {
		tabindex: "tabIndex",
		readonly: "readOnly",
		"for": "htmlFor",
		"class": "className",
		maxlength: "maxLength",
		cellspacing: "cellSpacing",
		cellpadding: "cellPadding",
		rowspan: "rowSpan",
		colspan: "colSpan",
		usemap: "useMap",
		frameborder: "frameBorder",
		contenteditable: "contentEditable"
	},

	prop: function( elem, name, value ) {
		var ret, hooks, notxml,
			nType = elem.nodeType;

		// don't get/set properties on text, comment and attribute nodes
		if ( !elem || nType === 3 || nType === 8 || nType === 2 ) {
			return;
		}

		notxml = nType !== 1 || !jQuery.isXMLDoc( elem );

		if ( notxml ) {
			// Fix name and attach hooks
			name = jQuery.propFix[ name ] || name;
			hooks = jQuery.propHooks[ name ];
		}

		if ( value !== undefined ) {
			if ( hooks && "set" in hooks && (ret = hooks.set( elem, value, name )) !== undefined ) {
				return ret;

			} else {
				return ( elem[ name ] = value );
			}

		} else {
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, name )) !== null ) {
				return ret;

			} else {
				return elem[ name ];
			}
		}
	},

	propHooks: {
		tabIndex: {
			get: function( elem ) {
				// elem.tabIndex doesn't always return the correct value when it hasn't been explicitly set
				// http://fluidproject.org/blog/2008/01/09/getting-setting-and-removing-tabindex-values-with-javascript/
				var attributeNode = elem.getAttributeNode("tabindex");

				return attributeNode && attributeNode.specified ?
					parseInt( attributeNode.value, 10 ) :
					rfocusable.test( elem.nodeName ) || rclickable.test( elem.nodeName ) && elem.href ?
						0 :
						undefined;
			}
		}
	}
});

// Add the tabIndex propHook to attrHooks for back-compat (different case is intentional)
jQuery.attrHooks.tabindex = jQuery.propHooks.tabIndex;

// Hook for boolean attributes
boolHook = {
	get: function( elem, name ) {
		// Align boolean attributes with corresponding properties
		// Fall back to attribute presence where some booleans are not supported
		var attrNode,
			property = jQuery.prop( elem, name );
		return property === true || typeof property !== "boolean" && ( attrNode = elem.getAttributeNode(name) ) && attrNode.nodeValue !== false ?
			name.toLowerCase() :
			undefined;
	},
	set: function( elem, value, name ) {
		var propName;
		if ( value === false ) {
			// Remove boolean attributes when set to false
			jQuery.removeAttr( elem, name );
		} else {
			// value is true since we know at this point it's type boolean and not false
			// Set boolean attributes to the same name and set the DOM property
			propName = jQuery.propFix[ name ] || name;
			if ( propName in elem ) {
				// Only set the IDL specifically if it already exists on the element
				elem[ propName ] = true;
			}

			elem.setAttribute( name, name.toLowerCase() );
		}
		return name;
	}
};

// IE6/7 do not support getting/setting some attributes with get/setAttribute
if ( !getSetAttribute ) {

	fixSpecified = {
		name: true,
		id: true,
		coords: true
	};

	// Use this for any attribute in IE6/7
	// This fixes almost every IE6/7 issue
	nodeHook = jQuery.valHooks.button = {
		get: function( elem, name ) {
			var ret;
			ret = elem.getAttributeNode( name );
			return ret && ( fixSpecified[ name ] ? ret.nodeValue !== "" : ret.specified ) ?
				ret.nodeValue :
				undefined;
		},
		set: function( elem, value, name ) {
			// Set the existing or create a new attribute node
			var ret = elem.getAttributeNode( name );
			if ( !ret ) {
				ret = document.createAttribute( name );
				elem.setAttributeNode( ret );
			}
			return ( ret.nodeValue = value + "" );
		}
	};

	// Apply the nodeHook to tabindex
	jQuery.attrHooks.tabindex.set = nodeHook.set;

	// Set width and height to auto instead of 0 on empty string( Bug #8150 )
	// This is for removals
	jQuery.each([ "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			set: function( elem, value ) {
				if ( value === "" ) {
					elem.setAttribute( name, "auto" );
					return value;
				}
			}
		});
	});

	// Set contenteditable to false on removals(#10429)
	// Setting to empty string throws an error as an invalid value
	jQuery.attrHooks.contenteditable = {
		get: nodeHook.get,
		set: function( elem, value, name ) {
			if ( value === "" ) {
				value = "false";
			}
			nodeHook.set( elem, value, name );
		}
	};
}


// Some attributes require a special call on IE
if ( !jQuery.support.hrefNormalized ) {
	jQuery.each([ "href", "src", "width", "height" ], function( i, name ) {
		jQuery.attrHooks[ name ] = jQuery.extend( jQuery.attrHooks[ name ], {
			get: function( elem ) {
				var ret = elem.getAttribute( name, 2 );
				return ret === null ? undefined : ret;
			}
		});
	});
}

if ( !jQuery.support.style ) {
	jQuery.attrHooks.style = {
		get: function( elem ) {
			// Return undefined in the case of empty string
			// Normalize to lowercase since IE uppercases css property names
			return elem.style.cssText.toLowerCase() || undefined;
		},
		set: function( elem, value ) {
			return ( elem.style.cssText = "" + value );
		}
	};
}

// Safari mis-reports the default selected property of an option
// Accessing the parent's selectedIndex property fixes it
if ( !jQuery.support.optSelected ) {
	jQuery.propHooks.selected = jQuery.extend( jQuery.propHooks.selected, {
		get: function( elem ) {
			var parent = elem.parentNode;

			if ( parent ) {
				parent.selectedIndex;

				// Make sure that it also works with optgroups, see #5701
				if ( parent.parentNode ) {
					parent.parentNode.selectedIndex;
				}
			}
			return null;
		}
	});
}

// IE6/7 call enctype encoding
if ( !jQuery.support.enctype ) {
	jQuery.propFix.enctype = "encoding";
}

// Radios and checkboxes getter/setter
if ( !jQuery.support.checkOn ) {
	jQuery.each([ "radio", "checkbox" ], function() {
		jQuery.valHooks[ this ] = {
			get: function( elem ) {
				// Handle the case where in Webkit "" is returned instead of "on" if a value isn't specified
				return elem.getAttribute("value") === null ? "on" : elem.value;
			}
		};
	});
}
jQuery.each([ "radio", "checkbox" ], function() {
	jQuery.valHooks[ this ] = jQuery.extend( jQuery.valHooks[ this ], {
		set: function( elem, value ) {
			if ( jQuery.isArray( value ) ) {
				return ( elem.checked = jQuery.inArray( jQuery(elem).val(), value ) >= 0 );
			}
		}
	});
});




var rformElems = /^(?:textarea|input|select)$/i,
	rtypenamespace = /^([^\.]*)?(?:\.(.+))?$/,
	rhoverHack = /(?:^|\s)hover(\.\S+)?\b/,
	rkeyEvent = /^key/,
	rmouseEvent = /^(?:mouse|contextmenu)|click/,
	rfocusMorph = /^(?:focusinfocus|focusoutblur)$/,
	rquickIs = /^(\w*)(?:#([\w\-]+))?(?:\.([\w\-]+))?$/,
	quickParse = function( selector ) {
		var quick = rquickIs.exec( selector );
		if ( quick ) {
			//   0  1    2   3
			// [ _, tag, id, class ]
			quick[1] = ( quick[1] || "" ).toLowerCase();
			quick[3] = quick[3] && new RegExp( "(?:^|\\s)" + quick[3] + "(?:\\s|$)" );
		}
		return quick;
	},
	quickIs = function( elem, m ) {
		var attrs = elem.attributes || {};
		return (
			(!m[1] || elem.nodeName.toLowerCase() === m[1]) &&
			(!m[2] || (attrs.id || {}).value === m[2]) &&
			(!m[3] || m[3].test( (attrs[ "class" ] || {}).value ))
		);
	},
	hoverHack = function( events ) {
		return jQuery.event.special.hover ? events : events.replace( rhoverHack, "mouseenter$1 mouseleave$1" );
	};

/*
 * Helper functions for managing events -- not part of the public interface.
 * Props to Dean Edwards' addEvent library for many of the ideas.
 */
jQuery.event = {

	add: function( elem, types, handler, data, selector ) {

		var elemData, eventHandle, events,
			t, tns, type, namespaces, handleObj,
			handleObjIn, quick, handlers, special;

		// Don't attach events to noData or text/comment nodes (allow plain objects tho)
		if ( elem.nodeType === 3 || elem.nodeType === 8 || !types || !handler || !(elemData = jQuery._data( elem )) ) {
			return;
		}

		// Caller can pass in an object of custom data in lieu of the handler
		if ( handler.handler ) {
			handleObjIn = handler;
			handler = handleObjIn.handler;
			selector = handleObjIn.selector;
		}

		// Make sure that the handler has a unique ID, used to find/remove it later
		if ( !handler.guid ) {
			handler.guid = jQuery.guid++;
		}

		// Init the element's event structure and main handler, if this is the first
		events = elemData.events;
		if ( !events ) {
			elemData.events = events = {};
		}
		eventHandle = elemData.handle;
		if ( !eventHandle ) {
			elemData.handle = eventHandle = function( e ) {
				// Discard the second event of a jQuery.event.trigger() and
				// when an event is called after a page has unloaded
				return typeof jQuery !== "undefined" && (!e || jQuery.event.triggered !== e.type) ?
					jQuery.event.dispatch.apply( eventHandle.elem, arguments ) :
					undefined;
			};
			// Add elem as a property of the handle fn to prevent a memory leak with IE non-native events
			eventHandle.elem = elem;
		}

		// Handle multiple events separated by a space
		// jQuery(...).bind("mouseover mouseout", fn);
		types = jQuery.trim( hoverHack(types) ).split( " " );
		for ( t = 0; t < types.length; t++ ) {

			tns = rtypenamespace.exec( types[t] ) || [];
			type = tns[1];
			namespaces = ( tns[2] || "" ).split( "." ).sort();

			// If event changes its type, use the special event handlers for the changed type
			special = jQuery.event.special[ type ] || {};

			// If selector defined, determine special event api type, otherwise given type
			type = ( selector ? special.delegateType : special.bindType ) || type;

			// Update special based on newly reset type
			special = jQuery.event.special[ type ] || {};

			// handleObj is passed to all event handlers
			handleObj = jQuery.extend({
				type: type,
				origType: tns[1],
				data: data,
				handler: handler,
				guid: handler.guid,
				selector: selector,
				quick: selector && quickParse( selector ),
				namespace: namespaces.join(".")
			}, handleObjIn );

			// Init the event handler queue if we're the first
			handlers = events[ type ];
			if ( !handlers ) {
				handlers = events[ type ] = [];
				handlers.delegateCount = 0;

				// Only use addEventListener/attachEvent if the special events handler returns false
				if ( !special.setup || special.setup.call( elem, data, namespaces, eventHandle ) === false ) {
					// Bind the global event handler to the element
					if ( elem.addEventListener ) {
						elem.addEventListener( type, eventHandle, false );

					} else if ( elem.attachEvent ) {
						elem.attachEvent( "on" + type, eventHandle );
					}
				}
			}

			if ( special.add ) {
				special.add.call( elem, handleObj );

				if ( !handleObj.handler.guid ) {
					handleObj.handler.guid = handler.guid;
				}
			}

			// Add to the element's handler list, delegates in front
			if ( selector ) {
				handlers.splice( handlers.delegateCount++, 0, handleObj );
			} else {
				handlers.push( handleObj );
			}

			// Keep track of which events have ever been used, for event optimization
			jQuery.event.global[ type ] = true;
		}

		// Nullify elem to prevent memory leaks in IE
		elem = null;
	},

	global: {},

	// Detach an event or set of events from an element
	remove: function( elem, types, handler, selector, mappedTypes ) {

		var elemData = jQuery.hasData( elem ) && jQuery._data( elem ),
			t, tns, type, origType, namespaces, origCount,
			j, events, special, handle, eventType, handleObj;

		if ( !elemData || !(events = elemData.events) ) {
			return;
		}

		// Once for each type.namespace in types; type may be omitted
		types = jQuery.trim( hoverHack( types || "" ) ).split(" ");
		for ( t = 0; t < types.length; t++ ) {
			tns = rtypenamespace.exec( types[t] ) || [];
			type = origType = tns[1];
			namespaces = tns[2];

			// Unbind all events (on this namespace, if provided) for the element
			if ( !type ) {
				for ( type in events ) {
					jQuery.event.remove( elem, type + types[ t ], handler, selector, true );
				}
				continue;
			}

			special = jQuery.event.special[ type ] || {};
			type = ( selector? special.delegateType : special.bindType ) || type;
			eventType = events[ type ] || [];
			origCount = eventType.length;
			namespaces = namespaces ? new RegExp("(^|\\.)" + namespaces.split(".").sort().join("\\.(?:.*\\.)?") + "(\\.|$)") : null;

			// Remove matching events
			for ( j = 0; j < eventType.length; j++ ) {
				handleObj = eventType[ j ];

				if ( ( mappedTypes || origType === handleObj.origType ) &&
					 ( !handler || handler.guid === handleObj.guid ) &&
					 ( !namespaces || namespaces.test( handleObj.namespace ) ) &&
					 ( !selector || selector === handleObj.selector || selector === "**" && handleObj.selector ) ) {
					eventType.splice( j--, 1 );

					if ( handleObj.selector ) {
						eventType.delegateCount--;
					}
					if ( special.remove ) {
						special.remove.call( elem, handleObj );
					}
				}
			}

			// Remove generic event handler if we removed something and no more handlers exist
			// (avoids potential for endless recursion during removal of special event handlers)
			if ( eventType.length === 0 && origCount !== eventType.length ) {
				if ( !special.teardown || special.teardown.call( elem, namespaces ) === false ) {
					jQuery.removeEvent( elem, type, elemData.handle );
				}

				delete events[ type ];
			}
		}

		// Remove the expando if it's no longer used
		if ( jQuery.isEmptyObject( events ) ) {
			handle = elemData.handle;
			if ( handle ) {
				handle.elem = null;
			}

			// removeData also checks for emptiness and clears the expando if empty
			// so use it instead of delete
			jQuery.removeData( elem, [ "events", "handle" ], true );
		}
	},

	// Events that are safe to short-circuit if no handlers are attached.
	// Native DOM events should not be added, they may have inline handlers.
	customEvent: {
		"getData": true,
		"setData": true,
		"changeData": true
	},

	trigger: function( event, data, elem, onlyHandlers ) {
		// Don't do events on text and comment nodes
		if ( elem && (elem.nodeType === 3 || elem.nodeType === 8) ) {
			return;
		}

		// Event object or event type
		var type = event.type || event,
			namespaces = [],
			cache, exclusive, i, cur, old, ontype, special, handle, eventPath, bubbleType;

		// focus/blur morphs to focusin/out; ensure we're not firing them right now
		if ( rfocusMorph.test( type + jQuery.event.triggered ) ) {
			return;
		}

		if ( type.indexOf( "!" ) >= 0 ) {
			// Exclusive events trigger only for the exact event (no namespaces)
			type = type.slice(0, -1);
			exclusive = true;
		}

		if ( type.indexOf( "." ) >= 0 ) {
			// Namespaced trigger; create a regexp to match event type in handle()
			namespaces = type.split(".");
			type = namespaces.shift();
			namespaces.sort();
		}

		if ( (!elem || jQuery.event.customEvent[ type ]) && !jQuery.event.global[ type ] ) {
			// No jQuery handlers for this event type, and it can't have inline handlers
			return;
		}

		// Caller can pass in an Event, Object, or just an event type string
		event = typeof event === "object" ?
			// jQuery.Event object
			event[ jQuery.expando ] ? event :
			// Object literal
			new jQuery.Event( type, event ) :
			// Just the event type (string)
			new jQuery.Event( type );

		event.type = type;
		event.isTrigger = true;
		event.exclusive = exclusive;
		event.namespace = namespaces.join( "." );
		event.namespace_re = event.namespace? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.)?") + "(\\.|$)") : null;
		ontype = type.indexOf( ":" ) < 0 ? "on" + type : "";

		// Handle a global trigger
		if ( !elem ) {

			// TODO: Stop taunting the data cache; remove global events and always attach to document
			cache = jQuery.cache;
			for ( i in cache ) {
				if ( cache[ i ].events && cache[ i ].events[ type ] ) {
					jQuery.event.trigger( event, data, cache[ i ].handle.elem, true );
				}
			}
			return;
		}

		// Clean up the event in case it is being reused
		event.result = undefined;
		if ( !event.target ) {
			event.target = elem;
		}

		// Clone any incoming data and prepend the event, creating the handler arg list
		data = data != null ? jQuery.makeArray( data ) : [];
		data.unshift( event );

		// Allow special events to draw outside the lines
		special = jQuery.event.special[ type ] || {};
		if ( special.trigger && special.trigger.apply( elem, data ) === false ) {
			return;
		}

		// Determine event propagation path in advance, per W3C events spec (#9951)
		// Bubble up to document, then to window; watch for a global ownerDocument var (#9724)
		eventPath = [[ elem, special.bindType || type ]];
		if ( !onlyHandlers && !special.noBubble && !jQuery.isWindow( elem ) ) {

			bubbleType = special.delegateType || type;
			cur = rfocusMorph.test( bubbleType + type ) ? elem : elem.parentNode;
			old = null;
			for ( ; cur; cur = cur.parentNode ) {
				eventPath.push([ cur, bubbleType ]);
				old = cur;
			}

			// Only add window if we got to document (e.g., not plain obj or detached DOM)
			if ( old && old === elem.ownerDocument ) {
				eventPath.push([ old.defaultView || old.parentWindow || window, bubbleType ]);
			}
		}

		// Fire handlers on the event path
		for ( i = 0; i < eventPath.length && !event.isPropagationStopped(); i++ ) {

			cur = eventPath[i][0];
			event.type = eventPath[i][1];

			handle = ( jQuery._data( cur, "events" ) || {} )[ event.type ] && jQuery._data( cur, "handle" );
			if ( handle ) {
				handle.apply( cur, data );
			}
			// Note that this is a bare JS function and not a jQuery handler
			handle = ontype && cur[ ontype ];
			if ( handle && jQuery.acceptData( cur ) && handle.apply( cur, data ) === false ) {
				event.preventDefault();
			}
		}
		event.type = type;

		// If nobody prevented the default action, do it now
		if ( !onlyHandlers && !event.isDefaultPrevented() ) {

			if ( (!special._default || special._default.apply( elem.ownerDocument, data ) === false) &&
				!(type === "click" && jQuery.nodeName( elem, "a" )) && jQuery.acceptData( elem ) ) {

				// Call a native DOM method on the target with the same name name as the event.
				// Can't use an .isFunction() check here because IE6/7 fails that test.
				// Don't do default actions on window, that's where global variables be (#6170)
				// IE<9 dies on focus/blur to hidden element (#1486)
				if ( ontype && elem[ type ] && ((type !== "focus" && type !== "blur") || event.target.offsetWidth !== 0) && !jQuery.isWindow( elem ) ) {

					// Don't re-trigger an onFOO event when we call its FOO() method
					old = elem[ ontype ];

					if ( old ) {
						elem[ ontype ] = null;
					}

					// Prevent re-triggering of the same event, since we already bubbled it above
					jQuery.event.triggered = type;
					elem[ type ]();
					jQuery.event.triggered = undefined;

					if ( old ) {
						elem[ ontype ] = old;
					}
				}
			}
		}

		return event.result;
	},

	dispatch: function( event ) {

		// Make a writable jQuery.Event from the native event object
		event = jQuery.event.fix( event || window.event );

		var handlers = ( (jQuery._data( this, "events" ) || {} )[ event.type ] || []),
			delegateCount = handlers.delegateCount,
			args = [].slice.call( arguments, 0 ),
			run_all = !event.exclusive && !event.namespace,
			special = jQuery.event.special[ event.type ] || {},
			handlerQueue = [],
			i, j, cur, jqcur, ret, selMatch, matched, matches, handleObj, sel, related;

		// Use the fix-ed jQuery.Event rather than the (read-only) native event
		args[0] = event;
		event.delegateTarget = this;

		// Call the preDispatch hook for the mapped type, and let it bail if desired
		if ( special.preDispatch && special.preDispatch.call( this, event ) === false ) {
			return;
		}

		// Determine handlers that should run if there are delegated events
		// Avoid non-left-click bubbling in Firefox (#3861)
		if ( delegateCount && !(event.button && event.type === "click") ) {

			// Pregenerate a single jQuery object for reuse with .is()
			jqcur = jQuery(this);
			jqcur.context = this.ownerDocument || this;

			for ( cur = event.target; cur != this; cur = cur.parentNode || this ) {

				// Don't process events on disabled elements (#6911, #8165)
				if ( cur.disabled !== true ) {
					selMatch = {};
					matches = [];
					jqcur[0] = cur;
					for ( i = 0; i < delegateCount; i++ ) {
						handleObj = handlers[ i ];
						sel = handleObj.selector;

						if ( selMatch[ sel ] === undefined ) {
							selMatch[ sel ] = (
								handleObj.quick ? quickIs( cur, handleObj.quick ) : jqcur.is( sel )
							);
						}
						if ( selMatch[ sel ] ) {
							matches.push( handleObj );
						}
					}
					if ( matches.length ) {
						handlerQueue.push({ elem: cur, matches: matches });
					}
				}
			}
		}

		// Add the remaining (directly-bound) handlers
		if ( handlers.length > delegateCount ) {
			handlerQueue.push({ elem: this, matches: handlers.slice( delegateCount ) });
		}

		// Run delegates first; they may want to stop propagation beneath us
		for ( i = 0; i < handlerQueue.length && !event.isPropagationStopped(); i++ ) {
			matched = handlerQueue[ i ];
			event.currentTarget = matched.elem;

			for ( j = 0; j < matched.matches.length && !event.isImmediatePropagationStopped(); j++ ) {
				handleObj = matched.matches[ j ];

				// Triggered event must either 1) be non-exclusive and have no namespace, or
				// 2) have namespace(s) a subset or equal to those in the bound event (both can have no namespace).
				if ( run_all || (!event.namespace && !handleObj.namespace) || event.namespace_re && event.namespace_re.test( handleObj.namespace ) ) {

					event.data = handleObj.data;
					event.handleObj = handleObj;

					ret = ( (jQuery.event.special[ handleObj.origType ] || {}).handle || handleObj.handler )
							.apply( matched.elem, args );

					if ( ret !== undefined ) {
						event.result = ret;
						if ( ret === false ) {
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		}

		// Call the postDispatch hook for the mapped type
		if ( special.postDispatch ) {
			special.postDispatch.call( this, event );
		}

		return event.result;
	},

	// Includes some event props shared by KeyEvent and MouseEvent
	// *** attrChange attrName relatedNode srcElement  are not normalized, non-W3C, deprecated, will be removed in 1.8 ***
	props: "attrChange attrName relatedNode srcElement altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),

	fixHooks: {},

	keyHooks: {
		props: "char charCode key keyCode".split(" "),
		filter: function( event, original ) {

			// Add which for key events
			if ( event.which == null ) {
				event.which = original.charCode != null ? original.charCode : original.keyCode;
			}

			return event;
		}
	},

	mouseHooks: {
		props: "button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),
		filter: function( event, original ) {
			var eventDoc, doc, body,
				button = original.button,
				fromElement = original.fromElement;

			// Calculate pageX/Y if missing and clientX/Y available
			if ( event.pageX == null && original.clientX != null ) {
				eventDoc = event.target.ownerDocument || document;
				doc = eventDoc.documentElement;
				body = eventDoc.body;

				event.pageX = original.clientX + ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) - ( doc && doc.clientLeft || body && body.clientLeft || 0 );
				event.pageY = original.clientY + ( doc && doc.scrollTop  || body && body.scrollTop  || 0 ) - ( doc && doc.clientTop  || body && body.clientTop  || 0 );
			}

			// Add relatedTarget, if necessary
			if ( !event.relatedTarget && fromElement ) {
				event.relatedTarget = fromElement === event.target ? original.toElement : fromElement;
			}

			// Add which for click: 1 === left; 2 === middle; 3 === right
			// Note: button is not normalized, so don't use it
			if ( !event.which && button !== undefined ) {
				event.which = ( button & 1 ? 1 : ( button & 2 ? 3 : ( button & 4 ? 2 : 0 ) ) );
			}

			return event;
		}
	},

	fix: function( event ) {
		if ( event[ jQuery.expando ] ) {
			return event;
		}

		// Create a writable copy of the event object and normalize some properties
		var i, prop,
			originalEvent = event,
			fixHook = jQuery.event.fixHooks[ event.type ] || {},
			copy = fixHook.props ? this.props.concat( fixHook.props ) : this.props;

		event = jQuery.Event( originalEvent );

		for ( i = copy.length; i; ) {
			prop = copy[ --i ];
			event[ prop ] = originalEvent[ prop ];
		}

		// Fix target property, if necessary (#1925, IE 6/7/8 & Safari2)
		if ( !event.target ) {
			event.target = originalEvent.srcElement || document;
		}

		// Target should not be a text node (#504, Safari)
		if ( event.target.nodeType === 3 ) {
			event.target = event.target.parentNode;
		}

		// For mouse/key events; add metaKey if it's not there (#3368, IE6/7/8)
		if ( event.metaKey === undefined ) {
			event.metaKey = event.ctrlKey;
		}

		return fixHook.filter? fixHook.filter( event, originalEvent ) : event;
	},

	special: {
		ready: {
			// Make sure the ready event is setup
			setup: jQuery.bindReady
		},

		load: {
			// Prevent triggered image.load events from bubbling to window.load
			noBubble: true
		},

		focus: {
			delegateType: "focusin"
		},
		blur: {
			delegateType: "focusout"
		},

		beforeunload: {
			setup: function( data, namespaces, eventHandle ) {
				// We only want to do this special case on windows
				if ( jQuery.isWindow( this ) ) {
					this.onbeforeunload = eventHandle;
				}
			},

			teardown: function( namespaces, eventHandle ) {
				if ( this.onbeforeunload === eventHandle ) {
					this.onbeforeunload = null;
				}
			}
		}
	},

	simulate: function( type, elem, event, bubble ) {
		// Piggyback on a donor event to simulate a different one.
		// Fake originalEvent to avoid donor's stopPropagation, but if the
		// simulated event prevents default then we do the same on the donor.
		var e = jQuery.extend(
			new jQuery.Event(),
			event,
			{ type: type,
				isSimulated: true,
				originalEvent: {}
			}
		);
		if ( bubble ) {
			jQuery.event.trigger( e, null, elem );
		} else {
			jQuery.event.dispatch.call( elem, e );
		}
		if ( e.isDefaultPrevented() ) {
			event.preventDefault();
		}
	}
};

// Some plugins are using, but it's undocumented/deprecated and will be removed.
// The 1.7 special event interface should provide all the hooks needed now.
jQuery.event.handle = jQuery.event.dispatch;

jQuery.removeEvent = document.removeEventListener ?
	function( elem, type, handle ) {
		if ( elem.removeEventListener ) {
			elem.removeEventListener( type, handle, false );
		}
	} :
	function( elem, type, handle ) {
		if ( elem.detachEvent ) {
			elem.detachEvent( "on" + type, handle );
		}
	};

jQuery.Event = function( src, props ) {
	// Allow instantiation without the 'new' keyword
	if ( !(this instanceof jQuery.Event) ) {
		return new jQuery.Event( src, props );
	}

	// Event object
	if ( src && src.type ) {
		this.originalEvent = src;
		this.type = src.type;

		// Events bubbling up the document may have been marked as prevented
		// by a handler lower down the tree; reflect the correct value.
		this.isDefaultPrevented = ( src.defaultPrevented || src.returnValue === false ||
			src.getPreventDefault && src.getPreventDefault() ) ? returnTrue : returnFalse;

	// Event type
	} else {
		this.type = src;
	}

	// Put explicitly provided properties onto the event object
	if ( props ) {
		jQuery.extend( this, props );
	}

	// Create a timestamp if incoming event doesn't have one
	this.timeStamp = src && src.timeStamp || jQuery.now();

	// Mark it as fixed
	this[ jQuery.expando ] = true;
};

function returnFalse() {
	return false;
}
function returnTrue() {
	return true;
}

// jQuery.Event is based on DOM3 Events as specified by the ECMAScript Language Binding
// http://www.w3.org/TR/2003/WD-DOM-Level-3-Events-20030331/ecma-script-binding.html
jQuery.Event.prototype = {
	preventDefault: function() {
		this.isDefaultPrevented = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}

		// if preventDefault exists run it on the original event
		if ( e.preventDefault ) {
			e.preventDefault();

		// otherwise set the returnValue property of the original event to false (IE)
		} else {
			e.returnValue = false;
		}
	},
	stopPropagation: function() {
		this.isPropagationStopped = returnTrue;

		var e = this.originalEvent;
		if ( !e ) {
			return;
		}
		// if stopPropagation exists run it on the original event
		if ( e.stopPropagation ) {
			e.stopPropagation();
		}
		// otherwise set the cancelBubble property of the original event to true (IE)
		e.cancelBubble = true;
	},
	stopImmediatePropagation: function() {
		this.isImmediatePropagationStopped = returnTrue;
		this.stopPropagation();
	},
	isDefaultPrevented: returnFalse,
	isPropagationStopped: returnFalse,
	isImmediatePropagationStopped: returnFalse
};

// Create mouseenter/leave events using mouseover/out and event-time checks
jQuery.each({
	mouseenter: "mouseover",
	mouseleave: "mouseout"
}, function( orig, fix ) {
	jQuery.event.special[ orig ] = {
		delegateType: fix,
		bindType: fix,

		handle: function( event ) {
			var target = this,
				related = event.relatedTarget,
				handleObj = event.handleObj,
				selector = handleObj.selector,
				ret;

			// For mousenter/leave call the handler if related is outside the target.
			// NB: No relatedTarget if the mouse left/entered the browser window
			if ( !related || (related !== target && !jQuery.contains( target, related )) ) {
				event.type = handleObj.origType;
				ret = handleObj.handler.apply( this, arguments );
				event.type = fix;
			}
			return ret;
		}
	};
});

// IE submit delegation
if ( !jQuery.support.submitBubbles ) {

	jQuery.event.special.submit = {
		setup: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Lazy-add a submit handler when a descendant form may potentially be submitted
			jQuery.event.add( this, "click._submit keypress._submit", function( e ) {
				// Node name check avoids a VML-related crash in IE (#9807)
				var elem = e.target,
					form = jQuery.nodeName( elem, "input" ) || jQuery.nodeName( elem, "button" ) ? elem.form : undefined;
				if ( form && !form._submit_attached ) {
					jQuery.event.add( form, "submit._submit", function( event ) {
						event._submit_bubble = true;
					});
					form._submit_attached = true;
				}
			});
			// return undefined since we don't need an event listener
		},
		
		postDispatch: function( event ) {
			// If form was submitted by the user, bubble the event up the tree
			if ( event._submit_bubble ) {
				delete event._submit_bubble;
				if ( this.parentNode && !event.isTrigger ) {
					jQuery.event.simulate( "submit", this.parentNode, event, true );
				}
			}
		},

		teardown: function() {
			// Only need this for delegated form submit events
			if ( jQuery.nodeName( this, "form" ) ) {
				return false;
			}

			// Remove delegated handlers; cleanData eventually reaps submit handlers attached above
			jQuery.event.remove( this, "._submit" );
		}
	};
}

// IE change delegation and checkbox/radio fix
if ( !jQuery.support.changeBubbles ) {

	jQuery.event.special.change = {

		setup: function() {

			if ( rformElems.test( this.nodeName ) ) {
				// IE doesn't fire change on a check/radio until blur; trigger it on click
				// after a propertychange. Eat the blur-change in special.change.handle.
				// This still fires onchange a second time for check/radio after blur.
				if ( this.type === "checkbox" || this.type === "radio" ) {
					jQuery.event.add( this, "propertychange._change", function( event ) {
						if ( event.originalEvent.propertyName === "checked" ) {
							this._just_changed = true;
						}
					});
					jQuery.event.add( this, "click._change", function( event ) {
						if ( this._just_changed && !event.isTrigger ) {
							this._just_changed = false;
							jQuery.event.simulate( "change", this, event, true );
						}
					});
				}
				return false;
			}
			// Delegated event; lazy-add a change handler on descendant inputs
			jQuery.event.add( this, "beforeactivate._change", function( e ) {
				var elem = e.target;

				if ( rformElems.test( elem.nodeName ) && !elem._change_attached ) {
					jQuery.event.add( elem, "change._change", function( event ) {
						if ( this.parentNode && !event.isSimulated && !event.isTrigger ) {
							jQuery.event.simulate( "change", this.parentNode, event, true );
						}
					});
					elem._change_attached = true;
				}
			});
		},

		handle: function( event ) {
			var elem = event.target;

			// Swallow native change events from checkbox/radio, we already triggered them above
			if ( this !== elem || event.isSimulated || event.isTrigger || (elem.type !== "radio" && elem.type !== "checkbox") ) {
				return event.handleObj.handler.apply( this, arguments );
			}
		},

		teardown: function() {
			jQuery.event.remove( this, "._change" );

			return rformElems.test( this.nodeName );
		}
	};
}

// Create "bubbling" focus and blur events
if ( !jQuery.support.focusinBubbles ) {
	jQuery.each({ focus: "focusin", blur: "focusout" }, function( orig, fix ) {

		// Attach a single capturing handler while someone wants focusin/focusout
		var attaches = 0,
			handler = function( event ) {
				jQuery.event.simulate( fix, event.target, jQuery.event.fix( event ), true );
			};

		jQuery.event.special[ fix ] = {
			setup: function() {
				if ( attaches++ === 0 ) {
					document.addEventListener( orig, handler, true );
				}
			},
			teardown: function() {
				if ( --attaches === 0 ) {
					document.removeEventListener( orig, handler, true );
				}
			}
		};
	});
}

jQuery.fn.extend({

	on: function( types, selector, data, fn, /*INTERNAL*/ one ) {
		var origFn, type;

		// Types can be a map of types/handlers
		if ( typeof types === "object" ) {
			// ( types-Object, selector, data )
			if ( typeof selector !== "string" ) { // && selector != null
				// ( types-Object, data )
				data = data || selector;
				selector = undefined;
			}
			for ( type in types ) {
				this.on( type, selector, data, types[ type ], one );
			}
			return this;
		}

		if ( data == null && fn == null ) {
			// ( types, fn )
			fn = selector;
			data = selector = undefined;
		} else if ( fn == null ) {
			if ( typeof selector === "string" ) {
				// ( types, selector, fn )
				fn = data;
				data = undefined;
			} else {
				// ( types, data, fn )
				fn = data;
				data = selector;
				selector = undefined;
			}
		}
		if ( fn === false ) {
			fn = returnFalse;
		} else if ( !fn ) {
			return this;
		}

		if ( one === 1 ) {
			origFn = fn;
			fn = function( event ) {
				// Can use an empty set, since event contains the info
				jQuery().off( event );
				return origFn.apply( this, arguments );
			};
			// Use same guid so caller can remove using origFn
			fn.guid = origFn.guid || ( origFn.guid = jQuery.guid++ );
		}
		return this.each( function() {
			jQuery.event.add( this, types, fn, data, selector );
		});
	},
	one: function( types, selector, data, fn ) {
		return this.on( types, selector, data, fn, 1 );
	},
	off: function( types, selector, fn ) {
		if ( types && types.preventDefault && types.handleObj ) {
			// ( event )  dispatched jQuery.Event
			var handleObj = types.handleObj;
			jQuery( types.delegateTarget ).off(
				handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType,
				handleObj.selector,
				handleObj.handler
			);
			return this;
		}
		if ( typeof types === "object" ) {
			// ( types-object [, selector] )
			for ( var type in types ) {
				this.off( type, selector, types[ type ] );
			}
			return this;
		}
		if ( selector === false || typeof selector === "function" ) {
			// ( types [, fn] )
			fn = selector;
			selector = undefined;
		}
		if ( fn === false ) {
			fn = returnFalse;
		}
		return this.each(function() {
			jQuery.event.remove( this, types, fn, selector );
		});
	},

	bind: function( types, data, fn ) {
		return this.on( types, null, data, fn );
	},
	unbind: function( types, fn ) {
		return this.off( types, null, fn );
	},

	live: function( types, data, fn ) {
		jQuery( this.context ).on( types, this.selector, data, fn );
		return this;
	},
	die: function( types, fn ) {
		jQuery( this.context ).off( types, this.selector || "**", fn );
		return this;
	},

	delegate: function( selector, types, data, fn ) {
		return this.on( types, selector, data, fn );
	},
	undelegate: function( selector, types, fn ) {
		// ( namespace ) or ( selector, types [, fn] )
		return arguments.length == 1? this.off( selector, "**" ) : this.off( types, selector, fn );
	},

	trigger: function( type, data ) {
		return this.each(function() {
			jQuery.event.trigger( type, data, this );
		});
	},
	triggerHandler: function( type, data ) {
		if ( this[0] ) {
			return jQuery.event.trigger( type, data, this[0], true );
		}
	},

	toggle: function( fn ) {
		// Save reference to arguments for access in closure
		var args = arguments,
			guid = fn.guid || jQuery.guid++,
			i = 0,
			toggler = function( event ) {
				// Figure out which function to execute
				var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
				jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );

				// Make sure that clicks stop
				event.preventDefault();

				// and execute the function
				return args[ lastToggle ].apply( this, arguments ) || false;
			};

		// link all the functions, so any of them can unbind this click handler
		toggler.guid = guid;
		while ( i < args.length ) {
			args[ i++ ].guid = guid;
		}

		return this.click( toggler );
	},

	hover: function( fnOver, fnOut ) {
		return this.mouseenter( fnOver ).mouseleave( fnOut || fnOver );
	}
});

jQuery.each( ("blur focus focusin focusout load resize scroll unload click dblclick " +
	"mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " +
	"change select submit keydown keypress keyup error contextmenu").split(" "), function( i, name ) {

	// Handle event binding
	jQuery.fn[ name ] = function( data, fn ) {
		if ( fn == null ) {
			fn = data;
			data = null;
		}

		return arguments.length > 0 ?
			this.on( name, null, data, fn ) :
			this.trigger( name );
	};

	if ( jQuery.attrFn ) {
		jQuery.attrFn[ name ] = true;
	}

	if ( rkeyEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.keyHooks;
	}

	if ( rmouseEvent.test( name ) ) {
		jQuery.event.fixHooks[ name ] = jQuery.event.mouseHooks;
	}
});



/*!
 * Sizzle CSS Selector Engine
 *  Copyright 2011, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^\[\]]*\]|['"][^'"]*['"]|[^\[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	expando = "sizcache" + (Math.random() + '').replace('.', ''),
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true,
	rBackslash = /\\/g,
	rReturn = /\r\n/g,
	rNonWord = /\W/;

// Here we check if the JavaScript engine is using some sort of
// optimization where it does not always call our comparision
// function. If that is the case, discard the hasDuplicate value.
//   Thus far that includes Google Chrome.
[0, 0].sort(function() {
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function( selector, context, results, seed ) {
	results = results || [];
	context = context || document;

	var origContext = context;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var m, set, checkSet, extra, ret, cur, pop, i,
		prune = true,
		contextXML = Sizzle.isXML( context ),
		parts = [],
		soFar = selector;

	// Reset the position of the chunker regexp (start from head)
	do {
		chunker.exec( "" );
		m = chunker.exec( soFar );

		if ( m ) {
			soFar = m[3];

			parts.push( m[1] );

			if ( m[2] ) {
				extra = m[3];
				break;
			}
		}
	} while ( m );

	if ( parts.length > 1 && origPOS.exec( selector ) ) {

		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context, seed );

		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] ) {
					selector += parts.shift();
				}

				set = posProcess( selector, set, seed );
			}
		}

	} else {
		// Take a shortcut and set the context if the root selector is an ID
		// (but not if it'll be faster if the inner selector is an ID)
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {

			ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ?
				Sizzle.filter( ret.expr, ret.set )[0] :
				ret.set[0];
		}

		if ( context ) {
			ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );

			set = ret.expr ?
				Sizzle.filter( ret.expr, ret.set ) :
				ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray( set );

			} else {
				prune = false;
			}

			while ( parts.length ) {
				cur = parts.pop();
				pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}

		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		Sizzle.error( cur || selector );
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );

		} else if ( context && context.nodeType === 1 ) {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && Sizzle.contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}

		} else {
			for ( i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}

	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function( results ) {
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort( sortOrder );

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[ i - 1 ] ) {
					results.splice( i--, 1 );
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function( expr, set ) {
	return Sizzle( expr, null, null, set );
};

Sizzle.matchesSelector = function( node, expr ) {
	return Sizzle( expr, null, null, [node] ).length > 0;
};

Sizzle.find = function( expr, context, isXML ) {
	var set, i, len, match, type, left;

	if ( !expr ) {
		return [];
	}

	for ( i = 0, len = Expr.order.length; i < len; i++ ) {
		type = Expr.order[i];

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			left = match[1];
			match.splice( 1, 1 );

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace( rBackslash, "" );
				set = Expr.find[ type ]( match, context, isXML );

				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = typeof context.getElementsByTagName !== "undefined" ?
			context.getElementsByTagName( "*" ) :
			[];
	}

	return { set: set, expr: expr };
};

Sizzle.filter = function( expr, set, inplace, not ) {
	var match, anyFound,
		type, found, item, filter, left,
		i, pass,
		old = expr,
		result = [],
		curLoop = set,
		isXMLFilter = set && set[0] && Sizzle.isXML( set[0] );

	while ( expr && set.length ) {
		for ( type in Expr.filter ) {
			if ( (match = Expr.leftMatch[ type ].exec( expr )) != null && match[2] ) {
				filter = Expr.filter[ type ];
				left = match[1];

				anyFound = false;

				match.splice(1,1);

				if ( left.substr( left.length - 1 ) === "\\" ) {
					continue;
				}

				if ( curLoop === result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;

					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							pass = not ^ found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;

								} else {
									curLoop[i] = false;
								}

							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		// Improper expression
		if ( expr === old ) {
			if ( anyFound == null ) {
				Sizzle.error( expr );

			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

Sizzle.error = function( msg ) {
	throw new Error( "Syntax error, unrecognized expression: " + msg );
};

/**
 * Utility function for retreiving the text value of an array of DOM nodes
 * @param {Array|Element} elem
 */
var getText = Sizzle.getText = function( elem ) {
    var i, node,
		nodeType = elem.nodeType,
		ret = "";

	if ( nodeType ) {
		if ( nodeType === 1 || nodeType === 9 || nodeType === 11 ) {
			// Use textContent || innerText for elements
			if ( typeof elem.textContent === 'string' ) {
				return elem.textContent;
			} else if ( typeof elem.innerText === 'string' ) {
				// Replace IE's carriage returns
				return elem.innerText.replace( rReturn, '' );
			} else {
				// Traverse it's children
				for ( elem = elem.firstChild; elem; elem = elem.nextSibling) {
					ret += getText( elem );
				}
			}
		} else if ( nodeType === 3 || nodeType === 4 ) {
			return elem.nodeValue;
		}
	} else {

		// If no nodeType, this is expected to be an array
		for ( i = 0; (node = elem[i]); i++ ) {
			// Do not traverse comment nodes
			if ( node.nodeType !== 8 ) {
				ret += getText( node );
			}
		}
	}
	return ret;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],

	match: {
		ID: /#((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF\-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF\-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF\-]|\\.)+)\s*(?:(\S?=)\s*(?:(['"])(.*?)\3|(#?(?:[\w\u00c0-\uFFFF\-]|\\.)*)|)|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*\-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\(\s*(even|odd|(?:[+\-]?\d+|(?:[+\-]?\d*)?n\s*(?:[+\-]\s*\d+)?))\s*\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^\-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF\-]|\\.)+)(?:\((['"]?)((?:\([^\)]+\)|[^\(\)]*)+)\2\))?/
	},

	leftMatch: {},

	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},

	attrHandle: {
		href: function( elem ) {
			return elem.getAttribute( "href" );
		},
		type: function( elem ) {
			return elem.getAttribute( "type" );
		}
	},

	relative: {
		"+": function(checkSet, part){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !rNonWord.test( part ),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag ) {
				part = part.toLowerCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName.toLowerCase() === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},

		">": function( checkSet, part ) {
			var elem,
				isPartStr = typeof part === "string",
				i = 0,
				l = checkSet.length;

			if ( isPartStr && !rNonWord.test( part ) ) {
				part = part.toLowerCase();

				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName.toLowerCase() === part ? parent : false;
					}
				}

			} else {
				for ( ; i < l; i++ ) {
					elem = checkSet[i];

					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},

		"": function(checkSet, part, isXML){
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "parentNode", part, doneName, checkSet, nodeCheck, isXML );
		},

		"~": function( checkSet, part, isXML ) {
			var nodeCheck,
				doneName = done++,
				checkFn = dirCheck;

			if ( typeof part === "string" && !rNonWord.test( part ) ) {
				part = part.toLowerCase();
				nodeCheck = part;
				checkFn = dirNodeCheck;
			}

			checkFn( "previousSibling", part, doneName, checkSet, nodeCheck, isXML );
		}
	},

	find: {
		ID: function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				// Check parentNode to catch when Blackberry 4.6 returns
				// nodes that are no longer in the document #6963
				return m && m.parentNode ? [m] : [];
			}
		},

		NAME: function( match, context ) {
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [],
					results = context.getElementsByName( match[1] );

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},

		TAG: function( match, context ) {
			if ( typeof context.getElementsByTagName !== "undefined" ) {
				return context.getElementsByTagName( match[1] );
			}
		}
	},
	preFilter: {
		CLASS: function( match, curLoop, inplace, result, not, isXML ) {
			match = " " + match[1].replace( rBackslash, "" ) + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").replace(/[\t\n\r]/g, " ").indexOf(match) >= 0) ) {
						if ( !inplace ) {
							result.push( elem );
						}

					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},

		ID: function( match ) {
			return match[1].replace( rBackslash, "" );
		},

		TAG: function( match, curLoop ) {
			return match[1].replace( rBackslash, "" ).toLowerCase();
		},

		CHILD: function( match ) {
			if ( match[1] === "nth" ) {
				if ( !match[2] ) {
					Sizzle.error( match[0] );
				}

				match[2] = match[2].replace(/^\+|\s*/g, '');

				// parse equations like 'even', 'odd', '5', '2n', '3n+2', '4n-1', '-n+6'
				var test = /(-?)(\d*)(?:n([+\-]?\d*))?/.exec(
					match[2] === "even" && "2n" || match[2] === "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				// calculate the numbers (first)n+(last) including if they are negative
				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}
			else if ( match[2] ) {
				Sizzle.error( match[0] );
			}

			// TODO: Move to normal caching system
			match[0] = done++;

			return match;
		},

		ATTR: function( match, curLoop, inplace, result, not, isXML ) {
			var name = match[1] = match[1].replace( rBackslash, "" );

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			// Handle if an un-quoted value was used
			match[4] = ( match[4] || match[5] || "" ).replace( rBackslash, "" );

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},

		PSEUDO: function( match, curLoop, inplace, result, not ) {
			if ( match[1] === "not" ) {
				// If we're dealing with a complex expression, or a simple one
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);

				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);

					if ( !inplace ) {
						result.push.apply( result, ret );
					}

					return false;
				}

			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},

		POS: function( match ) {
			match.unshift( true );

			return match;
		}
	},

	filters: {
		enabled: function( elem ) {
			return elem.disabled === false && elem.type !== "hidden";
		},

		disabled: function( elem ) {
			return elem.disabled === true;
		},

		checked: function( elem ) {
			return elem.checked === true;
		},

		selected: function( elem ) {
			// Accessing this property makes selected-by-default
			// options in Safari work properly
			if ( elem.parentNode ) {
				elem.parentNode.selectedIndex;
			}

			return elem.selected === true;
		},

		parent: function( elem ) {
			return !!elem.firstChild;
		},

		empty: function( elem ) {
			return !elem.firstChild;
		},

		has: function( elem, i, match ) {
			return !!Sizzle( match[3], elem ).length;
		},

		header: function( elem ) {
			return (/h\d/i).test( elem.nodeName );
		},

		text: function( elem ) {
			var attr = elem.getAttribute( "type" ), type = elem.type;
			// IE6 and 7 will map elem.type to 'text' for new HTML5 types (search, etc)
			// use getAttribute instead to test this case
			return elem.nodeName.toLowerCase() === "input" && "text" === type && ( attr === type || attr === null );
		},

		radio: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "radio" === elem.type;
		},

		checkbox: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "checkbox" === elem.type;
		},

		file: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "file" === elem.type;
		},

		password: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "password" === elem.type;
		},

		submit: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "submit" === elem.type;
		},

		image: function( elem ) {
			return elem.nodeName.toLowerCase() === "input" && "image" === elem.type;
		},

		reset: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return (name === "input" || name === "button") && "reset" === elem.type;
		},

		button: function( elem ) {
			var name = elem.nodeName.toLowerCase();
			return name === "input" && "button" === elem.type || name === "button";
		},

		input: function( elem ) {
			return (/input|select|textarea|button/i).test( elem.nodeName );
		},

		focus: function( elem ) {
			return elem === elem.ownerDocument.activeElement;
		}
	},
	setFilters: {
		first: function( elem, i ) {
			return i === 0;
		},

		last: function( elem, i, match, array ) {
			return i === array.length - 1;
		},

		even: function( elem, i ) {
			return i % 2 === 0;
		},

		odd: function( elem, i ) {
			return i % 2 === 1;
		},

		lt: function( elem, i, match ) {
			return i < match[3] - 0;
		},

		gt: function( elem, i, match ) {
			return i > match[3] - 0;
		},

		nth: function( elem, i, match ) {
			return match[3] - 0 === i;
		},

		eq: function( elem, i, match ) {
			return match[3] - 0 === i;
		}
	},
	filter: {
		PSEUDO: function( elem, match, i, array ) {
			var name = match[1],
				filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );

			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || getText([ elem ]) || "").indexOf(match[3]) >= 0;

			} else if ( name === "not" ) {
				var not = match[3];

				for ( var j = 0, l = not.length; j < l; j++ ) {
					if ( not[j] === elem ) {
						return false;
					}
				}

				return true;

			} else {
				Sizzle.error( name );
			}
		},

		CHILD: function( elem, match ) {
			var first, last,
				doneName, parent, cache,
				count, diff,
				type = match[1],
				node = elem;

			switch ( type ) {
				case "only":
				case "first":
					while ( (node = node.previousSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					if ( type === "first" ) {
						return true;
					}

					node = elem;

					/* falls through */
				case "last":
					while ( (node = node.nextSibling) ) {
						if ( node.nodeType === 1 ) {
							return false;
						}
					}

					return true;

				case "nth":
					first = match[2];
					last = match[3];

					if ( first === 1 && last === 0 ) {
						return true;
					}

					doneName = match[0];
					parent = elem.parentNode;

					if ( parent && (parent[ expando ] !== doneName || !elem.nodeIndex) ) {
						count = 0;

						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}

						parent[ expando ] = doneName;
					}

					diff = elem.nodeIndex - last;

					if ( first === 0 ) {
						return diff === 0;

					} else {
						return ( diff % first === 0 && diff / first >= 0 );
					}
			}
		},

		ID: function( elem, match ) {
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},

		TAG: function( elem, match ) {
			return (match === "*" && elem.nodeType === 1) || !!elem.nodeName && elem.nodeName.toLowerCase() === match;
		},

		CLASS: function( elem, match ) {
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},

		ATTR: function( elem, match ) {
			var name = match[1],
				result = Sizzle.attr ?
					Sizzle.attr( elem, name ) :
					Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				!type && Sizzle.attr ?
				result != null :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value !== check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},

		POS: function( elem, match, i, array ) {
			var name = match[2],
				filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS,
	fescape = function(all, num){
		return "\\" + (num - 0 + 1);
	};

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + (/(?![^\[]*\])(?![^\(]*\))/.source) );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source.replace(/\\(\d+)/g, fescape) );
}
// Expose origPOS
// "global" as in regardless of relation to brackets/parens
Expr.match.globalPOS = origPOS;

var makeArray = function( array, results ) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

// Perform a simple check to determine if the browser is capable of
// converting a NodeList to an array using builtin methods.
// Also verifies that the returned array holds DOM nodes
// (which is not the case in the Blackberry browser)
try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 )[0].nodeType;

// Provide a fallback method if it does not work
} catch( e ) {
	makeArray = function( array, results ) {
		var i = 0,
			ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );

		} else {
			if ( typeof array.length === "number" ) {
				for ( var l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}

			} else {
				for ( ; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder, siblingCheck;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( a === b ) {
			hasDuplicate = true;
			return 0;
		}

		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			return a.compareDocumentPosition ? -1 : 1;
		}

		return a.compareDocumentPosition(b) & 4 ? -1 : 1;
	};

} else {
	sortOrder = function( a, b ) {
		// The nodes are identical, we can exit early
		if ( a === b ) {
			hasDuplicate = true;
			return 0;

		// Fallback to using sourceIndex (in IE) if it's available on both nodes
		} else if ( a.sourceIndex && b.sourceIndex ) {
			return a.sourceIndex - b.sourceIndex;
		}

		var al, bl,
			ap = [],
			bp = [],
			aup = a.parentNode,
			bup = b.parentNode,
			cur = aup;

		// If the nodes are siblings (or identical) we can do a quick check
		if ( aup === bup ) {
			return siblingCheck( a, b );

		// If no parents were found then the nodes are disconnected
		} else if ( !aup ) {
			return -1;

		} else if ( !bup ) {
			return 1;
		}

		// Otherwise they're somewhere else in the tree so we need
		// to build up a full list of the parentNodes for comparison
		while ( cur ) {
			ap.unshift( cur );
			cur = cur.parentNode;
		}

		cur = bup;

		while ( cur ) {
			bp.unshift( cur );
			cur = cur.parentNode;
		}

		al = ap.length;
		bl = bp.length;

		// Start walking down the tree looking for a discrepancy
		for ( var i = 0; i < al && i < bl; i++ ) {
			if ( ap[i] !== bp[i] ) {
				return siblingCheck( ap[i], bp[i] );
			}
		}

		// We ended someplace up the tree so do a sibling check
		return i === al ?
			siblingCheck( a, bp[i], -1 ) :
			siblingCheck( ap[i], b, 1 );
	};

	siblingCheck = function( a, b, ret ) {
		if ( a === b ) {
			return ret;
		}

		var cur = a.nextSibling;

		while ( cur ) {
			if ( cur === b ) {
				return -1;
			}

			cur = cur.nextSibling;
		}

		return 1;
	};
}

// Check to see if the browser returns elements by name when
// querying by getElementById (and provide a workaround)
(function(){
	// We're going to inject a fake input element with a specified name
	var form = document.createElement("div"),
		id = "script" + (new Date()).getTime(),
		root = document.documentElement;

	form.innerHTML = "<a name='" + id + "'/>";

	// Inject it into the root element, check its status, and remove it quickly
	root.insertBefore( form, root.firstChild );

	// The workaround has to do additional checks after a getElementById
	// Which slows things down for other browsers (hence the branching)
	if ( document.getElementById( id ) ) {
		Expr.find.ID = function( match, context, isXML ) {
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);

				return m ?
					m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ?
						[m] :
						undefined :
					[];
			}
		};

		Expr.filter.ID = function( elem, match ) {
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");

			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );

	// release memory in IE
	root = form = null;
})();

(function(){
	// Check to see if the browser returns only elements
	// when doing getElementsByTagName("*")

	// Create a fake element
	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	// Make sure no comments are found
	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function( match, context ) {
			var results = context.getElementsByTagName( match[1] );

			// Filter out possible comments
			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	// Check to see if an attribute returns normalized href attributes
	div.innerHTML = "<a href='#'></a>";

	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {

		Expr.attrHandle.href = function( elem ) {
			return elem.getAttribute( "href", 2 );
		};
	}

	// release memory in IE
	div = null;
})();

if ( document.querySelectorAll ) {
	(function(){
		var oldSizzle = Sizzle,
			div = document.createElement("div"),
			id = "__sizzle__";

		div.innerHTML = "<p class='TEST'></p>";

		// Safari can't handle uppercase or unicode characters when
		// in quirks mode.
		if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
			return;
		}

		Sizzle = function( query, context, extra, seed ) {
			context = context || document;

			// Only use querySelectorAll on non-XML documents
			// (ID selectors don't work in non-HTML documents)
			if ( !seed && !Sizzle.isXML(context) ) {
				// See if we find a selector to speed up
				var match = /^(\w+$)|^\.([\w\-]+$)|^#([\w\-]+$)/.exec( query );

				if ( match && (context.nodeType === 1 || context.nodeType === 9) ) {
					// Speed-up: Sizzle("TAG")
					if ( match[1] ) {
						return makeArray( context.getElementsByTagName( query ), extra );

					// Speed-up: Sizzle(".CLASS")
					} else if ( match[2] && Expr.find.CLASS && context.getElementsByClassName ) {
						return makeArray( context.getElementsByClassName( match[2] ), extra );
					}
				}

				if ( context.nodeType === 9 ) {
					// Speed-up: Sizzle("body")
					// The body element only exists once, optimize finding it
					if ( query === "body" && context.body ) {
						return makeArray( [ context.body ], extra );

					// Speed-up: Sizzle("#ID")
					} else if ( match && match[3] ) {
						var elem = context.getElementById( match[3] );

						// Check parentNode to catch when Blackberry 4.6 returns
						// nodes that are no longer in the document #6963
						if ( elem && elem.parentNode ) {
							// Handle the case where IE and Opera return items
							// by name instead of ID
							if ( elem.id === match[3] ) {
								return makeArray( [ elem ], extra );
							}

						} else {
							return makeArray( [], extra );
						}
					}

					try {
						return makeArray( context.querySelectorAll(query), extra );
					} catch(qsaError) {}

				// qSA works strangely on Element-rooted queries
				// We can work around this by specifying an extra ID on the root
				// and working up from there (Thanks to Andrew Dupont for the technique)
				// IE 8 doesn't work on object elements
				} else if ( context.nodeType === 1 && context.nodeName.toLowerCase() !== "object" ) {
					var oldContext = context,
						old = context.getAttribute( "id" ),
						nid = old || id,
						hasParent = context.parentNode,
						relativeHierarchySelector = /^\s*[+~]/.test( query );

					if ( !old ) {
						context.setAttribute( "id", nid );
					} else {
						nid = nid.replace( /'/g, "\\$&" );
					}
					if ( relativeHierarchySelector && hasParent ) {
						context = context.parentNode;
					}

					try {
						if ( !relativeHierarchySelector || hasParent ) {
							return makeArray( context.querySelectorAll( "[id='" + nid + "'] " + query ), extra );
						}

					} catch(pseudoError) {
					} finally {
						if ( !old ) {
							oldContext.removeAttribute( "id" );
						}
					}
				}
			}

			return oldSizzle(query, context, extra, seed);
		};

		for ( var prop in oldSizzle ) {
			Sizzle[ prop ] = oldSizzle[ prop ];
		}

		// release memory in IE
		div = null;
	})();
}

(function(){
	var html = document.documentElement,
		matches = html.matchesSelector || html.mozMatchesSelector || html.webkitMatchesSelector || html.msMatchesSelector;

	if ( matches ) {
		// Check to see if it's possible to do matchesSelector
		// on a disconnected node (IE 9 fails this)
		var disconnectedMatch = !matches.call( document.createElement( "div" ), "div" ),
			pseudoWorks = false;

		try {
			// This should fail with an exception
			// Gecko does not error, returns false instead
			matches.call( document.documentElement, "[test!='']:sizzle" );

		} catch( pseudoError ) {
			pseudoWorks = true;
		}

		Sizzle.matchesSelector = function( node, expr ) {
			// Make sure that attribute selectors are quoted
			expr = expr.replace(/\=\s*([^'"\]]*)\s*\]/g, "='$1']");

			if ( !Sizzle.isXML( node ) ) {
				try {
					if ( pseudoWorks || !Expr.match.PSEUDO.test( expr ) && !/!=/.test( expr ) ) {
						var ret = matches.call( node, expr );

						// IE 9's matchesSelector returns false on disconnected nodes
						if ( ret || !disconnectedMatch ||
								// As well, disconnected nodes are said to be in a document
								// fragment in IE 9, so check for that
								node.document && node.document.nodeType !== 11 ) {
							return ret;
						}
					}
				} catch(e) {}
			}

			return Sizzle(expr, null, null, [node]).length > 0;
		};
	}
})();

(function(){
	var div = document.createElement("div");

	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	// Opera can't find a second classname (in 9.6)
	// Also, make sure that getElementsByClassName actually exists
	if ( !div.getElementsByClassName || div.getElementsByClassName("e").length === 0 ) {
		return;
	}

	// Safari caches class attributes, doesn't catch changes (in 3.2)
	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 ) {
		return;
	}

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function( match, context, isXML ) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	// release memory in IE
	div = null;
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem[ expando ] = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName.toLowerCase() === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];

		if ( elem ) {
			var match = false;

			elem = elem[dir];

			while ( elem ) {
				if ( elem[ expando ] === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem[ expando ] = doneName;
						elem.sizset = i;
					}

					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

if ( document.documentElement.contains ) {
	Sizzle.contains = function( a, b ) {
		return a !== b && (a.contains ? a.contains(b) : true);
	};

} else if ( document.documentElement.compareDocumentPosition ) {
	Sizzle.contains = function( a, b ) {
		return !!(a.compareDocumentPosition(b) & 16);
	};

} else {
	Sizzle.contains = function() {
		return false;
	};
}

Sizzle.isXML = function( elem ) {
	// documentElement is verified for cases where it doesn't yet exist
	// (such as loading iframes in IE - #4833)
	var documentElement = (elem ? elem.ownerDocument || elem : 0).documentElement;

	return documentElement ? documentElement.nodeName !== "HTML" : false;
};

var posProcess = function( selector, context, seed ) {
	var match,
		tmpSet = [],
		later = "",
		root = context.nodeType ? [context] : context;

	// Position selectors must be done after the filter
	// And so must :not(positional) so we move all PSEUDOs to the end
	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet, seed );
	}

	return Sizzle.filter( later, tmpSet );
};

// EXPOSE
// Override sizzle attribute retrieval
Sizzle.attr = jQuery.attr;
Sizzle.selectors.attrMap = {};
jQuery.find = Sizzle;
jQuery.expr = Sizzle.selectors;
jQuery.expr[":"] = jQuery.expr.filters;
jQuery.unique = Sizzle.uniqueSort;
jQuery.text = Sizzle.getText;
jQuery.isXMLDoc = Sizzle.isXML;
jQuery.contains = Sizzle.contains;


})();


var runtil = /Until$/,
	rparentsprev = /^(?:parents|prevUntil|prevAll)/,
	// Note: This RegExp should be improved, or likely pulled from Sizzle
	rmultiselector = /,/,
	isSimple = /^.[^:#\[\.,]*$/,
	slice = Array.prototype.slice,
	POS = jQuery.expr.match.globalPOS,
	// methods guaranteed to produce a unique set when starting from a unique set
	guaranteedUnique = {
		children: true,
		contents: true,
		next: true,
		prev: true
	};

jQuery.fn.extend({
	find: function( selector ) {
		var self = this,
			i, l;

		if ( typeof selector !== "string" ) {
			return jQuery( selector ).filter(function() {
				for ( i = 0, l = self.length; i < l; i++ ) {
					if ( jQuery.contains( self[ i ], this ) ) {
						return true;
					}
				}
			});
		}

		var ret = this.pushStack( "", "find", selector ),
			length, n, r;

		for ( i = 0, l = this.length; i < l; i++ ) {
			length = ret.length;
			jQuery.find( selector, this[i], ret );

			if ( i > 0 ) {
				// Make sure that the results are unique
				for ( n = length; n < ret.length; n++ ) {
					for ( r = 0; r < length; r++ ) {
						if ( ret[r] === ret[n] ) {
							ret.splice(n--, 1);
							break;
						}
					}
				}
			}
		}

		return ret;
	},

	has: function( target ) {
		var targets = jQuery( target );
		return this.filter(function() {
			for ( var i = 0, l = targets.length; i < l; i++ ) {
				if ( jQuery.contains( this, targets[i] ) ) {
					return true;
				}
			}
		});
	},

	not: function( selector ) {
		return this.pushStack( winnow(this, selector, false), "not", selector);
	},

	filter: function( selector ) {
		return this.pushStack( winnow(this, selector, true), "filter", selector );
	},

	is: function( selector ) {
		return !!selector && (
			typeof selector === "string" ?
				// If this is a positional selector, check membership in the returned set
				// so $("p:first").is("p:last") won't return true for a doc with two "p".
				POS.test( selector ) ?
					jQuery( selector, this.context ).index( this[0] ) >= 0 :
					jQuery.filter( selector, this ).length > 0 :
				this.filter( selector ).length > 0 );
	},

	closest: function( selectors, context ) {
		var ret = [], i, l, cur = this[0];

		// Array (deprecated as of jQuery 1.7)
		if ( jQuery.isArray( selectors ) ) {
			var level = 1;

			while ( cur && cur.ownerDocument && cur !== context ) {
				for ( i = 0; i < selectors.length; i++ ) {

					if ( jQuery( cur ).is( selectors[ i ] ) ) {
						ret.push({ selector: selectors[ i ], elem: cur, level: level });
					}
				}

				cur = cur.parentNode;
				level++;
			}

			return ret;
		}

		// String
		var pos = POS.test( selectors ) || typeof selectors !== "string" ?
				jQuery( selectors, context || this.context ) :
				0;

		for ( i = 0, l = this.length; i < l; i++ ) {
			cur = this[i];

			while ( cur ) {
				if ( pos ? pos.index(cur) > -1 : jQuery.find.matchesSelector(cur, selectors) ) {
					ret.push( cur );
					break;

				} else {
					cur = cur.parentNode;
					if ( !cur || !cur.ownerDocument || cur === context || cur.nodeType === 11 ) {
						break;
					}
				}
			}
		}

		ret = ret.length > 1 ? jQuery.unique( ret ) : ret;

		return this.pushStack( ret, "closest", selectors );
	},

	// Determine the position of an element within
	// the matched set of elements
	index: function( elem ) {

		// No argument, return index in parent
		if ( !elem ) {
			return ( this[0] && this[0].parentNode ) ? this.prevAll().length : -1;
		}

		// index in selector
		if ( typeof elem === "string" ) {
			return jQuery.inArray( this[0], jQuery( elem ) );
		}

		// Locate the position of the desired element
		return jQuery.inArray(
			// If it receives a jQuery object, the first element is used
			elem.jquery ? elem[0] : elem, this );
	},

	add: function( selector, context ) {
		var set = typeof selector === "string" ?
				jQuery( selector, context ) :
				jQuery.makeArray( selector && selector.nodeType ? [ selector ] : selector ),
			all = jQuery.merge( this.get(), set );

		return this.pushStack( isDisconnected( set[0] ) || isDisconnected( all[0] ) ?
			all :
			jQuery.unique( all ) );
	},

	andSelf: function() {
		return this.add( this.prevObject );
	}
});

// A painfully simple check to see if an element is disconnected
// from a document (should be improved, where feasible).
function isDisconnected( node ) {
	return !node || !node.parentNode || node.parentNode.nodeType === 11;
}

jQuery.each({
	parent: function( elem ) {
		var parent = elem.parentNode;
		return parent && parent.nodeType !== 11 ? parent : null;
	},
	parents: function( elem ) {
		return jQuery.dir( elem, "parentNode" );
	},
	parentsUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "parentNode", until );
	},
	next: function( elem ) {
		return jQuery.nth( elem, 2, "nextSibling" );
	},
	prev: function( elem ) {
		return jQuery.nth( elem, 2, "previousSibling" );
	},
	nextAll: function( elem ) {
		return jQuery.dir( elem, "nextSibling" );
	},
	prevAll: function( elem ) {
		return jQuery.dir( elem, "previousSibling" );
	},
	nextUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "nextSibling", until );
	},
	prevUntil: function( elem, i, until ) {
		return jQuery.dir( elem, "previousSibling", until );
	},
	siblings: function( elem ) {
		return jQuery.sibling( ( elem.parentNode || {} ).firstChild, elem );
	},
	children: function( elem ) {
		return jQuery.sibling( elem.firstChild );
	},
	contents: function( elem ) {
		return jQuery.nodeName( elem, "iframe" ) ?
			elem.contentDocument || elem.contentWindow.document :
			jQuery.makeArray( elem.childNodes );
	}
}, function( name, fn ) {
	jQuery.fn[ name ] = function( until, selector ) {
		var ret = jQuery.map( this, fn, until );

		if ( !runtil.test( name ) ) {
			selector = until;
		}

		if ( selector && typeof selector === "string" ) {
			ret = jQuery.filter( selector, ret );
		}

		ret = this.length > 1 && !guaranteedUnique[ name ] ? jQuery.unique( ret ) : ret;

		if ( (this.length > 1 || rmultiselector.test( selector )) && rparentsprev.test( name ) ) {
			ret = ret.reverse();
		}

		return this.pushStack( ret, name, slice.call( arguments ).join(",") );
	};
});

jQuery.extend({
	filter: function( expr, elems, not ) {
		if ( not ) {
			expr = ":not(" + expr + ")";
		}

		return elems.length === 1 ?
			jQuery.find.matchesSelector(elems[0], expr) ? [ elems[0] ] : [] :
			jQuery.find.matches(expr, elems);
	},

	dir: function( elem, dir, until ) {
		var matched = [],
			cur = elem[ dir ];

		while ( cur && cur.nodeType !== 9 && (until === undefined || cur.nodeType !== 1 || !jQuery( cur ).is( until )) ) {
			if ( cur.nodeType === 1 ) {
				matched.push( cur );
			}
			cur = cur[dir];
		}
		return matched;
	},

	nth: function( cur, result, dir, elem ) {
		result = result || 1;
		var num = 0;

		for ( ; cur; cur = cur[dir] ) {
			if ( cur.nodeType === 1 && ++num === result ) {
				break;
			}
		}

		return cur;
	},

	sibling: function( n, elem ) {
		var r = [];

		for ( ; n; n = n.nextSibling ) {
			if ( n.nodeType === 1 && n !== elem ) {
				r.push( n );
			}
		}

		return r;
	}
});

// Implement the identical functionality for filter and not
function winnow( elements, qualifier, keep ) {

	// Can't pass null or undefined to indexOf in Firefox 4
	// Set to 0 to skip string check
	qualifier = qualifier || 0;

	if ( jQuery.isFunction( qualifier ) ) {
		return jQuery.grep(elements, function( elem, i ) {
			var retVal = !!qualifier.call( elem, i, elem );
			return retVal === keep;
		});

	} else if ( qualifier.nodeType ) {
		return jQuery.grep(elements, function( elem, i ) {
			return ( elem === qualifier ) === keep;
		});

	} else if ( typeof qualifier === "string" ) {
		var filtered = jQuery.grep(elements, function( elem ) {
			return elem.nodeType === 1;
		});

		if ( isSimple.test( qualifier ) ) {
			return jQuery.filter(qualifier, filtered, !keep);
		} else {
			qualifier = jQuery.filter( qualifier, filtered );
		}
	}

	return jQuery.grep(elements, function( elem, i ) {
		return ( jQuery.inArray( elem, qualifier ) >= 0 ) === keep;
	});
}




function createSafeFragment( document ) {
	var list = nodeNames.split( "|" ),
	safeFrag = document.createDocumentFragment();

	if ( safeFrag.createElement ) {
		while ( list.length ) {
			safeFrag.createElement(
				list.pop()
			);
		}
	}
	return safeFrag;
}

var nodeNames = "abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|" +
		"header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",
	rinlinejQuery = / jQuery\d+="(?:\d+|null)"/g,
	rleadingWhitespace = /^\s+/,
	rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
	rtagName = /<([\w:]+)/,
	rtbody = /<tbody/i,
	rhtml = /<|&#?\w+;/,
	rnoInnerhtml = /<(?:script|style)/i,
	rnocache = /<(?:script|object|embed|option|style)/i,
	rnoshimcache = new RegExp("<(?:" + nodeNames + ")[\\s/>]", "i"),
	// checked="checked" or checked
	rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
	rscriptType = /\/(java|ecma)script/i,
	rcleanScript = /^\s*<!(?:\[CDATA\[|\-\-)/,
	wrapMap = {
		option: [ 1, "<select multiple='multiple'>", "</select>" ],
		legend: [ 1, "<fieldset>", "</fieldset>" ],
		thead: [ 1, "<table>", "</table>" ],
		tr: [ 2, "<table><tbody>", "</tbody></table>" ],
		td: [ 3, "<table><tbody><tr>", "</tr></tbody></table>" ],
		col: [ 2, "<table><tbody></tbody><colgroup>", "</colgroup></table>" ],
		area: [ 1, "<map>", "</map>" ],
		_default: [ 0, "", "" ]
	},
	safeFragment = createSafeFragment( document );

wrapMap.optgroup = wrapMap.option;
wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
wrapMap.th = wrapMap.td;

// IE can't serialize <link> and <script> tags normally
if ( !jQuery.support.htmlSerialize ) {
	wrapMap._default = [ 1, "div<div>", "</div>" ];
}

jQuery.fn.extend({
	text: function( value ) {
		return jQuery.access( this, function( value ) {
			return value === undefined ?
				jQuery.text( this ) :
				this.empty().append( ( this[0] && this[0].ownerDocument || document ).createTextNode( value ) );
		}, null, value, arguments.length );
	},

	wrapAll: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapAll( html.call(this, i) );
			});
		}

		if ( this[0] ) {
			// The elements to wrap the target around
			var wrap = jQuery( html, this[0].ownerDocument ).eq(0).clone(true);

			if ( this[0].parentNode ) {
				wrap.insertBefore( this[0] );
			}

			wrap.map(function() {
				var elem = this;

				while ( elem.firstChild && elem.firstChild.nodeType === 1 ) {
					elem = elem.firstChild;
				}

				return elem;
			}).append( this );
		}

		return this;
	},

	wrapInner: function( html ) {
		if ( jQuery.isFunction( html ) ) {
			return this.each(function(i) {
				jQuery(this).wrapInner( html.call(this, i) );
			});
		}

		return this.each(function() {
			var self = jQuery( this ),
				contents = self.contents();

			if ( contents.length ) {
				contents.wrapAll( html );

			} else {
				self.append( html );
			}
		});
	},

	wrap: function( html ) {
		var isFunction = jQuery.isFunction( html );

		return this.each(function(i) {
			jQuery( this ).wrapAll( isFunction ? html.call(this, i) : html );
		});
	},

	unwrap: function() {
		return this.parent().each(function() {
			if ( !jQuery.nodeName( this, "body" ) ) {
				jQuery( this ).replaceWith( this.childNodes );
			}
		}).end();
	},

	append: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 ) {
				this.appendChild( elem );
			}
		});
	},

	prepend: function() {
		return this.domManip(arguments, true, function( elem ) {
			if ( this.nodeType === 1 ) {
				this.insertBefore( elem, this.firstChild );
			}
		});
	},

	before: function() {
		if ( this[0] && this[0].parentNode ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this );
			});
		} else if ( arguments.length ) {
			var set = jQuery.clean( arguments );
			set.push.apply( set, this.toArray() );
			return this.pushStack( set, "before", arguments );
		}
	},

	after: function() {
		if ( this[0] && this[0].parentNode ) {
			return this.domManip(arguments, false, function( elem ) {
				this.parentNode.insertBefore( elem, this.nextSibling );
			});
		} else if ( arguments.length ) {
			var set = this.pushStack( this, "after", arguments );
			set.push.apply( set, jQuery.clean(arguments) );
			return set;
		}
	},

	// keepData is for internal use only--do not document
	remove: function( selector, keepData ) {
		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
			if ( !selector || jQuery.filter( selector, [ elem ] ).length ) {
				if ( !keepData && elem.nodeType === 1 ) {
					jQuery.cleanData( elem.getElementsByTagName("*") );
					jQuery.cleanData( [ elem ] );
				}

				if ( elem.parentNode ) {
					elem.parentNode.removeChild( elem );
				}
			}
		}

		return this;
	},

	empty: function() {
		for ( var i = 0, elem; (elem = this[i]) != null; i++ ) {
			// Remove element nodes and prevent memory leaks
			if ( elem.nodeType === 1 ) {
				jQuery.cleanData( elem.getElementsByTagName("*") );
			}

			// Remove any remaining nodes
			while ( elem.firstChild ) {
				elem.removeChild( elem.firstChild );
			}
		}

		return this;
	},

	clone: function( dataAndEvents, deepDataAndEvents ) {
		dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
		deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;

		return this.map( function () {
			return jQuery.clone( this, dataAndEvents, deepDataAndEvents );
		});
	},

	html: function( value ) {
		return jQuery.access( this, function( value ) {
			var elem = this[0] || {},
				i = 0,
				l = this.length;

			if ( value === undefined ) {
				return elem.nodeType === 1 ?
					elem.innerHTML.replace( rinlinejQuery, "" ) :
					null;
			}


			if ( typeof value === "string" && !rnoInnerhtml.test( value ) &&
				( jQuery.support.leadingWhitespace || !rleadingWhitespace.test( value ) ) &&
				!wrapMap[ ( rtagName.exec( value ) || ["", ""] )[1].toLowerCase() ] ) {

				value = value.replace( rxhtmlTag, "<$1></$2>" );

				try {
					for (; i < l; i++ ) {
						// Remove element nodes and prevent memory leaks
						elem = this[i] || {};
						if ( elem.nodeType === 1 ) {
							jQuery.cleanData( elem.getElementsByTagName( "*" ) );
							elem.innerHTML = value;
						}
					}

					elem = 0;

				// If using innerHTML throws an exception, use the fallback method
				} catch(e) {}
			}

			if ( elem ) {
				this.empty().append( value );
			}
		}, null, value, arguments.length );
	},

	replaceWith: function( value ) {
		if ( this[0] && this[0].parentNode ) {
			// Make sure that the elements are removed from the DOM before they are inserted
			// this can help fix replacing a parent with child elements
			if ( jQuery.isFunction( value ) ) {
				return this.each(function(i) {
					var self = jQuery(this), old = self.html();
					self.replaceWith( value.call( this, i, old ) );
				});
			}

			if ( typeof value !== "string" ) {
				value = jQuery( value ).detach();
			}

			return this.each(function() {
				var next = this.nextSibling,
					parent = this.parentNode;

				jQuery( this ).remove();

				if ( next ) {
					jQuery(next).before( value );
				} else {
					jQuery(parent).append( value );
				}
			});
		} else {
			return this.length ?
				this.pushStack( jQuery(jQuery.isFunction(value) ? value() : value), "replaceWith", value ) :
				this;
		}
	},

	detach: function( selector ) {
		return this.remove( selector, true );
	},

	domManip: function( args, table, callback ) {
		var results, first, fragment, parent,
			value = args[0],
			scripts = [];

		// We can't cloneNode fragments that contain checked, in WebKit
		if ( !jQuery.support.checkClone && arguments.length === 3 && typeof value === "string" && rchecked.test( value ) ) {
			return this.each(function() {
				jQuery(this).domManip( args, table, callback, true );
			});
		}

		if ( jQuery.isFunction(value) ) {
			return this.each(function(i) {
				var self = jQuery(this);
				args[0] = value.call(this, i, table ? self.html() : undefined);
				self.domManip( args, table, callback );
			});
		}

		if ( this[0] ) {
			parent = value && value.parentNode;

			// If we're in a fragment, just use that instead of building a new one
			if ( jQuery.support.parentNode && parent && parent.nodeType === 11 && parent.childNodes.length === this.length ) {
				results = { fragment: parent };

			} else {
				results = jQuery.buildFragment( args, this, scripts );
			}

			fragment = results.fragment;

			if ( fragment.childNodes.length === 1 ) {
				first = fragment = fragment.firstChild;
			} else {
				first = fragment.firstChild;
			}

			if ( first ) {
				table = table && jQuery.nodeName( first, "tr" );

				for ( var i = 0, l = this.length, lastIndex = l - 1; i < l; i++ ) {
					callback.call(
						table ?
							root(this[i], first) :
							this[i],
						// Make sure that we do not leak memory by inadvertently discarding
						// the original fragment (which might have attached data) instead of
						// using it; in addition, use the original fragment object for the last
						// item instead of first because it can end up being emptied incorrectly
						// in certain situations (Bug #8070).
						// Fragments from the fragment cache must always be cloned and never used
						// in place.
						results.cacheable || ( l > 1 && i < lastIndex ) ?
							jQuery.clone( fragment, true, true ) :
							fragment
					);
				}
			}

			if ( scripts.length ) {
				jQuery.each( scripts, function( i, elem ) {
					if ( elem.src ) {
						jQuery.ajax({
							type: "GET",
							global: false,
							url: elem.src,
							async: false,
							dataType: "script"
						});
					} else {
						jQuery.globalEval( ( elem.text || elem.textContent || elem.innerHTML || "" ).replace( rcleanScript, "/*$0*/" ) );
					}

					if ( elem.parentNode ) {
						elem.parentNode.removeChild( elem );
					}
				});
			}
		}

		return this;
	}
});

function root( elem, cur ) {
	return jQuery.nodeName(elem, "table") ?
		(elem.getElementsByTagName("tbody")[0] ||
		elem.appendChild(elem.ownerDocument.createElement("tbody"))) :
		elem;
}

function cloneCopyEvent( src, dest ) {

	if ( dest.nodeType !== 1 || !jQuery.hasData( src ) ) {
		return;
	}

	var type, i, l,
		oldData = jQuery._data( src ),
		curData = jQuery._data( dest, oldData ),
		events = oldData.events;

	if ( events ) {
		delete curData.handle;
		curData.events = {};

		for ( type in events ) {
			for ( i = 0, l = events[ type ].length; i < l; i++ ) {
				jQuery.event.add( dest, type, events[ type ][ i ] );
			}
		}
	}

	// make the cloned public data object a copy from the original
	if ( curData.data ) {
		curData.data = jQuery.extend( {}, curData.data );
	}
}

function cloneFixAttributes( src, dest ) {
	var nodeName;

	// We do not need to do anything for non-Elements
	if ( dest.nodeType !== 1 ) {
		return;
	}

	// clearAttributes removes the attributes, which we don't want,
	// but also removes the attachEvent events, which we *do* want
	if ( dest.clearAttributes ) {
		dest.clearAttributes();
	}

	// mergeAttributes, in contrast, only merges back on the
	// original attributes, not the events
	if ( dest.mergeAttributes ) {
		dest.mergeAttributes( src );
	}

	nodeName = dest.nodeName.toLowerCase();

	// IE6-8 fail to clone children inside object elements that use
	// the proprietary classid attribute value (rather than the type
	// attribute) to identify the type of content to display
	if ( nodeName === "object" ) {
		dest.outerHTML = src.outerHTML;

	} else if ( nodeName === "input" && (src.type === "checkbox" || src.type === "radio") ) {
		// IE6-8 fails to persist the checked state of a cloned checkbox
		// or radio button. Worse, IE6-7 fail to give the cloned element
		// a checked appearance if the defaultChecked value isn't also set
		if ( src.checked ) {
			dest.defaultChecked = dest.checked = src.checked;
		}

		// IE6-7 get confused and end up setting the value of a cloned
		// checkbox/radio button to an empty string instead of "on"
		if ( dest.value !== src.value ) {
			dest.value = src.value;
		}

	// IE6-8 fails to return the selected option to the default selected
	// state when cloning options
	} else if ( nodeName === "option" ) {
		dest.selected = src.defaultSelected;

	// IE6-8 fails to set the defaultValue to the correct value when
	// cloning other types of input fields
	} else if ( nodeName === "input" || nodeName === "textarea" ) {
		dest.defaultValue = src.defaultValue;

	// IE blanks contents when cloning scripts
	} else if ( nodeName === "script" && dest.text !== src.text ) {
		dest.text = src.text;
	}

	// Event data gets referenced instead of copied if the expando
	// gets copied too
	dest.removeAttribute( jQuery.expando );

	// Clear flags for bubbling special change/submit events, they must
	// be reattached when the newly cloned events are first activated
	dest.removeAttribute( "_submit_attached" );
	dest.removeAttribute( "_change_attached" );
}

jQuery.buildFragment = function( args, nodes, scripts ) {
	var fragment, cacheable, cacheresults, doc,
	first = args[ 0 ];

	// nodes may contain either an explicit document object,
	// a jQuery collection or context object.
	// If nodes[0] contains a valid object to assign to doc
	if ( nodes && nodes[0] ) {
		doc = nodes[0].ownerDocument || nodes[0];
	}

	// Ensure that an attr object doesn't incorrectly stand in as a document object
	// Chrome and Firefox seem to allow this to occur and will throw exception
	// Fixes #8950
	if ( !doc.createDocumentFragment ) {
		doc = document;
	}

	// Only cache "small" (1/2 KB) HTML strings that are associated with the main document
	// Cloning options loses the selected state, so don't cache them
	// IE 6 doesn't like it when you put <object> or <embed> elements in a fragment
	// Also, WebKit does not clone 'checked' attributes on cloneNode, so don't cache
	// Lastly, IE6,7,8 will not correctly reuse cached fragments that were created from unknown elems #10501
	if ( args.length === 1 && typeof first === "string" && first.length < 512 && doc === document &&
		first.charAt(0) === "<" && !rnocache.test( first ) &&
		(jQuery.support.checkClone || !rchecked.test( first )) &&
		(jQuery.support.html5Clone || !rnoshimcache.test( first )) ) {

		cacheable = true;

		cacheresults = jQuery.fragments[ first ];
		if ( cacheresults && cacheresults !== 1 ) {
			fragment = cacheresults;
		}
	}

	if ( !fragment ) {
		fragment = doc.createDocumentFragment();
		jQuery.clean( args, doc, fragment, scripts );
	}

	if ( cacheable ) {
		jQuery.fragments[ first ] = cacheresults ? fragment : 1;
	}

	return { fragment: fragment, cacheable: cacheable };
};

jQuery.fragments = {};

jQuery.each({
	appendTo: "append",
	prependTo: "prepend",
	insertBefore: "before",
	insertAfter: "after",
	replaceAll: "replaceWith"
}, function( name, original ) {
	jQuery.fn[ name ] = function( selector ) {
		var ret = [],
			insert = jQuery( selector ),
			parent = this.length === 1 && this[0].parentNode;

		if ( parent && parent.nodeType === 11 && parent.childNodes.length === 1 && insert.length === 1 ) {
			insert[ original ]( this[0] );
			return this;

		} else {
			for ( var i = 0, l = insert.length; i < l; i++ ) {
				var elems = ( i > 0 ? this.clone(true) : this ).get();
				jQuery( insert[i] )[ original ]( elems );
				ret = ret.concat( elems );
			}

			return this.pushStack( ret, name, insert.selector );
		}
	};
});

function getAll( elem ) {
	if ( typeof elem.getElementsByTagName !== "undefined" ) {
		return elem.getElementsByTagName( "*" );

	} else if ( typeof elem.querySelectorAll !== "undefined" ) {
		return elem.querySelectorAll( "*" );

	} else {
		return [];
	}
}

// Used in clean, fixes the defaultChecked property
function fixDefaultChecked( elem ) {
	if ( elem.type === "checkbox" || elem.type === "radio" ) {
		elem.defaultChecked = elem.checked;
	}
}
// Finds all inputs and passes them to fixDefaultChecked
function findInputs( elem ) {
	var nodeName = ( elem.nodeName || "" ).toLowerCase();
	if ( nodeName === "input" ) {
		fixDefaultChecked( elem );
	// Skip scripts, get other children
	} else if ( nodeName !== "script" && typeof elem.getElementsByTagName !== "undefined" ) {
		jQuery.grep( elem.getElementsByTagName("input"), fixDefaultChecked );
	}
}

// Derived From: http://www.iecss.com/shimprove/javascript/shimprove.1-0-1.js
function shimCloneNode( elem ) {
	var div = document.createElement( "div" );
	safeFragment.appendChild( div );

	div.innerHTML = elem.outerHTML;
	return div.firstChild;
}

jQuery.extend({
	clone: function( elem, dataAndEvents, deepDataAndEvents ) {
		var srcElements,
			destElements,
			i,
			// IE<=8 does not properly clone detached, unknown element nodes
			clone = jQuery.support.html5Clone || jQuery.isXMLDoc(elem) || !rnoshimcache.test( "<" + elem.nodeName + ">" ) ?
				elem.cloneNode( true ) :
				shimCloneNode( elem );

		if ( (!jQuery.support.noCloneEvent || !jQuery.support.noCloneChecked) &&
				(elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem) ) {
			// IE copies events bound via attachEvent when using cloneNode.
			// Calling detachEvent on the clone will also remove the events
			// from the original. In order to get around this, we use some
			// proprietary methods to clear the events. Thanks to MooTools
			// guys for this hotness.

			cloneFixAttributes( elem, clone );

			// Using Sizzle here is crazy slow, so we use getElementsByTagName instead
			srcElements = getAll( elem );
			destElements = getAll( clone );

			// Weird iteration because IE will replace the length property
			// with an element if you are cloning the body and one of the
			// elements on the page has a name or id of "length"
			for ( i = 0; srcElements[i]; ++i ) {
				// Ensure that the destination node is not null; Fixes #9587
				if ( destElements[i] ) {
					cloneFixAttributes( srcElements[i], destElements[i] );
				}
			}
		}

		// Copy the events from the original to the clone
		if ( dataAndEvents ) {
			cloneCopyEvent( elem, clone );

			if ( deepDataAndEvents ) {
				srcElements = getAll( elem );
				destElements = getAll( clone );

				for ( i = 0; srcElements[i]; ++i ) {
					cloneCopyEvent( srcElements[i], destElements[i] );
				}
			}
		}

		srcElements = destElements = null;

		// Return the cloned set
		return clone;
	},

	clean: function( elems, context, fragment, scripts ) {
		var checkScriptType, script, j,
				ret = [];

		context = context || document;

		// !context.createElement fails in IE with an error but returns typeof 'object'
		if ( typeof context.createElement === "undefined" ) {
			context = context.ownerDocument || context[0] && context[0].ownerDocument || document;
		}

		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
			if ( typeof elem === "number" ) {
				elem += "";
			}

			if ( !elem ) {
				continue;
			}

			// Convert html string into DOM nodes
			if ( typeof elem === "string" ) {
				if ( !rhtml.test( elem ) ) {
					elem = context.createTextNode( elem );
				} else {
					// Fix "XHTML"-style tags in all browsers
					elem = elem.replace(rxhtmlTag, "<$1></$2>");

					// Trim whitespace, otherwise indexOf won't work as expected
					var tag = ( rtagName.exec( elem ) || ["", ""] )[1].toLowerCase(),
						wrap = wrapMap[ tag ] || wrapMap._default,
						depth = wrap[0],
						div = context.createElement("div"),
						safeChildNodes = safeFragment.childNodes,
						remove;

					// Append wrapper element to unknown element safe doc fragment
					if ( context === document ) {
						// Use the fragment we've already created for this document
						safeFragment.appendChild( div );
					} else {
						// Use a fragment created with the owner document
						createSafeFragment( context ).appendChild( div );
					}

					// Go to html and back, then peel off extra wrappers
					div.innerHTML = wrap[1] + elem + wrap[2];

					// Move to the right depth
					while ( depth-- ) {
						div = div.lastChild;
					}

					// Remove IE's autoinserted <tbody> from table fragments
					if ( !jQuery.support.tbody ) {

						// String was a <table>, *may* have spurious <tbody>
						var hasBody = rtbody.test(elem),
							tbody = tag === "table" && !hasBody ?
								div.firstChild && div.firstChild.childNodes :

								// String was a bare <thead> or <tfoot>
								wrap[1] === "<table>" && !hasBody ?
									div.childNodes :
									[];

						for ( j = tbody.length - 1; j >= 0 ; --j ) {
							if ( jQuery.nodeName( tbody[ j ], "tbody" ) && !tbody[ j ].childNodes.length ) {
								tbody[ j ].parentNode.removeChild( tbody[ j ] );
							}
						}
					}

					// IE completely kills leading whitespace when innerHTML is used
					if ( !jQuery.support.leadingWhitespace && rleadingWhitespace.test( elem ) ) {
						div.insertBefore( context.createTextNode( rleadingWhitespace.exec(elem)[0] ), div.firstChild );
					}

					elem = div.childNodes;

					// Clear elements from DocumentFragment (safeFragment or otherwise)
					// to avoid hoarding elements. Fixes #11356
					if ( div ) {
						div.parentNode.removeChild( div );

						// Guard against -1 index exceptions in FF3.6
						if ( safeChildNodes.length > 0 ) {
							remove = safeChildNodes[ safeChildNodes.length - 1 ];

							if ( remove && remove.parentNode ) {
								remove.parentNode.removeChild( remove );
							}
						}
					}
				}
			}

			// Resets defaultChecked for any radios and checkboxes
			// about to be appended to the DOM in IE 6/7 (#8060)
			var len;
			if ( !jQuery.support.appendChecked ) {
				if ( elem[0] && typeof (len = elem.length) === "number" ) {
					for ( j = 0; j < len; j++ ) {
						findInputs( elem[j] );
					}
				} else {
					findInputs( elem );
				}
			}

			if ( elem.nodeType ) {
				ret.push( elem );
			} else {
				ret = jQuery.merge( ret, elem );
			}
		}

		if ( fragment ) {
			checkScriptType = function( elem ) {
				return !elem.type || rscriptType.test( elem.type );
			};
			for ( i = 0; ret[i]; i++ ) {
				script = ret[i];
				if ( scripts && jQuery.nodeName( script, "script" ) && (!script.type || rscriptType.test( script.type )) ) {
					scripts.push( script.parentNode ? script.parentNode.removeChild( script ) : script );

				} else {
					if ( script.nodeType === 1 ) {
						var jsTags = jQuery.grep( script.getElementsByTagName( "script" ), checkScriptType );

						ret.splice.apply( ret, [i + 1, 0].concat( jsTags ) );
					}
					fragment.appendChild( script );
				}
			}
		}

		return ret;
	},

	cleanData: function( elems ) {
		var data, id,
			cache = jQuery.cache,
			special = jQuery.event.special,
			deleteExpando = jQuery.support.deleteExpando;

		for ( var i = 0, elem; (elem = elems[i]) != null; i++ ) {
			if ( elem.nodeName && jQuery.noData[elem.nodeName.toLowerCase()] ) {
				continue;
			}

			id = elem[ jQuery.expando ];

			if ( id ) {
				data = cache[ id ];

				if ( data && data.events ) {
					for ( var type in data.events ) {
						if ( special[ type ] ) {
							jQuery.event.remove( elem, type );

						// This is a shortcut to avoid jQuery.event.remove's overhead
						} else {
							jQuery.removeEvent( elem, type, data.handle );
						}
					}

					// Null the DOM reference to avoid IE6/7/8 leak (#7054)
					if ( data.handle ) {
						data.handle.elem = null;
					}
				}

				if ( deleteExpando ) {
					delete elem[ jQuery.expando ];

				} else if ( elem.removeAttribute ) {
					elem.removeAttribute( jQuery.expando );
				}

				delete cache[ id ];
			}
		}
	}
});




var ralpha = /alpha\([^)]*\)/i,
	ropacity = /opacity=([^)]*)/,
	// fixed for IE9, see #8346
	rupper = /([A-Z]|^ms)/g,
	rnum = /^[\-+]?(?:\d*\.)?\d+$/i,
	rnumnonpx = /^-?(?:\d*\.)?\d+(?!px)[^\d\s]+$/i,
	rrelNum = /^([\-+])=([\-+.\de]+)/,
	rmargin = /^margin/,

	cssShow = { position: "absolute", visibility: "hidden", display: "block" },

	// order is important!
	cssExpand = [ "Top", "Right", "Bottom", "Left" ],

	curCSS,

	getComputedStyle,
	currentStyle;

jQuery.fn.css = function( name, value ) {
	return jQuery.access( this, function( elem, name, value ) {
		return value !== undefined ?
			jQuery.style( elem, name, value ) :
			jQuery.css( elem, name );
	}, name, value, arguments.length > 1 );
};

jQuery.extend({
	// Add in style property hooks for overriding the default
	// behavior of getting and setting a style property
	cssHooks: {
		opacity: {
			get: function( elem, computed ) {
				if ( computed ) {
					// We should always get a number back from opacity
					var ret = curCSS( elem, "opacity" );
					return ret === "" ? "1" : ret;

				} else {
					return elem.style.opacity;
				}
			}
		}
	},

	// Exclude the following css properties to add px
	cssNumber: {
		"fillOpacity": true,
		"fontWeight": true,
		"lineHeight": true,
		"opacity": true,
		"orphans": true,
		"widows": true,
		"zIndex": true,
		"zoom": true
	},

	// Add in properties whose names you wish to fix before
	// setting or getting the value
	cssProps: {
		// normalize float css property
		"float": jQuery.support.cssFloat ? "cssFloat" : "styleFloat"
	},

	// Get and set the style property on a DOM Node
	style: function( elem, name, value, extra ) {
		// Don't set styles on text and comment nodes
		if ( !elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style ) {
			return;
		}

		// Make sure that we're working with the right name
		var ret, type, origName = jQuery.camelCase( name ),
			style = elem.style, hooks = jQuery.cssHooks[ origName ];

		name = jQuery.cssProps[ origName ] || origName;

		// Check if we're setting a value
		if ( value !== undefined ) {
			type = typeof value;

			// convert relative number strings (+= or -=) to relative numbers. #7345
			if ( type === "string" && (ret = rrelNum.exec( value )) ) {
				value = ( +( ret[1] + 1) * +ret[2] ) + parseFloat( jQuery.css( elem, name ) );
				// Fixes bug #9237
				type = "number";
			}

			// Make sure that NaN and null values aren't set. See: #7116
			if ( value == null || type === "number" && isNaN( value ) ) {
				return;
			}

			// If a number was passed in, add 'px' to the (except for certain CSS properties)
			if ( type === "number" && !jQuery.cssNumber[ origName ] ) {
				value += "px";
			}

			// If a hook was provided, use that value, otherwise just set the specified value
			if ( !hooks || !("set" in hooks) || (value = hooks.set( elem, value )) !== undefined ) {
				// Wrapped to prevent IE from throwing errors when 'invalid' values are provided
				// Fixes bug #5509
				try {
					style[ name ] = value;
				} catch(e) {}
			}

		} else {
			// If a hook was provided get the non-computed value from there
			if ( hooks && "get" in hooks && (ret = hooks.get( elem, false, extra )) !== undefined ) {
				return ret;
			}

			// Otherwise just get the value from the style object
			return style[ name ];
		}
	},

	css: function( elem, name, extra ) {
		var ret, hooks;

		// Make sure that we're working with the right name
		name = jQuery.camelCase( name );
		hooks = jQuery.cssHooks[ name ];
		name = jQuery.cssProps[ name ] || name;

		// cssFloat needs a special treatment
		if ( name === "cssFloat" ) {
			name = "float";
		}

		// If a hook was provided get the computed value from there
		if ( hooks && "get" in hooks && (ret = hooks.get( elem, true, extra )) !== undefined ) {
			return ret;

		// Otherwise, if a way to get the computed value exists, use that
		} else if ( curCSS ) {
			return curCSS( elem, name );
		}
	},

	// A method for quickly swapping in/out CSS properties to get correct calculations
	swap: function( elem, options, callback ) {
		var old = {},
			ret, name;

		// Remember the old values, and insert the new ones
		for ( name in options ) {
			old[ name ] = elem.style[ name ];
			elem.style[ name ] = options[ name ];
		}

		ret = callback.call( elem );

		// Revert the old values
		for ( name in options ) {
			elem.style[ name ] = old[ name ];
		}

		return ret;
	}
});

// DEPRECATED in 1.3, Use jQuery.css() instead
jQuery.curCSS = jQuery.css;

if ( document.defaultView && document.defaultView.getComputedStyle ) {
	getComputedStyle = function( elem, name ) {
		var ret, defaultView, computedStyle, width,
			style = elem.style;

		name = name.replace( rupper, "-$1" ).toLowerCase();

		if ( (defaultView = elem.ownerDocument.defaultView) &&
				(computedStyle = defaultView.getComputedStyle( elem, null )) ) {

			ret = computedStyle.getPropertyValue( name );
			if ( ret === "" && !jQuery.contains( elem.ownerDocument.documentElement, elem ) ) {
				ret = jQuery.style( elem, name );
			}
		}

		// A tribute to the "awesome hack by Dean Edwards"
		// WebKit uses "computed value (percentage if specified)" instead of "used value" for margins
		// which is against the CSSOM draft spec: http://dev.w3.org/csswg/cssom/#resolved-values
		if ( !jQuery.support.pixelMargin && computedStyle && rmargin.test( name ) && rnumnonpx.test( ret ) ) {
			width = style.width;
			style.width = ret;
			ret = computedStyle.width;
			style.width = width;
		}

		return ret;
	};
}

if ( document.documentElement.currentStyle ) {
	currentStyle = function( elem, name ) {
		var left, rsLeft, uncomputed,
			ret = elem.currentStyle && elem.currentStyle[ name ],
			style = elem.style;

		// Avoid setting ret to empty string here
		// so we don't default to auto
		if ( ret == null && style && (uncomputed = style[ name ]) ) {
			ret = uncomputed;
		}

		// From the awesome hack by Dean Edwards
		// http://erik.eae.net/archives/2007/07/27/18.54.15/#comment-102291

		// If we're not dealing with a regular pixel number
		// but a number that has a weird ending, we need to convert it to pixels
		if ( rnumnonpx.test( ret ) ) {

			// Remember the original values
			left = style.left;
			rsLeft = elem.runtimeStyle && elem.runtimeStyle.left;

			// Put in the new values to get a computed value out
			if ( rsLeft ) {
				elem.runtimeStyle.left = elem.currentStyle.left;
			}
			style.left = name === "fontSize" ? "1em" : ret;
			ret = style.pixelLeft + "px";

			// Revert the changed values
			style.left = left;
			if ( rsLeft ) {
				elem.runtimeStyle.left = rsLeft;
			}
		}

		return ret === "" ? "auto" : ret;
	};
}

curCSS = getComputedStyle || currentStyle;

function getWidthOrHeight( elem, name, extra ) {

	// Start with offset property
	var val = name === "width" ? elem.offsetWidth : elem.offsetHeight,
		i = name === "width" ? 1 : 0,
		len = 4;

	if ( val > 0 ) {
		if ( extra !== "border" ) {
			for ( ; i < len; i += 2 ) {
				if ( !extra ) {
					val -= parseFloat( jQuery.css( elem, "padding" + cssExpand[ i ] ) ) || 0;
				}
				if ( extra === "margin" ) {
					val += parseFloat( jQuery.css( elem, extra + cssExpand[ i ] ) ) || 0;
				} else {
					val -= parseFloat( jQuery.css( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
				}
			}
		}

		return val + "px";
	}

	// Fall back to computed then uncomputed css if necessary
	val = curCSS( elem, name );
	if ( val < 0 || val == null ) {
		val = elem.style[ name ];
	}

	// Computed unit is not pixels. Stop here and return.
	if ( rnumnonpx.test(val) ) {
		return val;
	}

	// Normalize "", auto, and prepare for extra
	val = parseFloat( val ) || 0;

	// Add padding, border, margin
	if ( extra ) {
		for ( ; i < len; i += 2 ) {
			val += parseFloat( jQuery.css( elem, "padding" + cssExpand[ i ] ) ) || 0;
			if ( extra !== "padding" ) {
				val += parseFloat( jQuery.css( elem, "border" + cssExpand[ i ] + "Width" ) ) || 0;
			}
			if ( extra === "margin" ) {
				val += parseFloat( jQuery.css( elem, extra + cssExpand[ i ]) ) || 0;
			}
		}
	}

	return val + "px";
}

jQuery.each([ "height", "width" ], function( i, name ) {
	jQuery.cssHooks[ name ] = {
		get: function( elem, computed, extra ) {
			if ( computed ) {
				if ( elem.offsetWidth !== 0 ) {
					return getWidthOrHeight( elem, name, extra );
				} else {
					return jQuery.swap( elem, cssShow, function() {
						return getWidthOrHeight( elem, name, extra );
					});
				}
			}
		},

		set: function( elem, value ) {
			return rnum.test( value ) ?
				value + "px" :
				value;
		}
	};
});

if ( !jQuery.support.opacity ) {
	jQuery.cssHooks.opacity = {
		get: function( elem, computed ) {
			// IE uses filters for opacity
			return ropacity.test( (computed && elem.currentStyle ? elem.currentStyle.filter : elem.style.filter) || "" ) ?
				( parseFloat( RegExp.$1 ) / 100 ) + "" :
				computed ? "1" : "";
		},

		set: function( elem, value ) {
			var style = elem.style,
				currentStyle = elem.currentStyle,
				opacity = jQuery.isNumeric( value ) ? "alpha(opacity=" + value * 100 + ")" : "",
				filter = currentStyle && currentStyle.filter || style.filter || "";

			// IE has trouble with opacity if it does not have layout
			// Force it by setting the zoom level
			style.zoom = 1;

			// if setting opacity to 1, and no other filters exist - attempt to remove filter attribute #6652
			if ( value >= 1 && jQuery.trim( filter.replace( ralpha, "" ) ) === "" ) {

				// Setting style.filter to null, "" & " " still leave "filter:" in the cssText
				// if "filter:" is present at all, clearType is disabled, we want to avoid this
				// style.removeAttribute is IE Only, but so apparently is this code path...
				style.removeAttribute( "filter" );

				// if there there is no filter style applied in a css rule, we are done
				if ( currentStyle && !currentStyle.filter ) {
					return;
				}
			}

			// otherwise, set new filter values
			style.filter = ralpha.test( filter ) ?
				filter.replace( ralpha, opacity ) :
				filter + " " + opacity;
		}
	};
}

jQuery(function() {
	// This hook cannot be added until DOM ready because the support test
	// for it is not run until after DOM ready
	if ( !jQuery.support.reliableMarginRight ) {
		jQuery.cssHooks.marginRight = {
			get: function( elem, computed ) {
				// WebKit Bug 13343 - getComputedStyle returns wrong value for margin-right
				// Work around by temporarily setting element display to inline-block
				return jQuery.swap( elem, { "display": "inline-block" }, function() {
					if ( computed ) {
						return curCSS( elem, "margin-right" );
					} else {
						return elem.style.marginRight;
					}
				});
			}
		};
	}
});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.hidden = function( elem ) {
		var width = elem.offsetWidth,
			height = elem.offsetHeight;

		return ( width === 0 && height === 0 ) || (!jQuery.support.reliableHiddenOffsets && ((elem.style && elem.style.display) || jQuery.css( elem, "display" )) === "none");
	};

	jQuery.expr.filters.visible = function( elem ) {
		return !jQuery.expr.filters.hidden( elem );
	};
}

// These hooks are used by animate to expand properties
jQuery.each({
	margin: "",
	padding: "",
	border: "Width"
}, function( prefix, suffix ) {

	jQuery.cssHooks[ prefix + suffix ] = {
		expand: function( value ) {
			var i,

				// assumes a single number if not a string
				parts = typeof value === "string" ? value.split(" ") : [ value ],
				expanded = {};

			for ( i = 0; i < 4; i++ ) {
				expanded[ prefix + cssExpand[ i ] + suffix ] =
					parts[ i ] || parts[ i - 2 ] || parts[ 0 ];
			}

			return expanded;
		}
	};
});




var r20 = /%20/g,
	rbracket = /\[\]$/,
	rCRLF = /\r?\n/g,
	rhash = /#.*$/,
	rheaders = /^(.*?):[ \t]*([^\r\n]*)\r?$/mg, // IE leaves an \r character at EOL
	rinput = /^(?:color|date|datetime|datetime-local|email|hidden|month|number|password|range|search|tel|text|time|url|week)$/i,
	// #7653, #8125, #8152: local protocol detection
	rlocalProtocol = /^(?:about|app|app\-storage|.+\-extension|file|res|widget):$/,
	rnoContent = /^(?:GET|HEAD)$/,
	rprotocol = /^\/\//,
	rquery = /\?/,
	rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
	rselectTextarea = /^(?:select|textarea)/i,
	rspacesAjax = /\s+/,
	rts = /([?&])_=[^&]*/,
	rurl = /^([\w\+\.\-]+:)(?:\/\/([^\/?#:]*)(?::(\d+))?)?/,

	// Keep a copy of the old load method
	_load = jQuery.fn.load,

	/* Prefilters
	 * 1) They are useful to introduce custom dataTypes (see ajax/jsonp.js for an example)
	 * 2) These are called:
	 *    - BEFORE asking for a transport
	 *    - AFTER param serialization (s.data is a string if s.processData is true)
	 * 3) key is the dataType
	 * 4) the catchall symbol "*" can be used
	 * 5) execution will start with transport dataType and THEN continue down to "*" if needed
	 */
	prefilters = {},

	/* Transports bindings
	 * 1) key is the dataType
	 * 2) the catchall symbol "*" can be used
	 * 3) selection will start with transport dataType and THEN go to "*" if needed
	 */
	transports = {},

	// Document location
	ajaxLocation,

	// Document location segments
	ajaxLocParts,

	// Avoid comment-prolog char sequence (#10098); must appease lint and evade compression
	allTypes = ["*/"] + ["*"];

// #8138, IE may throw an exception when accessing
// a field from window.location if document.domain has been set
try {
	ajaxLocation = location.href;
} catch( e ) {
	// Use the href attribute of an A element
	// since IE will modify it given document.location
	ajaxLocation = document.createElement( "a" );
	ajaxLocation.href = "";
	ajaxLocation = ajaxLocation.href;
}

// Segment location into parts
ajaxLocParts = rurl.exec( ajaxLocation.toLowerCase() ) || [];

// Base "constructor" for jQuery.ajaxPrefilter and jQuery.ajaxTransport
function addToPrefiltersOrTransports( structure ) {

	// dataTypeExpression is optional and defaults to "*"
	return function( dataTypeExpression, func ) {

		if ( typeof dataTypeExpression !== "string" ) {
			func = dataTypeExpression;
			dataTypeExpression = "*";
		}

		if ( jQuery.isFunction( func ) ) {
			var dataTypes = dataTypeExpression.toLowerCase().split( rspacesAjax ),
				i = 0,
				length = dataTypes.length,
				dataType,
				list,
				placeBefore;

			// For each dataType in the dataTypeExpression
			for ( ; i < length; i++ ) {
				dataType = dataTypes[ i ];
				// We control if we're asked to add before
				// any existing element
				placeBefore = /^\+/.test( dataType );
				if ( placeBefore ) {
					dataType = dataType.substr( 1 ) || "*";
				}
				list = structure[ dataType ] = structure[ dataType ] || [];
				// then we add to the structure accordingly
				list[ placeBefore ? "unshift" : "push" ]( func );
			}
		}
	};
}

// Base inspection function for prefilters and transports
function inspectPrefiltersOrTransports( structure, options, originalOptions, jqXHR,
		dataType /* internal */, inspected /* internal */ ) {

	dataType = dataType || options.dataTypes[ 0 ];
	inspected = inspected || {};

	inspected[ dataType ] = true;

	var list = structure[ dataType ],
		i = 0,
		length = list ? list.length : 0,
		executeOnly = ( structure === prefilters ),
		selection;

	for ( ; i < length && ( executeOnly || !selection ); i++ ) {
		selection = list[ i ]( options, originalOptions, jqXHR );
		// If we got redirected to another dataType
		// we try there if executing only and not done already
		if ( typeof selection === "string" ) {
			if ( !executeOnly || inspected[ selection ] ) {
				selection = undefined;
			} else {
				options.dataTypes.unshift( selection );
				selection = inspectPrefiltersOrTransports(
						structure, options, originalOptions, jqXHR, selection, inspected );
			}
		}
	}
	// If we're only executing or nothing was selected
	// we try the catchall dataType if not done already
	if ( ( executeOnly || !selection ) && !inspected[ "*" ] ) {
		selection = inspectPrefiltersOrTransports(
				structure, options, originalOptions, jqXHR, "*", inspected );
	}
	// unnecessary when only executing (prefilters)
	// but it'll be ignored by the caller in that case
	return selection;
}

// A special extend for ajax options
// that takes "flat" options (not to be deep extended)
// Fixes #9887
function ajaxExtend( target, src ) {
	var key, deep,
		flatOptions = jQuery.ajaxSettings.flatOptions || {};
	for ( key in src ) {
		if ( src[ key ] !== undefined ) {
			( flatOptions[ key ] ? target : ( deep || ( deep = {} ) ) )[ key ] = src[ key ];
		}
	}
	if ( deep ) {
		jQuery.extend( true, target, deep );
	}
}

jQuery.fn.extend({
	load: function( url, params, callback ) {
		if ( typeof url !== "string" && _load ) {
			return _load.apply( this, arguments );

		// Don't do a request if no elements are being requested
		} else if ( !this.length ) {
			return this;
		}

		var off = url.indexOf( " " );
		if ( off >= 0 ) {
			var selector = url.slice( off, url.length );
			url = url.slice( 0, off );
		}

		// Default to a GET request
		var type = "GET";

		// If the second parameter was provided
		if ( params ) {
			// If it's a function
			if ( jQuery.isFunction( params ) ) {
				// We assume that it's the callback
				callback = params;
				params = undefined;

			// Otherwise, build a param string
			} else if ( typeof params === "object" ) {
				params = jQuery.param( params, jQuery.ajaxSettings.traditional );
				type = "POST";
			}
		}

		var self = this;

		// Request the remote document
		jQuery.ajax({
			url: url,
			type: type,
			dataType: "html",
			data: params,
			// Complete callback (responseText is used internally)
			complete: function( jqXHR, status, responseText ) {
				// Store the response as specified by the jqXHR object
				responseText = jqXHR.responseText;
				// If successful, inject the HTML into all the matched elements
				if ( jqXHR.isResolved() ) {
					// #4825: Get the actual response in case
					// a dataFilter is present in ajaxSettings
					jqXHR.done(function( r ) {
						responseText = r;
					});
					// See if a selector was specified
					self.html( selector ?
						// Create a dummy div to hold the results
						jQuery("<div>")
							// inject the contents of the document in, removing the scripts
							// to avoid any 'Permission Denied' errors in IE
							.append(responseText.replace(rscript, ""))

							// Locate the specified elements
							.find(selector) :

						// If not, just inject the full result
						responseText );
				}

				if ( callback ) {
					self.each( callback, [ responseText, status, jqXHR ] );
				}
			}
		});

		return this;
	},

	serialize: function() {
		return jQuery.param( this.serializeArray() );
	},

	serializeArray: function() {
		return this.map(function(){
			return this.elements ? jQuery.makeArray( this.elements ) : this;
		})
		.filter(function(){
			return this.name && !this.disabled &&
				( this.checked || rselectTextarea.test( this.nodeName ) ||
					rinput.test( this.type ) );
		})
		.map(function( i, elem ){
			var val = jQuery( this ).val();

			return val == null ?
				null :
				jQuery.isArray( val ) ?
					jQuery.map( val, function( val, i ){
						return { name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
					}) :
					{ name: elem.name, value: val.replace( rCRLF, "\r\n" ) };
		}).get();
	}
});

// Attach a bunch of functions for handling common AJAX events
jQuery.each( "ajaxStart ajaxStop ajaxComplete ajaxError ajaxSuccess ajaxSend".split( " " ), function( i, o ){
	jQuery.fn[ o ] = function( f ){
		return this.on( o, f );
	};
});

jQuery.each( [ "get", "post" ], function( i, method ) {
	jQuery[ method ] = function( url, data, callback, type ) {
		// shift arguments if data argument was omitted
		if ( jQuery.isFunction( data ) ) {
			type = type || callback;
			callback = data;
			data = undefined;
		}

		return jQuery.ajax({
			type: method,
			url: url,
			data: data,
			success: callback,
			dataType: type
		});
	};
});

jQuery.extend({

	getScript: function( url, callback ) {
		return jQuery.get( url, undefined, callback, "script" );
	},

	getJSON: function( url, data, callback ) {
		return jQuery.get( url, data, callback, "json" );
	},

	// Creates a full fledged settings object into target
	// with both ajaxSettings and settings fields.
	// If target is omitted, writes into ajaxSettings.
	ajaxSetup: function( target, settings ) {
		if ( settings ) {
			// Building a settings object
			ajaxExtend( target, jQuery.ajaxSettings );
		} else {
			// Extending ajaxSettings
			settings = target;
			target = jQuery.ajaxSettings;
		}
		ajaxExtend( target, settings );
		return target;
	},

	ajaxSettings: {
		url: ajaxLocation,
		isLocal: rlocalProtocol.test( ajaxLocParts[ 1 ] ),
		global: true,
		type: "GET",
		contentType: "application/x-www-form-urlencoded; charset=UTF-8",
		processData: true,
		async: true,
		/*
		timeout: 0,
		data: null,
		dataType: null,
		username: null,
		password: null,
		cache: null,
		traditional: false,
		headers: {},
		*/

		accepts: {
			xml: "application/xml, text/xml",
			html: "text/html",
			text: "text/plain",
			json: "application/json, text/javascript",
			"*": allTypes
		},

		contents: {
			xml: /xml/,
			html: /html/,
			json: /json/
		},

		responseFields: {
			xml: "responseXML",
			text: "responseText"
		},

		// List of data converters
		// 1) key format is "source_type destination_type" (a single space in-between)
		// 2) the catchall symbol "*" can be used for source_type
		converters: {

			// Convert anything to text
			"* text": window.String,

			// Text to html (true = no transformation)
			"text html": true,

			// Evaluate text as a json expression
			"text json": jQuery.parseJSON,

			// Parse text as xml
			"text xml": jQuery.parseXML
		},

		// For options that shouldn't be deep extended:
		// you can add your own custom options here if
		// and when you create one that shouldn't be
		// deep extended (see ajaxExtend)
		flatOptions: {
			context: true,
			url: true
		}
	},

	ajaxPrefilter: addToPrefiltersOrTransports( prefilters ),
	ajaxTransport: addToPrefiltersOrTransports( transports ),

	// Main method
	ajax: function( url, options ) {

		// If url is an object, simulate pre-1.5 signature
		if ( typeof url === "object" ) {
			options = url;
			url = undefined;
		}

		// Force options to be an object
		options = options || {};

		var // Create the final options object
			s = jQuery.ajaxSetup( {}, options ),
			// Callbacks context
			callbackContext = s.context || s,
			// Context for global events
			// It's the callbackContext if one was provided in the options
			// and if it's a DOM node or a jQuery collection
			globalEventContext = callbackContext !== s &&
				( callbackContext.nodeType || callbackContext instanceof jQuery ) ?
						jQuery( callbackContext ) : jQuery.event,
			// Deferreds
			deferred = jQuery.Deferred(),
			completeDeferred = jQuery.Callbacks( "once memory" ),
			// Status-dependent callbacks
			statusCode = s.statusCode || {},
			// ifModified key
			ifModifiedKey,
			// Headers (they are sent all at once)
			requestHeaders = {},
			requestHeadersNames = {},
			// Response headers
			responseHeadersString,
			responseHeaders,
			// transport
			transport,
			// timeout handle
			timeoutTimer,
			// Cross-domain detection vars
			parts,
			// The jqXHR state
			state = 0,
			// To know if global events are to be dispatched
			fireGlobals,
			// Loop variable
			i,
			// Fake xhr
			jqXHR = {

				readyState: 0,

				// Caches the header
				setRequestHeader: function( name, value ) {
					if ( !state ) {
						var lname = name.toLowerCase();
						name = requestHeadersNames[ lname ] = requestHeadersNames[ lname ] || name;
						requestHeaders[ name ] = value;
					}
					return this;
				},

				// Raw string
				getAllResponseHeaders: function() {
					return state === 2 ? responseHeadersString : null;
				},

				// Builds headers hashtable if needed
				getResponseHeader: function( key ) {
					var match;
					if ( state === 2 ) {
						if ( !responseHeaders ) {
							responseHeaders = {};
							while( ( match = rheaders.exec( responseHeadersString ) ) ) {
								responseHeaders[ match[1].toLowerCase() ] = match[ 2 ];
							}
						}
						match = responseHeaders[ key.toLowerCase() ];
					}
					return match === undefined ? null : match;
				},

				// Overrides response content-type header
				overrideMimeType: function( type ) {
					if ( !state ) {
						s.mimeType = type;
					}
					return this;
				},

				// Cancel the request
				abort: function( statusText ) {
					statusText = statusText || "abort";
					if ( transport ) {
						transport.abort( statusText );
					}
					done( 0, statusText );
					return this;
				}
			};

		// Callback for when everything is done
		// It is defined here because jslint complains if it is declared
		// at the end of the function (which would be more logical and readable)
		function done( status, nativeStatusText, responses, headers ) {

			// Called once
			if ( state === 2 ) {
				return;
			}

			// State is "done" now
			state = 2;

			// Clear timeout if it exists
			if ( timeoutTimer ) {
				clearTimeout( timeoutTimer );
			}

			// Dereference transport for early garbage collection
			// (no matter how long the jqXHR object will be used)
			transport = undefined;

			// Cache response headers
			responseHeadersString = headers || "";

			// Set readyState
			jqXHR.readyState = status > 0 ? 4 : 0;

			var isSuccess,
				success,
				error,
				statusText = nativeStatusText,
				response = responses ? ajaxHandleResponses( s, jqXHR, responses ) : undefined,
				lastModified,
				etag;

			// If successful, handle type chaining
			if ( status >= 200 && status < 300 || status === 304 ) {

				// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
				if ( s.ifModified ) {

					if ( ( lastModified = jqXHR.getResponseHeader( "Last-Modified" ) ) ) {
						jQuery.lastModified[ ifModifiedKey ] = lastModified;
					}
					if ( ( etag = jqXHR.getResponseHeader( "Etag" ) ) ) {
						jQuery.etag[ ifModifiedKey ] = etag;
					}
				}

				// If not modified
				if ( status === 304 ) {

					statusText = "notmodified";
					isSuccess = true;

				// If we have data
				} else {

					try {
						success = ajaxConvert( s, response );
						statusText = "success";
						isSuccess = true;
					} catch(e) {
						// We have a parsererror
						statusText = "parsererror";
						error = e;
					}
				}
			} else {
				// We extract error from statusText
				// then normalize statusText and status for non-aborts
				error = statusText;
				if ( !statusText || status ) {
					statusText = "error";
					if ( status < 0 ) {
						status = 0;
					}
				}
			}

			// Set data for the fake xhr object
			jqXHR.status = status;
			jqXHR.statusText = "" + ( nativeStatusText || statusText );

			// Success/Error
			if ( isSuccess ) {
				deferred.resolveWith( callbackContext, [ success, statusText, jqXHR ] );
			} else {
				deferred.rejectWith( callbackContext, [ jqXHR, statusText, error ] );
			}

			// Status-dependent callbacks
			jqXHR.statusCode( statusCode );
			statusCode = undefined;

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajax" + ( isSuccess ? "Success" : "Error" ),
						[ jqXHR, s, isSuccess ? success : error ] );
			}

			// Complete
			completeDeferred.fireWith( callbackContext, [ jqXHR, statusText ] );

			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxComplete", [ jqXHR, s ] );
				// Handle the global AJAX counter
				if ( !( --jQuery.active ) ) {
					jQuery.event.trigger( "ajaxStop" );
				}
			}
		}

		// Attach deferreds
		deferred.promise( jqXHR );
		jqXHR.success = jqXHR.done;
		jqXHR.error = jqXHR.fail;
		jqXHR.complete = completeDeferred.add;

		// Status-dependent callbacks
		jqXHR.statusCode = function( map ) {
			if ( map ) {
				var tmp;
				if ( state < 2 ) {
					for ( tmp in map ) {
						statusCode[ tmp ] = [ statusCode[tmp], map[tmp] ];
					}
				} else {
					tmp = map[ jqXHR.status ];
					jqXHR.then( tmp, tmp );
				}
			}
			return this;
		};

		// Remove hash character (#7531: and string promotion)
		// Add protocol if not provided (#5866: IE7 issue with protocol-less urls)
		// We also use the url parameter if available
		s.url = ( ( url || s.url ) + "" ).replace( rhash, "" ).replace( rprotocol, ajaxLocParts[ 1 ] + "//" );

		// Extract dataTypes list
		s.dataTypes = jQuery.trim( s.dataType || "*" ).toLowerCase().split( rspacesAjax );

		// Determine if a cross-domain request is in order
		if ( s.crossDomain == null ) {
			parts = rurl.exec( s.url.toLowerCase() );
			s.crossDomain = !!( parts &&
				( parts[ 1 ] != ajaxLocParts[ 1 ] || parts[ 2 ] != ajaxLocParts[ 2 ] ||
					( parts[ 3 ] || ( parts[ 1 ] === "http:" ? 80 : 443 ) ) !=
						( ajaxLocParts[ 3 ] || ( ajaxLocParts[ 1 ] === "http:" ? 80 : 443 ) ) )
			);
		}

		// Convert data if not already a string
		if ( s.data && s.processData && typeof s.data !== "string" ) {
			s.data = jQuery.param( s.data, s.traditional );
		}

		// Apply prefilters
		inspectPrefiltersOrTransports( prefilters, s, options, jqXHR );

		// If request was aborted inside a prefilter, stop there
		if ( state === 2 ) {
			return false;
		}

		// We can fire global events as of now if asked to
		fireGlobals = s.global;

		// Uppercase the type
		s.type = s.type.toUpperCase();

		// Determine if request has content
		s.hasContent = !rnoContent.test( s.type );

		// Watch for a new set of requests
		if ( fireGlobals && jQuery.active++ === 0 ) {
			jQuery.event.trigger( "ajaxStart" );
		}

		// More options handling for requests with no content
		if ( !s.hasContent ) {

			// If data is available, append data to url
			if ( s.data ) {
				s.url += ( rquery.test( s.url ) ? "&" : "?" ) + s.data;
				// #9682: remove data so that it's not used in an eventual retry
				delete s.data;
			}

			// Get ifModifiedKey before adding the anti-cache parameter
			ifModifiedKey = s.url;

			// Add anti-cache in url if needed
			if ( s.cache === false ) {

				var ts = jQuery.now(),
					// try replacing _= if it is there
					ret = s.url.replace( rts, "$1_=" + ts );

				// if nothing was replaced, add timestamp to the end
				s.url = ret + ( ( ret === s.url ) ? ( rquery.test( s.url ) ? "&" : "?" ) + "_=" + ts : "" );
			}
		}

		// Set the correct header, if data is being sent
		if ( s.data && s.hasContent && s.contentType !== false || options.contentType ) {
			jqXHR.setRequestHeader( "Content-Type", s.contentType );
		}

		// Set the If-Modified-Since and/or If-None-Match header, if in ifModified mode.
		if ( s.ifModified ) {
			ifModifiedKey = ifModifiedKey || s.url;
			if ( jQuery.lastModified[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-Modified-Since", jQuery.lastModified[ ifModifiedKey ] );
			}
			if ( jQuery.etag[ ifModifiedKey ] ) {
				jqXHR.setRequestHeader( "If-None-Match", jQuery.etag[ ifModifiedKey ] );
			}
		}

		// Set the Accepts header for the server, depending on the dataType
		jqXHR.setRequestHeader(
			"Accept",
			s.dataTypes[ 0 ] && s.accepts[ s.dataTypes[0] ] ?
				s.accepts[ s.dataTypes[0] ] + ( s.dataTypes[ 0 ] !== "*" ? ", " + allTypes + "; q=0.01" : "" ) :
				s.accepts[ "*" ]
		);

		// Check for headers option
		for ( i in s.headers ) {
			jqXHR.setRequestHeader( i, s.headers[ i ] );
		}

		// Allow custom headers/mimetypes and early abort
		if ( s.beforeSend && ( s.beforeSend.call( callbackContext, jqXHR, s ) === false || state === 2 ) ) {
				// Abort if not done already
				jqXHR.abort();
				return false;

		}

		// Install callbacks on deferreds
		for ( i in { success: 1, error: 1, complete: 1 } ) {
			jqXHR[ i ]( s[ i ] );
		}

		// Get transport
		transport = inspectPrefiltersOrTransports( transports, s, options, jqXHR );

		// If no transport, we auto-abort
		if ( !transport ) {
			done( -1, "No Transport" );
		} else {
			jqXHR.readyState = 1;
			// Send global event
			if ( fireGlobals ) {
				globalEventContext.trigger( "ajaxSend", [ jqXHR, s ] );
			}
			// Timeout
			if ( s.async && s.timeout > 0 ) {
				timeoutTimer = setTimeout( function(){
					jqXHR.abort( "timeout" );
				}, s.timeout );
			}

			try {
				state = 1;
				transport.send( requestHeaders, done );
			} catch (e) {
				// Propagate exception as error if not done
				if ( state < 2 ) {
					done( -1, e );
				// Simply rethrow otherwise
				} else {
					throw e;
				}
			}
		}

		return jqXHR;
	},

	// Serialize an array of form elements or a set of
	// key/values into a query string
	param: function( a, traditional ) {
		var s = [],
			add = function( key, value ) {
				// If value is a function, invoke it and return its value
				value = jQuery.isFunction( value ) ? value() : value;
				s[ s.length ] = encodeURIComponent( key ) + "=" + encodeURIComponent( value );
			};

		// Set traditional to true for jQuery <= 1.3.2 behavior.
		if ( traditional === undefined ) {
			traditional = jQuery.ajaxSettings.traditional;
		}

		// If an array was passed in, assume that it is an array of form elements.
		if ( jQuery.isArray( a ) || ( a.jquery && !jQuery.isPlainObject( a ) ) ) {
			// Serialize the form elements
			jQuery.each( a, function() {
				add( this.name, this.value );
			});

		} else {
			// If traditional, encode the "old" way (the way 1.3.2 or older
			// did it), otherwise encode params recursively.
			for ( var prefix in a ) {
				buildParams( prefix, a[ prefix ], traditional, add );
			}
		}

		// Return the resulting serialization
		return s.join( "&" ).replace( r20, "+" );
	}
});

function buildParams( prefix, obj, traditional, add ) {
	if ( jQuery.isArray( obj ) ) {
		// Serialize array item.
		jQuery.each( obj, function( i, v ) {
			if ( traditional || rbracket.test( prefix ) ) {
				// Treat each array item as a scalar.
				add( prefix, v );

			} else {
				// If array item is non-scalar (array or object), encode its
				// numeric index to resolve deserialization ambiguity issues.
				// Note that rack (as of 1.0.0) can't currently deserialize
				// nested arrays properly, and attempting to do so may cause
				// a server error. Possible fixes are to modify rack's
				// deserialization algorithm or to provide an option or flag
				// to force array serialization to be shallow.
				buildParams( prefix + "[" + ( typeof v === "object" ? i : "" ) + "]", v, traditional, add );
			}
		});

	} else if ( !traditional && jQuery.type( obj ) === "object" ) {
		// Serialize object item.
		for ( var name in obj ) {
			buildParams( prefix + "[" + name + "]", obj[ name ], traditional, add );
		}

	} else {
		// Serialize scalar item.
		add( prefix, obj );
	}
}

// This is still on the jQuery object... for now
// Want to move this to jQuery.ajax some day
jQuery.extend({

	// Counter for holding the number of active queries
	active: 0,

	// Last-Modified header cache for next request
	lastModified: {},
	etag: {}

});

/* Handles responses to an ajax request:
 * - sets all responseXXX fields accordingly
 * - finds the right dataType (mediates between content-type and expected dataType)
 * - returns the corresponding response
 */
function ajaxHandleResponses( s, jqXHR, responses ) {

	var contents = s.contents,
		dataTypes = s.dataTypes,
		responseFields = s.responseFields,
		ct,
		type,
		finalDataType,
		firstDataType;

	// Fill responseXXX fields
	for ( type in responseFields ) {
		if ( type in responses ) {
			jqXHR[ responseFields[type] ] = responses[ type ];
		}
	}

	// Remove auto dataType and get content-type in the process
	while( dataTypes[ 0 ] === "*" ) {
		dataTypes.shift();
		if ( ct === undefined ) {
			ct = s.mimeType || jqXHR.getResponseHeader( "content-type" );
		}
	}

	// Check if we're dealing with a known content-type
	if ( ct ) {
		for ( type in contents ) {
			if ( contents[ type ] && contents[ type ].test( ct ) ) {
				dataTypes.unshift( type );
				break;
			}
		}
	}

	// Check to see if we have a response for the expected dataType
	if ( dataTypes[ 0 ] in responses ) {
		finalDataType = dataTypes[ 0 ];
	} else {
		// Try convertible dataTypes
		for ( type in responses ) {
			if ( !dataTypes[ 0 ] || s.converters[ type + " " + dataTypes[0] ] ) {
				finalDataType = type;
				break;
			}
			if ( !firstDataType ) {
				firstDataType = type;
			}
		}
		// Or just use first one
		finalDataType = finalDataType || firstDataType;
	}

	// If we found a dataType
	// We add the dataType to the list if needed
	// and return the corresponding response
	if ( finalDataType ) {
		if ( finalDataType !== dataTypes[ 0 ] ) {
			dataTypes.unshift( finalDataType );
		}
		return responses[ finalDataType ];
	}
}

// Chain conversions given the request and the original response
function ajaxConvert( s, response ) {

	// Apply the dataFilter if provided
	if ( s.dataFilter ) {
		response = s.dataFilter( response, s.dataType );
	}

	var dataTypes = s.dataTypes,
		converters = {},
		i,
		key,
		length = dataTypes.length,
		tmp,
		// Current and previous dataTypes
		current = dataTypes[ 0 ],
		prev,
		// Conversion expression
		conversion,
		// Conversion function
		conv,
		// Conversion functions (transitive conversion)
		conv1,
		conv2;

	// For each dataType in the chain
	for ( i = 1; i < length; i++ ) {

		// Create converters map
		// with lowercased keys
		if ( i === 1 ) {
			for ( key in s.converters ) {
				if ( typeof key === "string" ) {
					converters[ key.toLowerCase() ] = s.converters[ key ];
				}
			}
		}

		// Get the dataTypes
		prev = current;
		current = dataTypes[ i ];

		// If current is auto dataType, update it to prev
		if ( current === "*" ) {
			current = prev;
		// If no auto and dataTypes are actually different
		} else if ( prev !== "*" && prev !== current ) {

			// Get the converter
			conversion = prev + " " + current;
			conv = converters[ conversion ] || converters[ "* " + current ];

			// If there is no direct converter, search transitively
			if ( !conv ) {
				conv2 = undefined;
				for ( conv1 in converters ) {
					tmp = conv1.split( " " );
					if ( tmp[ 0 ] === prev || tmp[ 0 ] === "*" ) {
						conv2 = converters[ tmp[1] + " " + current ];
						if ( conv2 ) {
							conv1 = converters[ conv1 ];
							if ( conv1 === true ) {
								conv = conv2;
							} else if ( conv2 === true ) {
								conv = conv1;
							}
							break;
						}
					}
				}
			}
			// If we found no converter, dispatch an error
			if ( !( conv || conv2 ) ) {
				jQuery.error( "No conversion from " + conversion.replace(" "," to ") );
			}
			// If found converter is not an equivalence
			if ( conv !== true ) {
				// Convert with 1 or 2 converters accordingly
				response = conv ? conv( response ) : conv2( conv1(response) );
			}
		}
	}
	return response;
}




var jsc = jQuery.now(),
	jsre = /(\=)\?(&|$)|\?\?/i;

// Default jsonp settings
jQuery.ajaxSetup({
	jsonp: "callback",
	jsonpCallback: function() {
		return jQuery.expando + "_" + ( jsc++ );
	}
});

// Detect, normalize options and install callbacks for jsonp requests
jQuery.ajaxPrefilter( "json jsonp", function( s, originalSettings, jqXHR ) {

	var inspectData = ( typeof s.data === "string" ) && /^application\/x\-www\-form\-urlencoded/.test( s.contentType );

	if ( s.dataTypes[ 0 ] === "jsonp" ||
		s.jsonp !== false && ( jsre.test( s.url ) ||
				inspectData && jsre.test( s.data ) ) ) {

		var responseContainer,
			jsonpCallback = s.jsonpCallback =
				jQuery.isFunction( s.jsonpCallback ) ? s.jsonpCallback() : s.jsonpCallback,
			previous = window[ jsonpCallback ],
			url = s.url,
			data = s.data,
			replace = "$1" + jsonpCallback + "$2";

		if ( s.jsonp !== false ) {
			url = url.replace( jsre, replace );
			if ( s.url === url ) {
				if ( inspectData ) {
					data = data.replace( jsre, replace );
				}
				if ( s.data === data ) {
					// Add callback manually
					url += (/\?/.test( url ) ? "&" : "?") + s.jsonp + "=" + jsonpCallback;
				}
			}
		}

		s.url = url;
		s.data = data;

		// Install callback
		window[ jsonpCallback ] = function( response ) {
			responseContainer = [ response ];
		};

		// Clean-up function
		jqXHR.always(function() {
			// Set callback back to previous value
			window[ jsonpCallback ] = previous;
			// Call if it was a function and we have a response
			if ( responseContainer && jQuery.isFunction( previous ) ) {
				window[ jsonpCallback ]( responseContainer[ 0 ] );
			}
		});

		// Use data converter to retrieve json after script execution
		s.converters["script json"] = function() {
			if ( !responseContainer ) {
				jQuery.error( jsonpCallback + " was not called" );
			}
			return responseContainer[ 0 ];
		};

		// force json dataType
		s.dataTypes[ 0 ] = "json";

		// Delegate to script
		return "script";
	}
});




// Install script dataType
jQuery.ajaxSetup({
	accepts: {
		script: "text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"
	},
	contents: {
		script: /javascript|ecmascript/
	},
	converters: {
		"text script": function( text ) {
			jQuery.globalEval( text );
			return text;
		}
	}
});

// Handle cache's special case and global
jQuery.ajaxPrefilter( "script", function( s ) {
	if ( s.cache === undefined ) {
		s.cache = false;
	}
	if ( s.crossDomain ) {
		s.type = "GET";
		s.global = false;
	}
});

// Bind script tag hack transport
jQuery.ajaxTransport( "script", function(s) {

	// This transport only deals with cross domain requests
	if ( s.crossDomain ) {

		var script,
			head = document.head || document.getElementsByTagName( "head" )[0] || document.documentElement;

		return {

			send: function( _, callback ) {

				script = document.createElement( "script" );

				script.async = "async";

				if ( s.scriptCharset ) {
					script.charset = s.scriptCharset;
				}

				script.src = s.url;

				// Attach handlers for all browsers
				script.onload = script.onreadystatechange = function( _, isAbort ) {

					if ( isAbort || !script.readyState || /loaded|complete/.test( script.readyState ) ) {

						// Handle memory leak in IE
						script.onload = script.onreadystatechange = null;

						// Remove the script
						if ( head && script.parentNode ) {
							head.removeChild( script );
						}

						// Dereference the script
						script = undefined;

						// Callback if not abort
						if ( !isAbort ) {
							callback( 200, "success" );
						}
					}
				};
				// Use insertBefore instead of appendChild  to circumvent an IE6 bug.
				// This arises when a base node is used (#2709 and #4378).
				head.insertBefore( script, head.firstChild );
			},

			abort: function() {
				if ( script ) {
					script.onload( 0, 1 );
				}
			}
		};
	}
});




var // #5280: Internet Explorer will keep connections alive if we don't abort on unload
	xhrOnUnloadAbort = window.ActiveXObject ? function() {
		// Abort all pending requests
		for ( var key in xhrCallbacks ) {
			xhrCallbacks[ key ]( 0, 1 );
		}
	} : false,
	xhrId = 0,
	xhrCallbacks;

// Functions to create xhrs
function createStandardXHR() {
	try {
		return new window.XMLHttpRequest();
	} catch( e ) {}
}

function createActiveXHR() {
	try {
		return new window.ActiveXObject( "Microsoft.XMLHTTP" );
	} catch( e ) {}
}

// Create the request object
// (This is still attached to ajaxSettings for backward compatibility)
jQuery.ajaxSettings.xhr = window.ActiveXObject ?
	/* Microsoft failed to properly
	 * implement the XMLHttpRequest in IE7 (can't request local files),
	 * so we use the ActiveXObject when it is available
	 * Additionally XMLHttpRequest can be disabled in IE7/IE8 so
	 * we need a fallback.
	 */
	function() {
		return !this.isLocal && createStandardXHR() || createActiveXHR();
	} :
	// For all other browsers, use the standard XMLHttpRequest object
	createStandardXHR;

// Determine support properties
(function( xhr ) {
	jQuery.extend( jQuery.support, {
		ajax: !!xhr,
		cors: !!xhr && ( "withCredentials" in xhr )
	});
})( jQuery.ajaxSettings.xhr() );

// Create transport if the browser can provide an xhr
if ( jQuery.support.ajax ) {

	jQuery.ajaxTransport(function( s ) {
		// Cross domain only allowed if supported through XMLHttpRequest
		if ( !s.crossDomain || jQuery.support.cors ) {

			var callback;

			return {
				send: function( headers, complete ) {

					// Get a new xhr
					var xhr = s.xhr(),
						handle,
						i;

					// Open the socket
					// Passing null username, generates a login popup on Opera (#2865)
					if ( s.username ) {
						xhr.open( s.type, s.url, s.async, s.username, s.password );
					} else {
						xhr.open( s.type, s.url, s.async );
					}

					// Apply custom fields if provided
					if ( s.xhrFields ) {
						for ( i in s.xhrFields ) {
							xhr[ i ] = s.xhrFields[ i ];
						}
					}

					// Override mime type if needed
					if ( s.mimeType && xhr.overrideMimeType ) {
						xhr.overrideMimeType( s.mimeType );
					}

					// X-Requested-With header
					// For cross-domain requests, seeing as conditions for a preflight are
					// akin to a jigsaw puzzle, we simply never set it to be sure.
					// (it can always be set on a per-request basis or even using ajaxSetup)
					// For same-domain requests, won't change header if already provided.
					if ( !s.crossDomain && !headers["X-Requested-With"] ) {
						headers[ "X-Requested-With" ] = "XMLHttpRequest";
					}

					// Need an extra try/catch for cross domain requests in Firefox 3
					try {
						for ( i in headers ) {
							xhr.setRequestHeader( i, headers[ i ] );
						}
					} catch( _ ) {}

					// Do send the request
					// This may raise an exception which is actually
					// handled in jQuery.ajax (so no try/catch here)
					xhr.send( ( s.hasContent && s.data ) || null );

					// Listener
					callback = function( _, isAbort ) {

						var status,
							statusText,
							responseHeaders,
							responses,
							xml;

						// Firefox throws exceptions when accessing properties
						// of an xhr when a network error occured
						// http://helpful.knobs-dials.com/index.php/Component_returned_failure_code:_0x80040111_(NS_ERROR_NOT_AVAILABLE)
						try {

							// Was never called and is aborted or complete
							if ( callback && ( isAbort || xhr.readyState === 4 ) ) {

								// Only called once
								callback = undefined;

								// Do not keep as active anymore
								if ( handle ) {
									xhr.onreadystatechange = jQuery.noop;
									if ( xhrOnUnloadAbort ) {
										delete xhrCallbacks[ handle ];
									}
								}

								// If it's an abort
								if ( isAbort ) {
									// Abort it manually if needed
									if ( xhr.readyState !== 4 ) {
										xhr.abort();
									}
								} else {
									status = xhr.status;
									responseHeaders = xhr.getAllResponseHeaders();
									responses = {};
									xml = xhr.responseXML;

									// Construct response list
									if ( xml && xml.documentElement /* #4958 */ ) {
										responses.xml = xml;
									}

									// When requesting binary data, IE6-9 will throw an exception
									// on any attempt to access responseText (#11426)
									try {
										responses.text = xhr.responseText;
									} catch( _ ) {
									}

									// Firefox throws an exception when accessing
									// statusText for faulty cross-domain requests
									try {
										statusText = xhr.statusText;
									} catch( e ) {
										// We normalize with Webkit giving an empty statusText
										statusText = "";
									}

									// Filter status for non standard behaviors

									// If the request is local and we have data: assume a success
									// (success with no data won't get notified, that's the best we
									// can do given current implementations)
									if ( !status && s.isLocal && !s.crossDomain ) {
										status = responses.text ? 200 : 404;
									// IE - #1450: sometimes returns 1223 when it should be 204
									} else if ( status === 1223 ) {
										status = 204;
									}
								}
							}
						} catch( firefoxAccessException ) {
							if ( !isAbort ) {
								complete( -1, firefoxAccessException );
							}
						}

						// Call complete if needed
						if ( responses ) {
							complete( status, statusText, responses, responseHeaders );
						}
					};

					// if we're in sync mode or it's in cache
					// and has been retrieved directly (IE6 & IE7)
					// we need to manually fire the callback
					if ( !s.async || xhr.readyState === 4 ) {
						callback();
					} else {
						handle = ++xhrId;
						if ( xhrOnUnloadAbort ) {
							// Create the active xhrs callbacks list if needed
							// and attach the unload handler
							if ( !xhrCallbacks ) {
								xhrCallbacks = {};
								jQuery( window ).unload( xhrOnUnloadAbort );
							}
							// Add to list of active xhrs callbacks
							xhrCallbacks[ handle ] = callback;
						}
						xhr.onreadystatechange = callback;
					}
				},

				abort: function() {
					if ( callback ) {
						callback(0,1);
					}
				}
			};
		}
	});
}




var elemdisplay = {},
	iframe, iframeDoc,
	rfxtypes = /^(?:toggle|show|hide)$/,
	rfxnum = /^([+\-]=)?([\d+.\-]+)([a-z%]*)$/i,
	timerId,
	fxAttrs = [
		// height animations
		[ "height", "marginTop", "marginBottom", "paddingTop", "paddingBottom" ],
		// width animations
		[ "width", "marginLeft", "marginRight", "paddingLeft", "paddingRight" ],
		// opacity animations
		[ "opacity" ]
	],
	fxNow;

jQuery.fn.extend({
	show: function( speed, easing, callback ) {
		var elem, display;

		if ( speed || speed === 0 ) {
			return this.animate( genFx("show", 3), speed, easing, callback );

		} else {
			for ( var i = 0, j = this.length; i < j; i++ ) {
				elem = this[ i ];

				if ( elem.style ) {
					display = elem.style.display;

					// Reset the inline display of this element to learn if it is
					// being hidden by cascaded rules or not
					if ( !jQuery._data(elem, "olddisplay") && display === "none" ) {
						display = elem.style.display = "";
					}

					// Set elements which have been overridden with display: none
					// in a stylesheet to whatever the default browser style is
					// for such an element
					if ( (display === "" && jQuery.css(elem, "display") === "none") ||
						!jQuery.contains( elem.ownerDocument.documentElement, elem ) ) {
						jQuery._data( elem, "olddisplay", defaultDisplay(elem.nodeName) );
					}
				}
			}

			// Set the display of most of the elements in a second loop
			// to avoid the constant reflow
			for ( i = 0; i < j; i++ ) {
				elem = this[ i ];

				if ( elem.style ) {
					display = elem.style.display;

					if ( display === "" || display === "none" ) {
						elem.style.display = jQuery._data( elem, "olddisplay" ) || "";
					}
				}
			}

			return this;
		}
	},

	hide: function( speed, easing, callback ) {
		if ( speed || speed === 0 ) {
			return this.animate( genFx("hide", 3), speed, easing, callback);

		} else {
			var elem, display,
				i = 0,
				j = this.length;

			for ( ; i < j; i++ ) {
				elem = this[i];
				if ( elem.style ) {
					display = jQuery.css( elem, "display" );

					if ( display !== "none" && !jQuery._data( elem, "olddisplay" ) ) {
						jQuery._data( elem, "olddisplay", display );
					}
				}
			}

			// Set the display of the elements in a second loop
			// to avoid the constant reflow
			for ( i = 0; i < j; i++ ) {
				if ( this[i].style ) {
					this[i].style.display = "none";
				}
			}

			return this;
		}
	},

	// Save the old toggle function
	_toggle: jQuery.fn.toggle,

	toggle: function( fn, fn2, callback ) {
		var bool = typeof fn === "boolean";

		if ( jQuery.isFunction(fn) && jQuery.isFunction(fn2) ) {
			this._toggle.apply( this, arguments );

		} else if ( fn == null || bool ) {
			this.each(function() {
				var state = bool ? fn : jQuery(this).is(":hidden");
				jQuery(this)[ state ? "show" : "hide" ]();
			});

		} else {
			this.animate(genFx("toggle", 3), fn, fn2, callback);
		}

		return this;
	},

	fadeTo: function( speed, to, easing, callback ) {
		return this.filter(":hidden").css("opacity", 0).show().end()
					.animate({opacity: to}, speed, easing, callback);
	},

	animate: function( prop, speed, easing, callback ) {
		var optall = jQuery.speed( speed, easing, callback );

		if ( jQuery.isEmptyObject( prop ) ) {
			return this.each( optall.complete, [ false ] );
		}

		// Do not change referenced properties as per-property easing will be lost
		prop = jQuery.extend( {}, prop );

		function doAnimation() {
			// XXX 'this' does not always have a nodeName when running the
			// test suite

			if ( optall.queue === false ) {
				jQuery._mark( this );
			}

			var opt = jQuery.extend( {}, optall ),
				isElement = this.nodeType === 1,
				hidden = isElement && jQuery(this).is(":hidden"),
				name, val, p, e, hooks, replace,
				parts, start, end, unit,
				method;

			// will store per property easing and be used to determine when an animation is complete
			opt.animatedProperties = {};

			// first pass over propertys to expand / normalize
			for ( p in prop ) {
				name = jQuery.camelCase( p );
				if ( p !== name ) {
					prop[ name ] = prop[ p ];
					delete prop[ p ];
				}

				if ( ( hooks = jQuery.cssHooks[ name ] ) && "expand" in hooks ) {
					replace = hooks.expand( prop[ name ] );
					delete prop[ name ];

					// not quite $.extend, this wont overwrite keys already present.
					// also - reusing 'p' from above because we have the correct "name"
					for ( p in replace ) {
						if ( ! ( p in prop ) ) {
							prop[ p ] = replace[ p ];
						}
					}
				}
			}

			for ( name in prop ) {
				val = prop[ name ];
				// easing resolution: per property > opt.specialEasing > opt.easing > 'swing' (default)
				if ( jQuery.isArray( val ) ) {
					opt.animatedProperties[ name ] = val[ 1 ];
					val = prop[ name ] = val[ 0 ];
				} else {
					opt.animatedProperties[ name ] = opt.specialEasing && opt.specialEasing[ name ] || opt.easing || 'swing';
				}

				if ( val === "hide" && hidden || val === "show" && !hidden ) {
					return opt.complete.call( this );
				}

				if ( isElement && ( name === "height" || name === "width" ) ) {
					// Make sure that nothing sneaks out
					// Record all 3 overflow attributes because IE does not
					// change the overflow attribute when overflowX and
					// overflowY are set to the same value
					opt.overflow = [ this.style.overflow, this.style.overflowX, this.style.overflowY ];

					// Set display property to inline-block for height/width
					// animations on inline elements that are having width/height animated
					if ( jQuery.css( this, "display" ) === "inline" &&
							jQuery.css( this, "float" ) === "none" ) {

						// inline-level elements accept inline-block;
						// block-level elements need to be inline with layout
						if ( !jQuery.support.inlineBlockNeedsLayout || defaultDisplay( this.nodeName ) === "inline" ) {
							this.style.display = "inline-block";

						} else {
							this.style.zoom = 1;
						}
					}
				}
			}

			if ( opt.overflow != null ) {
				this.style.overflow = "hidden";
			}

			for ( p in prop ) {
				e = new jQuery.fx( this, opt, p );
				val = prop[ p ];

				if ( rfxtypes.test( val ) ) {

					// Tracks whether to show or hide based on private
					// data attached to the element
					method = jQuery._data( this, "toggle" + p ) || ( val === "toggle" ? hidden ? "show" : "hide" : 0 );
					if ( method ) {
						jQuery._data( this, "toggle" + p, method === "show" ? "hide" : "show" );
						e[ method ]();
					} else {
						e[ val ]();
					}

				} else {
					parts = rfxnum.exec( val );
					start = e.cur();

					if ( parts ) {
						end = parseFloat( parts[2] );
						unit = parts[3] || ( jQuery.cssNumber[ p ] ? "" : "px" );

						// We need to compute starting value
						if ( unit !== "px" ) {
							jQuery.style( this, p, (end || 1) + unit);
							start = ( (end || 1) / e.cur() ) * start;
							jQuery.style( this, p, start + unit);
						}

						// If a +=/-= token was provided, we're doing a relative animation
						if ( parts[1] ) {
							end = ( (parts[ 1 ] === "-=" ? -1 : 1) * end ) + start;
						}

						e.custom( start, end, unit );

					} else {
						e.custom( start, val, "" );
					}
				}
			}

			// For JS strict compliance
			return true;
		}

		return optall.queue === false ?
			this.each( doAnimation ) :
			this.queue( optall.queue, doAnimation );
	},

	stop: function( type, clearQueue, gotoEnd ) {
		if ( typeof type !== "string" ) {
			gotoEnd = clearQueue;
			clearQueue = type;
			type = undefined;
		}
		if ( clearQueue && type !== false ) {
			this.queue( type || "fx", [] );
		}

		return this.each(function() {
			var index,
				hadTimers = false,
				timers = jQuery.timers,
				data = jQuery._data( this );

			// clear marker counters if we know they won't be
			if ( !gotoEnd ) {
				jQuery._unmark( true, this );
			}

			function stopQueue( elem, data, index ) {
				var hooks = data[ index ];
				jQuery.removeData( elem, index, true );
				hooks.stop( gotoEnd );
			}

			if ( type == null ) {
				for ( index in data ) {
					if ( data[ index ] && data[ index ].stop && index.indexOf(".run") === index.length - 4 ) {
						stopQueue( this, data, index );
					}
				}
			} else if ( data[ index = type + ".run" ] && data[ index ].stop ){
				stopQueue( this, data, index );
			}

			for ( index = timers.length; index--; ) {
				if ( timers[ index ].elem === this && (type == null || timers[ index ].queue === type) ) {
					if ( gotoEnd ) {

						// force the next step to be the last
						timers[ index ]( true );
					} else {
						timers[ index ].saveState();
					}
					hadTimers = true;
					timers.splice( index, 1 );
				}
			}

			// start the next in the queue if the last step wasn't forced
			// timers currently will call their complete callbacks, which will dequeue
			// but only if they were gotoEnd
			if ( !( gotoEnd && hadTimers ) ) {
				jQuery.dequeue( this, type );
			}
		});
	}

});

// Animations created synchronously will run synchronously
function createFxNow() {
	setTimeout( clearFxNow, 0 );
	return ( fxNow = jQuery.now() );
}

function clearFxNow() {
	fxNow = undefined;
}

// Generate parameters to create a standard animation
function genFx( type, num ) {
	var obj = {};

	jQuery.each( fxAttrs.concat.apply([], fxAttrs.slice( 0, num )), function() {
		obj[ this ] = type;
	});

	return obj;
}

// Generate shortcuts for custom animations
jQuery.each({
	slideDown: genFx( "show", 1 ),
	slideUp: genFx( "hide", 1 ),
	slideToggle: genFx( "toggle", 1 ),
	fadeIn: { opacity: "show" },
	fadeOut: { opacity: "hide" },
	fadeToggle: { opacity: "toggle" }
}, function( name, props ) {
	jQuery.fn[ name ] = function( speed, easing, callback ) {
		return this.animate( props, speed, easing, callback );
	};
});

jQuery.extend({
	speed: function( speed, easing, fn ) {
		var opt = speed && typeof speed === "object" ? jQuery.extend( {}, speed ) : {
			complete: fn || !fn && easing ||
				jQuery.isFunction( speed ) && speed,
			duration: speed,
			easing: fn && easing || easing && !jQuery.isFunction( easing ) && easing
		};

		opt.duration = jQuery.fx.off ? 0 : typeof opt.duration === "number" ? opt.duration :
			opt.duration in jQuery.fx.speeds ? jQuery.fx.speeds[ opt.duration ] : jQuery.fx.speeds._default;

		// normalize opt.queue - true/undefined/null -> "fx"
		if ( opt.queue == null || opt.queue === true ) {
			opt.queue = "fx";
		}

		// Queueing
		opt.old = opt.complete;

		opt.complete = function( noUnmark ) {
			if ( jQuery.isFunction( opt.old ) ) {
				opt.old.call( this );
			}

			if ( opt.queue ) {
				jQuery.dequeue( this, opt.queue );
			} else if ( noUnmark !== false ) {
				jQuery._unmark( this );
			}
		};

		return opt;
	},

	easing: {
		linear: function( p ) {
			return p;
		},
		swing: function( p ) {
			return ( -Math.cos( p*Math.PI ) / 2 ) + 0.5;
		}
	},

	timers: [],

	fx: function( elem, options, prop ) {
		this.options = options;
		this.elem = elem;
		this.prop = prop;

		options.orig = options.orig || {};
	}

});

jQuery.fx.prototype = {
	// Simple function for setting a style value
	update: function() {
		if ( this.options.step ) {
			this.options.step.call( this.elem, this.now, this );
		}

		( jQuery.fx.step[ this.prop ] || jQuery.fx.step._default )( this );
	},

	// Get the current size
	cur: function() {
		if ( this.elem[ this.prop ] != null && (!this.elem.style || this.elem.style[ this.prop ] == null) ) {
			return this.elem[ this.prop ];
		}

		var parsed,
			r = jQuery.css( this.elem, this.prop );
		// Empty strings, null, undefined and "auto" are converted to 0,
		// complex values such as "rotate(1rad)" are returned as is,
		// simple values such as "10px" are parsed to Float.
		return isNaN( parsed = parseFloat( r ) ) ? !r || r === "auto" ? 0 : r : parsed;
	},

	// Start an animation from one number to another
	custom: function( from, to, unit ) {
		var self = this,
			fx = jQuery.fx;

		this.startTime = fxNow || createFxNow();
		this.end = to;
		this.now = this.start = from;
		this.pos = this.state = 0;
		this.unit = unit || this.unit || ( jQuery.cssNumber[ this.prop ] ? "" : "px" );

		function t( gotoEnd ) {
			return self.step( gotoEnd );
		}

		t.queue = this.options.queue;
		t.elem = this.elem;
		t.saveState = function() {
			if ( jQuery._data( self.elem, "fxshow" + self.prop ) === undefined ) {
				if ( self.options.hide ) {
					jQuery._data( self.elem, "fxshow" + self.prop, self.start );
				} else if ( self.options.show ) {
					jQuery._data( self.elem, "fxshow" + self.prop, self.end );
				}
			}
		};

		if ( t() && jQuery.timers.push(t) && !timerId ) {
			timerId = setInterval( fx.tick, fx.interval );
		}
	},

	// Simple 'show' function
	show: function() {
		var dataShow = jQuery._data( this.elem, "fxshow" + this.prop );

		// Remember where we started, so that we can go back to it later
		this.options.orig[ this.prop ] = dataShow || jQuery.style( this.elem, this.prop );
		this.options.show = true;

		// Begin the animation
		// Make sure that we start at a small width/height to avoid any flash of content
		if ( dataShow !== undefined ) {
			// This show is picking up where a previous hide or show left off
			this.custom( this.cur(), dataShow );
		} else {
			this.custom( this.prop === "width" || this.prop === "height" ? 1 : 0, this.cur() );
		}

		// Start by showing the element
		jQuery( this.elem ).show();
	},

	// Simple 'hide' function
	hide: function() {
		// Remember where we started, so that we can go back to it later
		this.options.orig[ this.prop ] = jQuery._data( this.elem, "fxshow" + this.prop ) || jQuery.style( this.elem, this.prop );
		this.options.hide = true;

		// Begin the animation
		this.custom( this.cur(), 0 );
	},

	// Each step of an animation
	step: function( gotoEnd ) {
		var p, n, complete,
			t = fxNow || createFxNow(),
			done = true,
			elem = this.elem,
			options = this.options;

		if ( gotoEnd || t >= options.duration + this.startTime ) {
			this.now = this.end;
			this.pos = this.state = 1;
			this.update();

			options.animatedProperties[ this.prop ] = true;

			for ( p in options.animatedProperties ) {
				if ( options.animatedProperties[ p ] !== true ) {
					done = false;
				}
			}

			if ( done ) {
				// Reset the overflow
				if ( options.overflow != null && !jQuery.support.shrinkWrapBlocks ) {

					jQuery.each( [ "", "X", "Y" ], function( index, value ) {
						elem.style[ "overflow" + value ] = options.overflow[ index ];
					});
				}

				// Hide the element if the "hide" operation was done
				if ( options.hide ) {
					jQuery( elem ).hide();
				}

				// Reset the properties, if the item has been hidden or shown
				if ( options.hide || options.show ) {
					for ( p in options.animatedProperties ) {
						jQuery.style( elem, p, options.orig[ p ] );
						jQuery.removeData( elem, "fxshow" + p, true );
						// Toggle data is no longer needed
						jQuery.removeData( elem, "toggle" + p, true );
					}
				}

				// Execute the complete function
				// in the event that the complete function throws an exception
				// we must ensure it won't be called twice. #5684

				complete = options.complete;
				if ( complete ) {

					options.complete = false;
					complete.call( elem );
				}
			}

			return false;

		} else {
			// classical easing cannot be used with an Infinity duration
			if ( options.duration == Infinity ) {
				this.now = t;
			} else {
				n = t - this.startTime;
				this.state = n / options.duration;

				// Perform the easing function, defaults to swing
				this.pos = jQuery.easing[ options.animatedProperties[this.prop] ]( this.state, n, 0, 1, options.duration );
				this.now = this.start + ( (this.end - this.start) * this.pos );
			}
			// Perform the next step of the animation
			this.update();
		}

		return true;
	}
};

jQuery.extend( jQuery.fx, {
	tick: function() {
		var timer,
			timers = jQuery.timers,
			i = 0;

		for ( ; i < timers.length; i++ ) {
			timer = timers[ i ];
			// Checks the timer has not already been removed
			if ( !timer() && timers[ i ] === timer ) {
				timers.splice( i--, 1 );
			}
		}

		if ( !timers.length ) {
			jQuery.fx.stop();
		}
	},

	interval: 13,

	stop: function() {
		clearInterval( timerId );
		timerId = null;
	},

	speeds: {
		slow: 600,
		fast: 200,
		// Default speed
		_default: 400
	},

	step: {
		opacity: function( fx ) {
			jQuery.style( fx.elem, "opacity", fx.now );
		},

		_default: function( fx ) {
			if ( fx.elem.style && fx.elem.style[ fx.prop ] != null ) {
				fx.elem.style[ fx.prop ] = fx.now + fx.unit;
			} else {
				fx.elem[ fx.prop ] = fx.now;
			}
		}
	}
});

// Ensure props that can't be negative don't go there on undershoot easing
jQuery.each( fxAttrs.concat.apply( [], fxAttrs ), function( i, prop ) {
	// exclude marginTop, marginLeft, marginBottom and marginRight from this list
	if ( prop.indexOf( "margin" ) ) {
		jQuery.fx.step[ prop ] = function( fx ) {
			jQuery.style( fx.elem, prop, Math.max(0, fx.now) + fx.unit );
		};
	}
});

if ( jQuery.expr && jQuery.expr.filters ) {
	jQuery.expr.filters.animated = function( elem ) {
		return jQuery.grep(jQuery.timers, function( fn ) {
			return elem === fn.elem;
		}).length;
	};
}

// Try to restore the default display value of an element
function defaultDisplay( nodeName ) {

	if ( !elemdisplay[ nodeName ] ) {

		var body = document.body,
			elem = jQuery( "<" + nodeName + ">" ).appendTo( body ),
			display = elem.css( "display" );
		elem.remove();

		// If the simple way fails,
		// get element's real default display by attaching it to a temp iframe
		if ( display === "none" || display === "" ) {
			// No iframe to use yet, so create it
			if ( !iframe ) {
				iframe = document.createElement( "iframe" );
				iframe.frameBorder = iframe.width = iframe.height = 0;
			}

			body.appendChild( iframe );

			// Create a cacheable copy of the iframe document on first call.
			// IE and Opera will allow us to reuse the iframeDoc without re-writing the fake HTML
			// document to it; WebKit & Firefox won't allow reusing the iframe document.
			if ( !iframeDoc || !iframe.createElement ) {
				iframeDoc = ( iframe.contentWindow || iframe.contentDocument ).document;
				iframeDoc.write( ( jQuery.support.boxModel ? "<!doctype html>" : "" ) + "<html><body>" );
				iframeDoc.close();
			}

			elem = iframeDoc.createElement( nodeName );

			iframeDoc.body.appendChild( elem );

			display = jQuery.css( elem, "display" );
			body.removeChild( iframe );
		}

		// Store the correct default display
		elemdisplay[ nodeName ] = display;
	}

	return elemdisplay[ nodeName ];
}




var getOffset,
	rtable = /^t(?:able|d|h)$/i,
	rroot = /^(?:body|html)$/i;

if ( "getBoundingClientRect" in document.documentElement ) {
	getOffset = function( elem, doc, docElem, box ) {
		try {
			box = elem.getBoundingClientRect();
		} catch(e) {}

		// Make sure we're not dealing with a disconnected DOM node
		if ( !box || !jQuery.contains( docElem, elem ) ) {
			return box ? { top: box.top, left: box.left } : { top: 0, left: 0 };
		}

		var body = doc.body,
			win = getWindow( doc ),
			clientTop  = docElem.clientTop  || body.clientTop  || 0,
			clientLeft = docElem.clientLeft || body.clientLeft || 0,
			scrollTop  = win.pageYOffset || jQuery.support.boxModel && docElem.scrollTop  || body.scrollTop,
			scrollLeft = win.pageXOffset || jQuery.support.boxModel && docElem.scrollLeft || body.scrollLeft,
			top  = box.top  + scrollTop  - clientTop,
			left = box.left + scrollLeft - clientLeft;

		return { top: top, left: left };
	};

} else {
	getOffset = function( elem, doc, docElem ) {
		var computedStyle,
			offsetParent = elem.offsetParent,
			prevOffsetParent = elem,
			body = doc.body,
			defaultView = doc.defaultView,
			prevComputedStyle = defaultView ? defaultView.getComputedStyle( elem, null ) : elem.currentStyle,
			top = elem.offsetTop,
			left = elem.offsetLeft;

		while ( (elem = elem.parentNode) && elem !== body && elem !== docElem ) {
			if ( jQuery.support.fixedPosition && prevComputedStyle.position === "fixed" ) {
				break;
			}

			computedStyle = defaultView ? defaultView.getComputedStyle(elem, null) : elem.currentStyle;
			top  -= elem.scrollTop;
			left -= elem.scrollLeft;

			if ( elem === offsetParent ) {
				top  += elem.offsetTop;
				left += elem.offsetLeft;

				if ( jQuery.support.doesNotAddBorder && !(jQuery.support.doesAddBorderForTableAndCells && rtable.test(elem.nodeName)) ) {
					top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
					left += parseFloat( computedStyle.borderLeftWidth ) || 0;
				}

				prevOffsetParent = offsetParent;
				offsetParent = elem.offsetParent;
			}

			if ( jQuery.support.subtractsBorderForOverflowNotVisible && computedStyle.overflow !== "visible" ) {
				top  += parseFloat( computedStyle.borderTopWidth  ) || 0;
				left += parseFloat( computedStyle.borderLeftWidth ) || 0;
			}

			prevComputedStyle = computedStyle;
		}

		if ( prevComputedStyle.position === "relative" || prevComputedStyle.position === "static" ) {
			top  += body.offsetTop;
			left += body.offsetLeft;
		}

		if ( jQuery.support.fixedPosition && prevComputedStyle.position === "fixed" ) {
			top  += Math.max( docElem.scrollTop, body.scrollTop );
			left += Math.max( docElem.scrollLeft, body.scrollLeft );
		}

		return { top: top, left: left };
	};
}

jQuery.fn.offset = function( options ) {
	if ( arguments.length ) {
		return options === undefined ?
			this :
			this.each(function( i ) {
				jQuery.offset.setOffset( this, options, i );
			});
	}

	var elem = this[0],
		doc = elem && elem.ownerDocument;

	if ( !doc ) {
		return null;
	}

	if ( elem === doc.body ) {
		return jQuery.offset.bodyOffset( elem );
	}

	return getOffset( elem, doc, doc.documentElement );
};

jQuery.offset = {

	bodyOffset: function( body ) {
		var top = body.offsetTop,
			left = body.offsetLeft;

		if ( jQuery.support.doesNotIncludeMarginInBodyOffset ) {
			top  += parseFloat( jQuery.css(body, "marginTop") ) || 0;
			left += parseFloat( jQuery.css(body, "marginLeft") ) || 0;
		}

		return { top: top, left: left };
	},

	setOffset: function( elem, options, i ) {
		var position = jQuery.css( elem, "position" );

		// set position first, in-case top/left are set even on static elem
		if ( position === "static" ) {
			elem.style.position = "relative";
		}

		var curElem = jQuery( elem ),
			curOffset = curElem.offset(),
			curCSSTop = jQuery.css( elem, "top" ),
			curCSSLeft = jQuery.css( elem, "left" ),
			calculatePosition = ( position === "absolute" || position === "fixed" ) && jQuery.inArray("auto", [curCSSTop, curCSSLeft]) > -1,
			props = {}, curPosition = {}, curTop, curLeft;

		// need to be able to calculate position if either top or left is auto and position is either absolute or fixed
		if ( calculatePosition ) {
			curPosition = curElem.position();
			curTop = curPosition.top;
			curLeft = curPosition.left;
		} else {
			curTop = parseFloat( curCSSTop ) || 0;
			curLeft = parseFloat( curCSSLeft ) || 0;
		}

		if ( jQuery.isFunction( options ) ) {
			options = options.call( elem, i, curOffset );
		}

		if ( options.top != null ) {
			props.top = ( options.top - curOffset.top ) + curTop;
		}
		if ( options.left != null ) {
			props.left = ( options.left - curOffset.left ) + curLeft;
		}

		if ( "using" in options ) {
			options.using.call( elem, props );
		} else {
			curElem.css( props );
		}
	}
};


jQuery.fn.extend({

	position: function() {
		if ( !this[0] ) {
			return null;
		}

		var elem = this[0],

		// Get *real* offsetParent
		offsetParent = this.offsetParent(),

		// Get correct offsets
		offset       = this.offset(),
		parentOffset = rroot.test(offsetParent[0].nodeName) ? { top: 0, left: 0 } : offsetParent.offset();

		// Subtract element margins
		// note: when an element has margin: auto the offsetLeft and marginLeft
		// are the same in Safari causing offset.left to incorrectly be 0
		offset.top  -= parseFloat( jQuery.css(elem, "marginTop") ) || 0;
		offset.left -= parseFloat( jQuery.css(elem, "marginLeft") ) || 0;

		// Add offsetParent borders
		parentOffset.top  += parseFloat( jQuery.css(offsetParent[0], "borderTopWidth") ) || 0;
		parentOffset.left += parseFloat( jQuery.css(offsetParent[0], "borderLeftWidth") ) || 0;

		// Subtract the two offsets
		return {
			top:  offset.top  - parentOffset.top,
			left: offset.left - parentOffset.left
		};
	},

	offsetParent: function() {
		return this.map(function() {
			var offsetParent = this.offsetParent || document.body;
			while ( offsetParent && (!rroot.test(offsetParent.nodeName) && jQuery.css(offsetParent, "position") === "static") ) {
				offsetParent = offsetParent.offsetParent;
			}
			return offsetParent;
		});
	}
});


// Create scrollLeft and scrollTop methods
jQuery.each( {scrollLeft: "pageXOffset", scrollTop: "pageYOffset"}, function( method, prop ) {
	var top = /Y/.test( prop );

	jQuery.fn[ method ] = function( val ) {
		return jQuery.access( this, function( elem, method, val ) {
			var win = getWindow( elem );

			if ( val === undefined ) {
				return win ? (prop in win) ? win[ prop ] :
					jQuery.support.boxModel && win.document.documentElement[ method ] ||
						win.document.body[ method ] :
					elem[ method ];
			}

			if ( win ) {
				win.scrollTo(
					!top ? val : jQuery( win ).scrollLeft(),
					 top ? val : jQuery( win ).scrollTop()
				);

			} else {
				elem[ method ] = val;
			}
		}, method, val, arguments.length, null );
	};
});

function getWindow( elem ) {
	return jQuery.isWindow( elem ) ?
		elem :
		elem.nodeType === 9 ?
			elem.defaultView || elem.parentWindow :
			false;
}




// Create width, height, innerHeight, innerWidth, outerHeight and outerWidth methods
jQuery.each( { Height: "height", Width: "width" }, function( name, type ) {
	var clientProp = "client" + name,
		scrollProp = "scroll" + name,
		offsetProp = "offset" + name;

	// innerHeight and innerWidth
	jQuery.fn[ "inner" + name ] = function() {
		var elem = this[0];
		return elem ?
			elem.style ?
			parseFloat( jQuery.css( elem, type, "padding" ) ) :
			this[ type ]() :
			null;
	};

	// outerHeight and outerWidth
	jQuery.fn[ "outer" + name ] = function( margin ) {
		var elem = this[0];
		return elem ?
			elem.style ?
			parseFloat( jQuery.css( elem, type, margin ? "margin" : "border" ) ) :
			this[ type ]() :
			null;
	};

	jQuery.fn[ type ] = function( value ) {
		return jQuery.access( this, function( elem, type, value ) {
			var doc, docElemProp, orig, ret;

			if ( jQuery.isWindow( elem ) ) {
				// 3rd condition allows Nokia support, as it supports the docElem prop but not CSS1Compat
				doc = elem.document;
				docElemProp = doc.documentElement[ clientProp ];
				return jQuery.support.boxModel && docElemProp ||
					doc.body && doc.body[ clientProp ] || docElemProp;
			}

			// Get document width or height
			if ( elem.nodeType === 9 ) {
				// Either scroll[Width/Height] or offset[Width/Height], whichever is greater
				doc = elem.documentElement;

				// when a window > document, IE6 reports a offset[Width/Height] > client[Width/Height]
				// so we can't use max, as it'll choose the incorrect offset[Width/Height]
				// instead we use the correct client[Width/Height]
				// support:IE6
				if ( doc[ clientProp ] >= doc[ scrollProp ] ) {
					return doc[ clientProp ];
				}

				return Math.max(
					elem.body[ scrollProp ], doc[ scrollProp ],
					elem.body[ offsetProp ], doc[ offsetProp ]
				);
			}

			// Get width or height on the element
			if ( value === undefined ) {
				orig = jQuery.css( elem, type );
				ret = parseFloat( orig );
				return jQuery.isNumeric( ret ) ? ret : orig;
			}

			// Set the width or height on the element
			jQuery( elem ).css( type, value );
		}, type, value, arguments.length, null );
	};
});




// Expose jQuery to the global object
window.jQuery = window.$ = jQuery;

// Expose jQuery as an AMD module, but only for AMD loaders that
// understand the issues with loading multiple versions of jQuery
// in a page that all might call define(). The loader will indicate
// they have special allowances for multiple jQuery versions by
// specifying define.amd.jQuery = true. Register as a named module,
// since jQuery can be concatenated with other files that may use define,
// but not use a proper concatenation script that understands anonymous
// AMD modules. A named AMD is safest and most robust way to register.
// Lowercase jquery is used because AMD module names are derived from
// file names, and jQuery is normally delivered in a lowercase file name.
// Do this after creating the global so that if an AMD module wants to call
// noConflict to hide this version of jQuery, it will work.
if ( typeof define === "function" && define.amd && define.amd.jQuery ) {
	define( "jquery", [], function () { return jQuery; } );
}



})( window );
;
/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.core.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){function c(b,c){var e=b.nodeName.toLowerCase();if("area"===e){var f=b.parentNode,g=f.name,h;return!b.href||!g||f.nodeName.toLowerCase()!=="map"?!1:(h=a("img[usemap=#"+g+"]")[0],!!h&&d(h))}return(/input|select|textarea|button|object/.test(e)?!b.disabled:"a"==e?b.href||c:c)&&d(b)}function d(b){return!a(b).parents().andSelf().filter(function(){return a.curCSS(this,"visibility")==="hidden"||a.expr.filters.hidden(this)}).length}a.ui=a.ui||{};if(a.ui.version)return;a.extend(a.ui,{version:"1.8.20",keyCode:{ALT:18,BACKSPACE:8,CAPS_LOCK:20,COMMA:188,COMMAND:91,COMMAND_LEFT:91,COMMAND_RIGHT:93,CONTROL:17,DELETE:46,DOWN:40,END:35,ENTER:13,ESCAPE:27,HOME:36,INSERT:45,LEFT:37,MENU:93,NUMPAD_ADD:107,NUMPAD_DECIMAL:110,NUMPAD_DIVIDE:111,NUMPAD_ENTER:108,NUMPAD_MULTIPLY:106,NUMPAD_SUBTRACT:109,PAGE_DOWN:34,PAGE_UP:33,PERIOD:190,RIGHT:39,SHIFT:16,SPACE:32,TAB:9,UP:38,WINDOWS:91}}),a.fn.extend({propAttr:a.fn.prop||a.fn.attr,_focus:a.fn.focus,focus:function(b,c){return typeof b=="number"?this.each(function(){var d=this;setTimeout(function(){a(d).focus(),c&&c.call(d)},b)}):this._focus.apply(this,arguments)},scrollParent:function(){var b;return a.browser.msie&&/(static|relative)/.test(this.css("position"))||/absolute/.test(this.css("position"))?b=this.parents().filter(function(){return/(relative|absolute|fixed)/.test(a.curCSS(this,"position",1))&&/(auto|scroll)/.test(a.curCSS(this,"overflow",1)+a.curCSS(this,"overflow-y",1)+a.curCSS(this,"overflow-x",1))}).eq(0):b=this.parents().filter(function(){return/(auto|scroll)/.test(a.curCSS(this,"overflow",1)+a.curCSS(this,"overflow-y",1)+a.curCSS(this,"overflow-x",1))}).eq(0),/fixed/.test(this.css("position"))||!b.length?a(document):b},zIndex:function(c){if(c!==b)return this.css("zIndex",c);if(this.length){var d=a(this[0]),e,f;while(d.length&&d[0]!==document){e=d.css("position");if(e==="absolute"||e==="relative"||e==="fixed"){f=parseInt(d.css("zIndex"),10);if(!isNaN(f)&&f!==0)return f}d=d.parent()}}return 0},disableSelection:function(){return this.bind((a.support.selectstart?"selectstart":"mousedown")+".ui-disableSelection",function(a){a.preventDefault()})},enableSelection:function(){return this.unbind(".ui-disableSelection")}}),a.each(["Width","Height"],function(c,d){function h(b,c,d,f){return a.each(e,function(){c-=parseFloat(a.curCSS(b,"padding"+this,!0))||0,d&&(c-=parseFloat(a.curCSS(b,"border"+this+"Width",!0))||0),f&&(c-=parseFloat(a.curCSS(b,"margin"+this,!0))||0)}),c}var e=d==="Width"?["Left","Right"]:["Top","Bottom"],f=d.toLowerCase(),g={innerWidth:a.fn.innerWidth,innerHeight:a.fn.innerHeight,outerWidth:a.fn.outerWidth,outerHeight:a.fn.outerHeight};a.fn["inner"+d]=function(c){return c===b?g["inner"+d].call(this):this.each(function(){a(this).css(f,h(this,c)+"px")})},a.fn["outer"+d]=function(b,c){return typeof b!="number"?g["outer"+d].call(this,b):this.each(function(){a(this).css(f,h(this,b,!0,c)+"px")})}}),a.extend(a.expr[":"],{data:function(b,c,d){return!!a.data(b,d[3])},focusable:function(b){return c(b,!isNaN(a.attr(b,"tabindex")))},tabbable:function(b){var d=a.attr(b,"tabindex"),e=isNaN(d);return(e||d>=0)&&c(b,!e)}}),a(function(){var b=document.body,c=b.appendChild(c=document.createElement("div"));c.offsetHeight,a.extend(c.style,{minHeight:"100px",height:"auto",padding:0,borderWidth:0}),a.support.minHeight=c.offsetHeight===100,a.support.selectstart="onselectstart"in c,b.removeChild(c).style.display="none"}),a.extend(a.ui,{plugin:{add:function(b,c,d){var e=a.ui[b].prototype;for(var f in d)e.plugins[f]=e.plugins[f]||[],e.plugins[f].push([c,d[f]])},call:function(a,b,c){var d=a.plugins[b];if(!d||!a.element[0].parentNode)return;for(var e=0;e<d.length;e++)a.options[d[e][0]]&&d[e][1].apply(a.element,c)}},contains:function(a,b){return document.compareDocumentPosition?a.compareDocumentPosition(b)&16:a!==b&&a.contains(b)},hasScroll:function(b,c){if(a(b).css("overflow")==="hidden")return!1;var d=c&&c==="left"?"scrollLeft":"scrollTop",e=!1;return b[d]>0?!0:(b[d]=1,e=b[d]>0,b[d]=0,e)},isOverAxis:function(a,b,c){return a>b&&a<b+c},isOver:function(b,c,d,e,f,g){return a.ui.isOverAxis(b,d,f)&&a.ui.isOverAxis(c,e,g)}})})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.widget.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){if(a.cleanData){var c=a.cleanData;a.cleanData=function(b){for(var d=0,e;(e=b[d])!=null;d++)try{a(e).triggerHandler("remove")}catch(f){}c(b)}}else{var d=a.fn.remove;a.fn.remove=function(b,c){return this.each(function(){return c||(!b||a.filter(b,[this]).length)&&a("*",this).add([this]).each(function(){try{a(this).triggerHandler("remove")}catch(b){}}),d.call(a(this),b,c)})}}a.widget=function(b,c,d){var e=b.split(".")[0],f;b=b.split(".")[1],f=e+"-"+b,d||(d=c,c=a.Widget),a.expr[":"][f]=function(c){return!!a.data(c,b)},a[e]=a[e]||{},a[e][b]=function(a,b){arguments.length&&this._createWidget(a,b)};var g=new c;g.options=a.extend(!0,{},g.options),a[e][b].prototype=a.extend(!0,g,{namespace:e,widgetName:b,widgetEventPrefix:a[e][b].prototype.widgetEventPrefix||b,widgetBaseClass:f},d),a.widget.bridge(b,a[e][b])},a.widget.bridge=function(c,d){a.fn[c]=function(e){var f=typeof e=="string",g=Array.prototype.slice.call(arguments,1),h=this;return e=!f&&g.length?a.extend.apply(null,[!0,e].concat(g)):e,f&&e.charAt(0)==="_"?h:(f?this.each(function(){var d=a.data(this,c),f=d&&a.isFunction(d[e])?d[e].apply(d,g):d;if(f!==d&&f!==b)return h=f,!1}):this.each(function(){var b=a.data(this,c);b?b.option(e||{})._init():a.data(this,c,new d(e,this))}),h)}},a.Widget=function(a,b){arguments.length&&this._createWidget(a,b)},a.Widget.prototype={widgetName:"widget",widgetEventPrefix:"",options:{disabled:!1},_createWidget:function(b,c){a.data(c,this.widgetName,this),this.element=a(c),this.options=a.extend(!0,{},this.options,this._getCreateOptions(),b);var d=this;this.element.bind("remove."+this.widgetName,function(){d.destroy()}),this._create(),this._trigger("create"),this._init()},_getCreateOptions:function(){return a.metadata&&a.metadata.get(this.element[0])[this.widgetName]},_create:function(){},_init:function(){},destroy:function(){this.element.unbind("."+this.widgetName).removeData(this.widgetName),this.widget().unbind("."+this.widgetName).removeAttr("aria-disabled").removeClass(this.widgetBaseClass+"-disabled "+"ui-state-disabled")},widget:function(){return this.element},option:function(c,d){var e=c;if(arguments.length===0)return a.extend({},this.options);if(typeof c=="string"){if(d===b)return this.options[c];e={},e[c]=d}return this._setOptions(e),this},_setOptions:function(b){var c=this;return a.each(b,function(a,b){c._setOption(a,b)}),this},_setOption:function(a,b){return this.options[a]=b,a==="disabled"&&this.widget()[b?"addClass":"removeClass"](this.widgetBaseClass+"-disabled"+" "+"ui-state-disabled").attr("aria-disabled",b),this},enable:function(){return this._setOption("disabled",!1)},disable:function(){return this._setOption("disabled",!0)},_trigger:function(b,c,d){var e,f,g=this.options[b];d=d||{},c=a.Event(c),c.type=(b===this.widgetEventPrefix?b:this.widgetEventPrefix+b).toLowerCase(),c.target=this.element[0],f=c.originalEvent;if(f)for(e in f)e in c||(c[e]=f[e]);return this.element.trigger(c,d),!(a.isFunction(g)&&g.call(this.element[0],c,d)===!1||c.isDefaultPrevented())}}})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.mouse.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){var c=!1;a(document).mouseup(function(a){c=!1}),a.widget("ui.mouse",{options:{cancel:":input,option",distance:1,delay:0},_mouseInit:function(){var b=this;this.element.bind("mousedown."+this.widgetName,function(a){return b._mouseDown(a)}).bind("click."+this.widgetName,function(c){if(!0===a.data(c.target,b.widgetName+".preventClickEvent"))return a.removeData(c.target,b.widgetName+".preventClickEvent"),c.stopImmediatePropagation(),!1}),this.started=!1},_mouseDestroy:function(){this.element.unbind("."+this.widgetName),a(document).unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate)},_mouseDown:function(b){if(c)return;this._mouseStarted&&this._mouseUp(b),this._mouseDownEvent=b;var d=this,e=b.which==1,f=typeof this.options.cancel=="string"&&b.target.nodeName?a(b.target).closest(this.options.cancel).length:!1;if(!e||f||!this._mouseCapture(b))return!0;this.mouseDelayMet=!this.options.delay,this.mouseDelayMet||(this._mouseDelayTimer=setTimeout(function(){d.mouseDelayMet=!0},this.options.delay));if(this._mouseDistanceMet(b)&&this._mouseDelayMet(b)){this._mouseStarted=this._mouseStart(b)!==!1;if(!this._mouseStarted)return b.preventDefault(),!0}return!0===a.data(b.target,this.widgetName+".preventClickEvent")&&a.removeData(b.target,this.widgetName+".preventClickEvent"),this._mouseMoveDelegate=function(a){return d._mouseMove(a)},this._mouseUpDelegate=function(a){return d._mouseUp(a)},a(document).bind("mousemove."+this.widgetName,this._mouseMoveDelegate).bind("mouseup."+this.widgetName,this._mouseUpDelegate),b.preventDefault(),c=!0,!0},_mouseMove:function(b){return!a.browser.msie||document.documentMode>=9||!!b.button?this._mouseStarted?(this._mouseDrag(b),b.preventDefault()):(this._mouseDistanceMet(b)&&this._mouseDelayMet(b)&&(this._mouseStarted=this._mouseStart(this._mouseDownEvent,b)!==!1,this._mouseStarted?this._mouseDrag(b):this._mouseUp(b)),!this._mouseStarted):this._mouseUp(b)},_mouseUp:function(b){return a(document).unbind("mousemove."+this.widgetName,this._mouseMoveDelegate).unbind("mouseup."+this.widgetName,this._mouseUpDelegate),this._mouseStarted&&(this._mouseStarted=!1,b.target==this._mouseDownEvent.target&&a.data(b.target,this.widgetName+".preventClickEvent",!0),this._mouseStop(b)),!1},_mouseDistanceMet:function(a){return Math.max(Math.abs(this._mouseDownEvent.pageX-a.pageX),Math.abs(this._mouseDownEvent.pageY-a.pageY))>=this.options.distance},_mouseDelayMet:function(a){return this.mouseDelayMet},_mouseStart:function(a){},_mouseDrag:function(a){},_mouseStop:function(a){},_mouseCapture:function(a){return!0}})})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.position.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.ui=a.ui||{};var c=/left|center|right/,d=/top|center|bottom/,e="center",f={},g=a.fn.position,h=a.fn.offset;a.fn.position=function(b){if(!b||!b.of)return g.apply(this,arguments);b=a.extend({},b);var h=a(b.of),i=h[0],j=(b.collision||"flip").split(" "),k=b.offset?b.offset.split(" "):[0,0],l,m,n;return i.nodeType===9?(l=h.width(),m=h.height(),n={top:0,left:0}):i.setTimeout?(l=h.width(),m=h.height(),n={top:h.scrollTop(),left:h.scrollLeft()}):i.preventDefault?(b.at="left top",l=m=0,n={top:b.of.pageY,left:b.of.pageX}):(l=h.outerWidth(),m=h.outerHeight(),n=h.offset()),a.each(["my","at"],function(){var a=(b[this]||"").split(" ");a.length===1&&(a=c.test(a[0])?a.concat([e]):d.test(a[0])?[e].concat(a):[e,e]),a[0]=c.test(a[0])?a[0]:e,a[1]=d.test(a[1])?a[1]:e,b[this]=a}),j.length===1&&(j[1]=j[0]),k[0]=parseInt(k[0],10)||0,k.length===1&&(k[1]=k[0]),k[1]=parseInt(k[1],10)||0,b.at[0]==="right"?n.left+=l:b.at[0]===e&&(n.left+=l/2),b.at[1]==="bottom"?n.top+=m:b.at[1]===e&&(n.top+=m/2),n.left+=k[0],n.top+=k[1],this.each(function(){var c=a(this),d=c.outerWidth(),g=c.outerHeight(),h=parseInt(a.curCSS(this,"marginLeft",!0))||0,i=parseInt(a.curCSS(this,"marginTop",!0))||0,o=d+h+(parseInt(a.curCSS(this,"marginRight",!0))||0),p=g+i+(parseInt(a.curCSS(this,"marginBottom",!0))||0),q=a.extend({},n),r;b.my[0]==="right"?q.left-=d:b.my[0]===e&&(q.left-=d/2),b.my[1]==="bottom"?q.top-=g:b.my[1]===e&&(q.top-=g/2),f.fractions||(q.left=Math.round(q.left),q.top=Math.round(q.top)),r={left:q.left-h,top:q.top-i},a.each(["left","top"],function(c,e){a.ui.position[j[c]]&&a.ui.position[j[c]][e](q,{targetWidth:l,targetHeight:m,elemWidth:d,elemHeight:g,collisionPosition:r,collisionWidth:o,collisionHeight:p,offset:k,my:b.my,at:b.at})}),a.fn.bgiframe&&c.bgiframe(),c.offset(a.extend(q,{using:b.using}))})},a.ui.position={fit:{left:function(b,c){var d=a(window),e=c.collisionPosition.left+c.collisionWidth-d.width()-d.scrollLeft();b.left=e>0?b.left-e:Math.max(b.left-c.collisionPosition.left,b.left)},top:function(b,c){var d=a(window),e=c.collisionPosition.top+c.collisionHeight-d.height()-d.scrollTop();b.top=e>0?b.top-e:Math.max(b.top-c.collisionPosition.top,b.top)}},flip:{left:function(b,c){if(c.at[0]===e)return;var d=a(window),f=c.collisionPosition.left+c.collisionWidth-d.width()-d.scrollLeft(),g=c.my[0]==="left"?-c.elemWidth:c.my[0]==="right"?c.elemWidth:0,h=c.at[0]==="left"?c.targetWidth:-c.targetWidth,i=-2*c.offset[0];b.left+=c.collisionPosition.left<0?g+h+i:f>0?g+h+i:0},top:function(b,c){if(c.at[1]===e)return;var d=a(window),f=c.collisionPosition.top+c.collisionHeight-d.height()-d.scrollTop(),g=c.my[1]==="top"?-c.elemHeight:c.my[1]==="bottom"?c.elemHeight:0,h=c.at[1]==="top"?c.targetHeight:-c.targetHeight,i=-2*c.offset[1];b.top+=c.collisionPosition.top<0?g+h+i:f>0?g+h+i:0}}},a.offset.setOffset||(a.offset.setOffset=function(b,c){/static/.test(a.curCSS(b,"position"))&&(b.style.position="relative");var d=a(b),e=d.offset(),f=parseInt(a.curCSS(b,"top",!0),10)||0,g=parseInt(a.curCSS(b,"left",!0),10)||0,h={top:c.top-e.top+f,left:c.left-e.left+g};"using"in c?c.using.call(b,h):d.css(h)},a.fn.offset=function(b){var c=this[0];return!c||!c.ownerDocument?null:b?this.each(function(){a.offset.setOffset(this,b)}):h.call(this)}),function(){var b=document.getElementsByTagName("body")[0],c=document.createElement("div"),d,e,g,h,i;d=document.createElement(b?"div":"body"),g={visibility:"hidden",width:0,height:0,border:0,margin:0,background:"none"},b&&a.extend(g,{position:"absolute",left:"-1000px",top:"-1000px"});for(var j in g)d.style[j]=g[j];d.appendChild(c),e=b||document.documentElement,e.insertBefore(d,e.firstChild),c.style.cssText="position: absolute; left: 10.7432222px; top: 10.432325px; height: 30px; width: 201px;",h=a(c).offset(function(a,b){return b}).offset(),d.innerHTML="",e.removeChild(d),i=h.top+h.left+(b?2e3:0),f.fractions=i>21&&i<22}()})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.draggable.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.widget("ui.draggable",a.ui.mouse,{widgetEventPrefix:"drag",options:{addClasses:!0,appendTo:"parent",axis:!1,connectToSortable:!1,containment:!1,cursor:"auto",cursorAt:!1,grid:!1,handle:!1,helper:"original",iframeFix:!1,opacity:!1,refreshPositions:!1,revert:!1,revertDuration:500,scope:"default",scroll:!0,scrollSensitivity:20,scrollSpeed:20,snap:!1,snapMode:"both",snapTolerance:20,stack:!1,zIndex:!1},_create:function(){this.options.helper=="original"&&!/^(?:r|a|f)/.test(this.element.css("position"))&&(this.element[0].style.position="relative"),this.options.addClasses&&this.element.addClass("ui-draggable"),this.options.disabled&&this.element.addClass("ui-draggable-disabled"),this._mouseInit()},destroy:function(){if(!this.element.data("draggable"))return;return this.element.removeData("draggable").unbind(".draggable").removeClass("ui-draggable ui-draggable-dragging ui-draggable-disabled"),this._mouseDestroy(),this},_mouseCapture:function(b){var c=this.options;return this.helper||c.disabled||a(b.target).is(".ui-resizable-handle")?!1:(this.handle=this._getHandle(b),this.handle?(c.iframeFix&&a(c.iframeFix===!0?"iframe":c.iframeFix).each(function(){a('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>').css({width:this.offsetWidth+"px",height:this.offsetHeight+"px",position:"absolute",opacity:"0.001",zIndex:1e3}).css(a(this).offset()).appendTo("body")}),!0):!1)},_mouseStart:function(b){var c=this.options;return this.helper=this._createHelper(b),this._cacheHelperProportions(),a.ui.ddmanager&&(a.ui.ddmanager.current=this),this._cacheMargins(),this.cssPosition=this.helper.css("position"),this.scrollParent=this.helper.scrollParent(),this.offset=this.positionAbs=this.element.offset(),this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left},a.extend(this.offset,{click:{left:b.pageX-this.offset.left,top:b.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()}),this.originalPosition=this.position=this._generatePosition(b),this.originalPageX=b.pageX,this.originalPageY=b.pageY,c.cursorAt&&this._adjustOffsetFromHelper(c.cursorAt),c.containment&&this._setContainment(),this._trigger("start",b)===!1?(this._clear(),!1):(this._cacheHelperProportions(),a.ui.ddmanager&&!c.dropBehaviour&&a.ui.ddmanager.prepareOffsets(this,b),this.helper.addClass("ui-draggable-dragging"),this._mouseDrag(b,!0),a.ui.ddmanager&&a.ui.ddmanager.dragStart(this,b),!0)},_mouseDrag:function(b,c){this.position=this._generatePosition(b),this.positionAbs=this._convertPositionTo("absolute");if(!c){var d=this._uiHash();if(this._trigger("drag",b,d)===!1)return this._mouseUp({}),!1;this.position=d.position}if(!this.options.axis||this.options.axis!="y")this.helper[0].style.left=this.position.left+"px";if(!this.options.axis||this.options.axis!="x")this.helper[0].style.top=this.position.top+"px";return a.ui.ddmanager&&a.ui.ddmanager.drag(this,b),!1},_mouseStop:function(b){var c=!1;a.ui.ddmanager&&!this.options.dropBehaviour&&(c=a.ui.ddmanager.drop(this,b)),this.dropped&&(c=this.dropped,this.dropped=!1);var d=this.element[0],e=!1;while(d&&(d=d.parentNode))d==document&&(e=!0);if(!e&&this.options.helper==="original")return!1;if(this.options.revert=="invalid"&&!c||this.options.revert=="valid"&&c||this.options.revert===!0||a.isFunction(this.options.revert)&&this.options.revert.call(this.element,c)){var f=this;a(this.helper).animate(this.originalPosition,parseInt(this.options.revertDuration,10),function(){f._trigger("stop",b)!==!1&&f._clear()})}else this._trigger("stop",b)!==!1&&this._clear();return!1},_mouseUp:function(b){return this.options.iframeFix===!0&&a("div.ui-draggable-iframeFix").each(function(){this.parentNode.removeChild(this)}),a.ui.ddmanager&&a.ui.ddmanager.dragStop(this,b),a.ui.mouse.prototype._mouseUp.call(this,b)},cancel:function(){return this.helper.is(".ui-draggable-dragging")?this._mouseUp({}):this._clear(),this},_getHandle:function(b){var c=!this.options.handle||!a(this.options.handle,this.element).length?!0:!1;return a(this.options.handle,this.element).find("*").andSelf().each(function(){this==b.target&&(c=!0)}),c},_createHelper:function(b){var c=this.options,d=a.isFunction(c.helper)?a(c.helper.apply(this.element[0],[b])):c.helper=="clone"?this.element.clone().removeAttr("id"):this.element;return d.parents("body").length||d.appendTo(c.appendTo=="parent"?this.element[0].parentNode:c.appendTo),d[0]!=this.element[0]&&!/(fixed|absolute)/.test(d.css("position"))&&d.css("position","absolute"),d},_adjustOffsetFromHelper:function(b){typeof b=="string"&&(b=b.split(" ")),a.isArray(b)&&(b={left:+b[0],top:+b[1]||0}),"left"in b&&(this.offset.click.left=b.left+this.margins.left),"right"in b&&(this.offset.click.left=this.helperProportions.width-b.right+this.margins.left),"top"in b&&(this.offset.click.top=b.top+this.margins.top),"bottom"in b&&(this.offset.click.top=this.helperProportions.height-b.bottom+this.margins.top)},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var b=this.offsetParent.offset();this.cssPosition=="absolute"&&this.scrollParent[0]!=document&&a.ui.contains(this.scrollParent[0],this.offsetParent[0])&&(b.left+=this.scrollParent.scrollLeft(),b.top+=this.scrollParent.scrollTop());if(this.offsetParent[0]==document.body||this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()=="html"&&a.browser.msie)b={top:0,left:0};return{top:b.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:b.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if(this.cssPosition=="relative"){var a=this.element.position();return{top:a.top-(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:a.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.element.css("marginLeft"),10)||0,top:parseInt(this.element.css("marginTop"),10)||0,right:parseInt(this.element.css("marginRight"),10)||0,bottom:parseInt(this.element.css("marginBottom"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var b=this.options;b.containment=="parent"&&(b.containment=this.helper[0].parentNode);if(b.containment=="document"||b.containment=="window")this.containment=[b.containment=="document"?0:a(window).scrollLeft()-this.offset.relative.left-this.offset.parent.left,b.containment=="document"?0:a(window).scrollTop()-this.offset.relative.top-this.offset.parent.top,(b.containment=="document"?0:a(window).scrollLeft())+a(b.containment=="document"?document:window).width()-this.helperProportions.width-this.margins.left,(b.containment=="document"?0:a(window).scrollTop())+(a(b.containment=="document"?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];if(!/^(document|window|parent)$/.test(b.containment)&&b.containment.constructor!=Array){var c=a(b.containment),d=c[0];if(!d)return;var e=c.offset(),f=a(d).css("overflow")!="hidden";this.containment=[(parseInt(a(d).css("borderLeftWidth"),10)||0)+(parseInt(a(d).css("paddingLeft"),10)||0),(parseInt(a(d).css("borderTopWidth"),10)||0)+(parseInt(a(d).css("paddingTop"),10)||0),(f?Math.max(d.scrollWidth,d.offsetWidth):d.offsetWidth)-(parseInt(a(d).css("borderLeftWidth"),10)||0)-(parseInt(a(d).css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left-this.margins.right,(f?Math.max(d.scrollHeight,d.offsetHeight):d.offsetHeight)-(parseInt(a(d).css("borderTopWidth"),10)||0)-(parseInt(a(d).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top-this.margins.bottom],this.relative_container=c}else b.containment.constructor==Array&&(this.containment=b.containment)},_convertPositionTo:function(b,c){c||(c=this.position);var d=b=="absolute"?1:-1,e=this.options,f=this.cssPosition=="absolute"&&(this.scrollParent[0]==document||!a.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,g=/(html|body)/i.test(f[0].tagName);return{top:c.top+this.offset.relative.top*d+this.offset.parent.top*d-(a.browser.safari&&a.browser.version<526&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollTop():g?0:f.scrollTop())*d),left:c.left+this.offset.relative.left*d+this.offset.parent.left*d-(a.browser.safari&&a.browser.version<526&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():g?0:f.scrollLeft())*d)}},_generatePosition:function(b){var c=this.options,d=this.cssPosition=="absolute"&&(this.scrollParent[0]==document||!a.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,e=/(html|body)/i.test(d[0].tagName),f=b.pageX,g=b.pageY;if(this.originalPosition){var h;if(this.containment){if(this.relative_container){var i=this.relative_container.offset();h=[this.containment[0]+i.left,this.containment[1]+i.top,this.containment[2]+i.left,this.containment[3]+i.top]}else h=this.containment;b.pageX-this.offset.click.left<h[0]&&(f=h[0]+this.offset.click.left),b.pageY-this.offset.click.top<h[1]&&(g=h[1]+this.offset.click.top),b.pageX-this.offset.click.left>h[2]&&(f=h[2]+this.offset.click.left),b.pageY-this.offset.click.top>h[3]&&(g=h[3]+this.offset.click.top)}if(c.grid){var j=c.grid[1]?this.originalPageY+Math.round((g-this.originalPageY)/c.grid[1])*c.grid[1]:this.originalPageY;g=h?j-this.offset.click.top<h[1]||j-this.offset.click.top>h[3]?j-this.offset.click.top<h[1]?j+c.grid[1]:j-c.grid[1]:j:j;var k=c.grid[0]?this.originalPageX+Math.round((f-this.originalPageX)/c.grid[0])*c.grid[0]:this.originalPageX;f=h?k-this.offset.click.left<h[0]||k-this.offset.click.left>h[2]?k-this.offset.click.left<h[0]?k+c.grid[0]:k-c.grid[0]:k:k}}return{top:g-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+(a.browser.safari&&a.browser.version<526&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollTop():e?0:d.scrollTop()),left:f-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+(a.browser.safari&&a.browser.version<526&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():e?0:d.scrollLeft())}},_clear:function(){this.helper.removeClass("ui-draggable-dragging"),this.helper[0]!=this.element[0]&&!this.cancelHelperRemoval&&this.helper.remove(),this.helper=null,this.cancelHelperRemoval=!1},_trigger:function(b,c,d){return d=d||this._uiHash(),a.ui.plugin.call(this,b,[c,d]),b=="drag"&&(this.positionAbs=this._convertPositionTo("absolute")),a.Widget.prototype._trigger.call(this,b,c,d)},plugins:{},_uiHash:function(a){return{helper:this.helper,position:this.position,originalPosition:this.originalPosition,offset:this.positionAbs}}}),a.extend(a.ui.draggable,{version:"1.8.20"}),a.ui.plugin.add("draggable","connectToSortable",{start:function(b,c){var d=a(this).data("draggable"),e=d.options,f=a.extend({},c,{item:d.element});d.sortables=[],a(e.connectToSortable).each(function(){var c=a.data(this,"sortable");c&&!c.options.disabled&&(d.sortables.push({instance:c,shouldRevert:c.options.revert}),c.refreshPositions(),c._trigger("activate",b,f))})},stop:function(b,c){var d=a(this).data("draggable"),e=a.extend({},c,{item:d.element});a.each(d.sortables,function(){this.instance.isOver?(this.instance.isOver=0,d.cancelHelperRemoval=!0,this.instance.cancelHelperRemoval=!1,this.shouldRevert&&(this.instance.options.revert=!0),this.instance._mouseStop(b),this.instance.options.helper=this.instance.options._helper,d.options.helper=="original"&&this.instance.currentItem.css({top:"auto",left:"auto"})):(this.instance.cancelHelperRemoval=!1,this.instance._trigger("deactivate",b,e))})},drag:function(b,c){var d=a(this).data("draggable"),e=this,f=function(b){var c=this.offset.click.top,d=this.offset.click.left,e=this.positionAbs.top,f=this.positionAbs.left,g=b.height,h=b.width,i=b.top,j=b.left;return a.ui.isOver(e+c,f+d,i,j,g,h)};a.each(d.sortables,function(f){this.instance.positionAbs=d.positionAbs,this.instance.helperProportions=d.helperProportions,this.instance.offset.click=d.offset.click,this.instance._intersectsWith(this.instance.containerCache)?(this.instance.isOver||(this.instance.isOver=1,this.instance.currentItem=a(e).clone().removeAttr("id").appendTo(this.instance.element).data("sortable-item",!0),this.instance.options._helper=this.instance.options.helper,this.instance.options.helper=function(){return c.helper[0]},b.target=this.instance.currentItem[0],this.instance._mouseCapture(b,!0),this.instance._mouseStart(b,!0,!0),this.instance.offset.click.top=d.offset.click.top,this.instance.offset.click.left=d.offset.click.left,this.instance.offset.parent.left-=d.offset.parent.left-this.instance.offset.parent.left,this.instance.offset.parent.top-=d.offset.parent.top-this.instance.offset.parent.top,d._trigger("toSortable",b),d.dropped=this.instance.element,d.currentItem=d.element,this.instance.fromOutside=d),this.instance.currentItem&&this.instance._mouseDrag(b)):this.instance.isOver&&(this.instance.isOver=0,this.instance.cancelHelperRemoval=!0,this.instance.options.revert=!1,this.instance._trigger("out",b,this.instance._uiHash(this.instance)),this.instance._mouseStop(b,!0),this.instance.options.helper=this.instance.options._helper,this.instance.currentItem.remove(),this.instance.placeholder&&this.instance.placeholder.remove(),d._trigger("fromSortable",b),d.dropped=!1)})}}),a.ui.plugin.add("draggable","cursor",{start:function(b,c){var d=a("body"),e=a(this).data("draggable").options;d.css("cursor")&&(e._cursor=d.css("cursor")),d.css("cursor",e.cursor)},stop:function(b,c){var d=a(this).data("draggable").options;d._cursor&&a("body").css("cursor",d._cursor)}}),a.ui.plugin.add("draggable","opacity",{start:function(b,c){var d=a(c.helper),e=a(this).data("draggable").options;d.css("opacity")&&(e._opacity=d.css("opacity")),d.css("opacity",e.opacity)},stop:function(b,c){var d=a(this).data("draggable").options;d._opacity&&a(c.helper).css("opacity",d._opacity)}}),a.ui.plugin.add("draggable","scroll",{start:function(b,c){var d=a(this).data("draggable");d.scrollParent[0]!=document&&d.scrollParent[0].tagName!="HTML"&&(d.overflowOffset=d.scrollParent.offset())},drag:function(b,c){var d=a(this).data("draggable"),e=d.options,f=!1;if(d.scrollParent[0]!=document&&d.scrollParent[0].tagName!="HTML"){if(!e.axis||e.axis!="x")d.overflowOffset.top+d.scrollParent[0].offsetHeight-b.pageY<e.scrollSensitivity?d.scrollParent[0].scrollTop=f=d.scrollParent[0].scrollTop+e.scrollSpeed:b.pageY-d.overflowOffset.top<e.scrollSensitivity&&(d.scrollParent[0].scrollTop=f=d.scrollParent[0].scrollTop-e.scrollSpeed);if(!e.axis||e.axis!="y")d.overflowOffset.left+d.scrollParent[0].offsetWidth-b.pageX<e.scrollSensitivity?d.scrollParent[0].scrollLeft=f=d.scrollParent[0].scrollLeft+e.scrollSpeed:b.pageX-d.overflowOffset.left<e.scrollSensitivity&&(d.scrollParent[0].scrollLeft=f=d.scrollParent[0].scrollLeft-e.scrollSpeed)}else{if(!e.axis||e.axis!="x")b.pageY-a(document).scrollTop()<e.scrollSensitivity?f=a(document).scrollTop(a(document).scrollTop()-e.scrollSpeed):a(window).height()-(b.pageY-a(document).scrollTop())<e.scrollSensitivity&&(f=a(document).scrollTop(a(document).scrollTop()+e.scrollSpeed));if(!e.axis||e.axis!="y")b.pageX-a(document).scrollLeft()<e.scrollSensitivity?f=a(document).scrollLeft(a(document).scrollLeft()-e.scrollSpeed):a(window).width()-(b.pageX-a(document).scrollLeft())<e.scrollSensitivity&&(f=a(document).scrollLeft(a(document).scrollLeft()+e.scrollSpeed))}f!==!1&&a.ui.ddmanager&&!e.dropBehaviour&&a.ui.ddmanager.prepareOffsets(d,b)}}),a.ui.plugin.add("draggable","snap",{start:function(b,c){var d=a(this).data("draggable"),e=d.options;d.snapElements=[],a(e.snap.constructor!=String?e.snap.items||":data(draggable)":e.snap).each(function(){var b=a(this),c=b.offset();this!=d.element[0]&&d.snapElements.push({item:this,width:b.outerWidth(),height:b.outerHeight(),top:c.top,left:c.left})})},drag:function(b,c){var d=a(this).data("draggable"),e=d.options,f=e.snapTolerance,g=c.offset.left,h=g+d.helperProportions.width,i=c.offset.top,j=i+d.helperProportions.height;for(var k=d.snapElements.length-1;k>=0;k--){var l=d.snapElements[k].left,m=l+d.snapElements[k].width,n=d.snapElements[k].top,o=n+d.snapElements[k].height;if(!(l-f<g&&g<m+f&&n-f<i&&i<o+f||l-f<g&&g<m+f&&n-f<j&&j<o+f||l-f<h&&h<m+f&&n-f<i&&i<o+f||l-f<h&&h<m+f&&n-f<j&&j<o+f)){d.snapElements[k].snapping&&d.options.snap.release&&d.options.snap.release.call(d.element,b,a.extend(d._uiHash(),{snapItem:d.snapElements[k].item})),d.snapElements[k].snapping=!1;continue}if(e.snapMode!="inner"){var p=Math.abs(n-j)<=f,q=Math.abs(o-i)<=f,r=Math.abs(l-h)<=f,s=Math.abs(m-g)<=f;p&&(c.position.top=d._convertPositionTo("relative",{top:n-d.helperProportions.height,left:0}).top-d.margins.top),q&&(c.position.top=d._convertPositionTo("relative",{top:o,left:0}).top-d.margins.top),r&&(c.position.left=d._convertPositionTo("relative",{top:0,left:l-d.helperProportions.width}).left-d.margins.left),s&&(c.position.left=d._convertPositionTo("relative",{top:0,left:m}).left-d.margins.left)}var t=p||q||r||s;if(e.snapMode!="outer"){var p=Math.abs(n-i)<=f,q=Math.abs(o-j)<=f,r=Math.abs(l-g)<=f,s=Math.abs(m-h)<=f;p&&(c.position.top=d._convertPositionTo("relative",{top:n,left:0}).top-d.margins.top),q&&(c.position.top=d._convertPositionTo("relative",{top:o-d.helperProportions.height,left:0}).top-d.margins.top),r&&(c.position.left=d._convertPositionTo("relative",{top:0,left:l}).left-d.margins.left),s&&(c.position.left=d._convertPositionTo("relative",{top:0,left:m-d.helperProportions.width}).left-d.margins.left)}!d.snapElements[k].snapping&&(p||q||r||s||t)&&d.options.snap.snap&&d.options.snap.snap.call(d.element,b,a.extend(d._uiHash(),{snapItem:d.snapElements[k].item})),d.snapElements[k].snapping=p||q||r||s||t}}}),a.ui.plugin.add("draggable","stack",{start:function(b,c){var d=a(this).data("draggable").options,e=a.makeArray(a(d.stack)).sort(function(b,c){return(parseInt(a(b).css("zIndex"),10)||0)-(parseInt(a(c).css("zIndex"),10)||0)});if(!e.length)return;var f=parseInt(e[0].style.zIndex)||0;a(e).each(function(a){this.style.zIndex=f+a}),this[0].style.zIndex=f+e.length}}),a.ui.plugin.add("draggable","zIndex",{start:function(b,c){var d=a(c.helper),e=a(this).data("draggable").options;d.css("zIndex")&&(e._zIndex=d.css("zIndex")),d.css("zIndex",e.zIndex)},stop:function(b,c){var d=a(this).data("draggable").options;d._zIndex&&a(c.helper).css("zIndex",d._zIndex)}})})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.droppable.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.widget("ui.droppable",{widgetEventPrefix:"drop",options:{accept:"*",activeClass:!1,addClasses:!0,greedy:!1,hoverClass:!1,scope:"default",tolerance:"intersect"},_create:function(){var b=this.options,c=b.accept;this.isover=0,this.isout=1,this.accept=a.isFunction(c)?c:function(a){return a.is(c)},this.proportions={width:this.element[0].offsetWidth,height:this.element[0].offsetHeight},a.ui.ddmanager.droppables[b.scope]=a.ui.ddmanager.droppables[b.scope]||[],a.ui.ddmanager.droppables[b.scope].push(this),b.addClasses&&this.element.addClass("ui-droppable")},destroy:function(){var b=a.ui.ddmanager.droppables[this.options.scope];for(var c=0;c<b.length;c++)b[c]==this&&b.splice(c,1);return this.element.removeClass("ui-droppable ui-droppable-disabled").removeData("droppable").unbind(".droppable"),this},_setOption:function(b,c){b=="accept"&&(this.accept=a.isFunction(c)?c:function(a){return a.is(c)}),a.Widget.prototype._setOption.apply(this,arguments)},_activate:function(b){var c=a.ui.ddmanager.current;this.options.activeClass&&this.element.addClass(this.options.activeClass),c&&this._trigger("activate",b,this.ui(c))},_deactivate:function(b){var c=a.ui.ddmanager.current;this.options.activeClass&&this.element.removeClass(this.options.activeClass),c&&this._trigger("deactivate",b,this.ui(c))},_over:function(b){var c=a.ui.ddmanager.current;if(!c||(c.currentItem||c.element)[0]==this.element[0])return;this.accept.call(this.element[0],c.currentItem||c.element)&&(this.options.hoverClass&&this.element.addClass(this.options.hoverClass),this._trigger("over",b,this.ui(c)))},_out:function(b){var c=a.ui.ddmanager.current;if(!c||(c.currentItem||c.element)[0]==this.element[0])return;this.accept.call(this.element[0],c.currentItem||c.element)&&(this.options.hoverClass&&this.element.removeClass(this.options.hoverClass),this._trigger("out",b,this.ui(c)))},_drop:function(b,c){var d=c||a.ui.ddmanager.current;if(!d||(d.currentItem||d.element)[0]==this.element[0])return!1;var e=!1;return this.element.find(":data(droppable)").not(".ui-draggable-dragging").each(function(){var b=a.data(this,"droppable");if(b.options.greedy&&!b.options.disabled&&b.options.scope==d.options.scope&&b.accept.call(b.element[0],d.currentItem||d.element)&&a.ui.intersect(d,a.extend(b,{offset:b.element.offset()}),b.options.tolerance))return e=!0,!1}),e?!1:this.accept.call(this.element[0],d.currentItem||d.element)?(this.options.activeClass&&this.element.removeClass(this.options.activeClass),this.options.hoverClass&&this.element.removeClass(this.options.hoverClass),this._trigger("drop",b,this.ui(d)),this.element):!1},ui:function(a){return{draggable:a.currentItem||a.element,helper:a.helper,position:a.position,offset:a.positionAbs}}}),a.extend(a.ui.droppable,{version:"1.8.20"}),a.ui.intersect=function(b,c,d){if(!c.offset)return!1;var e=(b.positionAbs||b.position.absolute).left,f=e+b.helperProportions.width,g=(b.positionAbs||b.position.absolute).top,h=g+b.helperProportions.height,i=c.offset.left,j=i+c.proportions.width,k=c.offset.top,l=k+c.proportions.height;switch(d){case"fit":return i<=e&&f<=j&&k<=g&&h<=l;case"intersect":return i<e+b.helperProportions.width/2&&f-b.helperProportions.width/2<j&&k<g+b.helperProportions.height/2&&h-b.helperProportions.height/2<l;case"pointer":var m=(b.positionAbs||b.position.absolute).left+(b.clickOffset||b.offset.click).left,n=(b.positionAbs||b.position.absolute).top+(b.clickOffset||b.offset.click).top,o=a.ui.isOver(n,m,k,i,c.proportions.height,c.proportions.width);return o;case"touch":return(g>=k&&g<=l||h>=k&&h<=l||g<k&&h>l)&&(e>=i&&e<=j||f>=i&&f<=j||e<i&&f>j);default:return!1}},a.ui.ddmanager={current:null,droppables:{"default":[]},prepareOffsets:function(b,c){var d=a.ui.ddmanager.droppables[b.options.scope]||[],e=c?c.type:null,f=(b.currentItem||b.element).find(":data(droppable)").andSelf();g:for(var h=0;h<d.length;h++){if(d[h].options.disabled||b&&!d[h].accept.call(d[h].element[0],b.currentItem||b.element))continue;for(var i=0;i<f.length;i++)if(f[i]==d[h].element[0]){d[h].proportions.height=0;continue g}d[h].visible=d[h].element.css("display")!="none";if(!d[h].visible)continue;e=="mousedown"&&d[h]._activate.call(d[h],c),d[h].offset=d[h].element.offset(),d[h].proportions={width:d[h].element[0].offsetWidth,height:d[h].element[0].offsetHeight}}},drop:function(b,c){var d=!1;return a.each(a.ui.ddmanager.droppables[b.options.scope]||[],function(){if(!this.options)return;!this.options.disabled&&this.visible&&a.ui.intersect(b,this,this.options.tolerance)&&(d=this._drop.call(this,c)||d),!this.options.disabled&&this.visible&&this.accept.call(this.element[0],b.currentItem||b.element)&&(this.isout=1,this.isover=0,this._deactivate.call(this,c))}),d},dragStart:function(b,c){b.element.parents(":not(body,html)").bind("scroll.droppable",function(){b.options.refreshPositions||a.ui.ddmanager.prepareOffsets(b,c)})},drag:function(b,c){b.options.refreshPositions&&a.ui.ddmanager.prepareOffsets(b,c),a.each(a.ui.ddmanager.droppables[b.options.scope]||[],function(){if(this.options.disabled||this.greedyChild||!this.visible)return;var d=a.ui.intersect(b,this,this.options.tolerance),e=!d&&this.isover==1?"isout":d&&this.isover==0?"isover":null;if(!e)return;var f;if(this.options.greedy){var g=this.element.parents(":data(droppable):eq(0)");g.length&&(f=a.data(g[0],"droppable"),f.greedyChild=e=="isover"?1:0)}f&&e=="isover"&&(f.isover=0,f.isout=1,f._out.call(f,c)),this[e]=1,this[e=="isout"?"isover":"isout"]=0,this[e=="isover"?"_over":"_out"].call(this,c),f&&e=="isout"&&(f.isout=0,f.isover=1,f._over.call(f,c))})},dragStop:function(b,c){b.element.parents(":not(body,html)").unbind("scroll.droppable"),b.options.refreshPositions||a.ui.ddmanager.prepareOffsets(b,c)}}})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.resizable.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.widget("ui.resizable",a.ui.mouse,{widgetEventPrefix:"resize",options:{alsoResize:!1,animate:!1,animateDuration:"slow",animateEasing:"swing",aspectRatio:!1,autoHide:!1,containment:!1,ghost:!1,grid:!1,handles:"e,s,se",helper:!1,maxHeight:null,maxWidth:null,minHeight:10,minWidth:10,zIndex:1e3},_create:function(){var b=this,c=this.options;this.element.addClass("ui-resizable"),a.extend(this,{_aspectRatio:!!c.aspectRatio,aspectRatio:c.aspectRatio,originalElement:this.element,_proportionallyResizeElements:[],_helper:c.helper||c.ghost||c.animate?c.helper||"ui-resizable-helper":null}),this.element[0].nodeName.match(/canvas|textarea|input|select|button|img/i)&&(this.element.wrap(a('<div class="ui-wrapper" style="overflow: hidden;"></div>').css({position:this.element.css("position"),width:this.element.outerWidth(),height:this.element.outerHeight(),top:this.element.css("top"),left:this.element.css("left")})),this.element=this.element.parent().data("resizable",this.element.data("resizable")),this.elementIsWrapper=!0,this.element.css({marginLeft:this.originalElement.css("marginLeft"),marginTop:this.originalElement.css("marginTop"),marginRight:this.originalElement.css("marginRight"),marginBottom:this.originalElement.css("marginBottom")}),this.originalElement.css({marginLeft:0,marginTop:0,marginRight:0,marginBottom:0}),this.originalResizeStyle=this.originalElement.css("resize"),this.originalElement.css("resize","none"),this._proportionallyResizeElements.push(this.originalElement.css({position:"static",zoom:1,display:"block"})),this.originalElement.css({margin:this.originalElement.css("margin")}),this._proportionallyResize()),this.handles=c.handles||(a(".ui-resizable-handle",this.element).length?{n:".ui-resizable-n",e:".ui-resizable-e",s:".ui-resizable-s",w:".ui-resizable-w",se:".ui-resizable-se",sw:".ui-resizable-sw",ne:".ui-resizable-ne",nw:".ui-resizable-nw"}:"e,s,se");if(this.handles.constructor==String){this.handles=="all"&&(this.handles="n,e,s,w,se,sw,ne,nw");var d=this.handles.split(",");this.handles={};for(var e=0;e<d.length;e++){var f=a.trim(d[e]),g="ui-resizable-"+f,h=a('<div class="ui-resizable-handle '+g+'"></div>');h.css({zIndex:c.zIndex}),"se"==f&&h.addClass("ui-icon ui-icon-gripsmall-diagonal-se"),this.handles[f]=".ui-resizable-"+f,this.element.append(h)}}this._renderAxis=function(b){b=b||this.element;for(var c in this.handles){this.handles[c].constructor==String&&(this.handles[c]=a(this.handles[c],this.element).show());if(this.elementIsWrapper&&this.originalElement[0].nodeName.match(/textarea|input|select|button/i)){var d=a(this.handles[c],this.element),e=0;e=/sw|ne|nw|se|n|s/.test(c)?d.outerHeight():d.outerWidth();var f=["padding",/ne|nw|n/.test(c)?"Top":/se|sw|s/.test(c)?"Bottom":/^e$/.test(c)?"Right":"Left"].join("");b.css(f,e),this._proportionallyResize()}if(!a(this.handles[c]).length)continue}},this._renderAxis(this.element),this._handles=a(".ui-resizable-handle",this.element).disableSelection(),this._handles.mouseover(function(){if(!b.resizing){if(this.className)var a=this.className.match(/ui-resizable-(se|sw|ne|nw|n|e|s|w)/i);b.axis=a&&a[1]?a[1]:"se"}}),c.autoHide&&(this._handles.hide(),a(this.element).addClass("ui-resizable-autohide").hover(function(){if(c.disabled)return;a(this).removeClass("ui-resizable-autohide"),b._handles.show()},function(){if(c.disabled)return;b.resizing||(a(this).addClass("ui-resizable-autohide"),b._handles.hide())})),this._mouseInit()},destroy:function(){this._mouseDestroy();var b=function(b){a(b).removeClass("ui-resizable ui-resizable-disabled ui-resizable-resizing").removeData("resizable").unbind(".resizable").find(".ui-resizable-handle").remove()};if(this.elementIsWrapper){b(this.element);var c=this.element;c.after(this.originalElement.css({position:c.css("position"),width:c.outerWidth(),height:c.outerHeight(),top:c.css("top"),left:c.css("left")})).remove()}return this.originalElement.css("resize",this.originalResizeStyle),b(this.originalElement),this},_mouseCapture:function(b){var c=!1;for(var d in this.handles)a(this.handles[d])[0]==b.target&&(c=!0);return!this.options.disabled&&c},_mouseStart:function(b){var d=this.options,e=this.element.position(),f=this.element;this.resizing=!0,this.documentScroll={top:a(document).scrollTop(),left:a(document).scrollLeft()},(f.is(".ui-draggable")||/absolute/.test(f.css("position")))&&f.css({position:"absolute",top:e.top,left:e.left}),this._renderProxy();var g=c(this.helper.css("left")),h=c(this.helper.css("top"));d.containment&&(g+=a(d.containment).scrollLeft()||0,h+=a(d.containment).scrollTop()||0),this.offset=this.helper.offset(),this.position={left:g,top:h},this.size=this._helper?{width:f.outerWidth(),height:f.outerHeight()}:{width:f.width(),height:f.height()},this.originalSize=this._helper?{width:f.outerWidth(),height:f.outerHeight()}:{width:f.width(),height:f.height()},this.originalPosition={left:g,top:h},this.sizeDiff={width:f.outerWidth()-f.width(),height:f.outerHeight()-f.height()},this.originalMousePosition={left:b.pageX,top:b.pageY},this.aspectRatio=typeof d.aspectRatio=="number"?d.aspectRatio:this.originalSize.width/this.originalSize.height||1;var i=a(".ui-resizable-"+this.axis).css("cursor");return a("body").css("cursor",i=="auto"?this.axis+"-resize":i),f.addClass("ui-resizable-resizing"),this._propagate("start",b),!0},_mouseDrag:function(b){var c=this.helper,d=this.options,e={},f=this,g=this.originalMousePosition,h=this.axis,i=b.pageX-g.left||0,j=b.pageY-g.top||0,k=this._change[h];if(!k)return!1;var l=k.apply(this,[b,i,j]),m=a.browser.msie&&a.browser.version<7,n=this.sizeDiff;this._updateVirtualBoundaries(b.shiftKey);if(this._aspectRatio||b.shiftKey)l=this._updateRatio(l,b);return l=this._respectSize(l,b),this._propagate("resize",b),c.css({top:this.position.top+"px",left:this.position.left+"px",width:this.size.width+"px",height:this.size.height+"px"}),!this._helper&&this._proportionallyResizeElements.length&&this._proportionallyResize(),this._updateCache(l),this._trigger("resize",b,this.ui()),!1},_mouseStop:function(b){this.resizing=!1;var c=this.options,d=this;if(this._helper){var e=this._proportionallyResizeElements,f=e.length&&/textarea/i.test(e[0].nodeName),g=f&&a.ui.hasScroll(e[0],"left")?0:d.sizeDiff.height,h=f?0:d.sizeDiff.width,i={width:d.helper.width()-h,height:d.helper.height()-g},j=parseInt(d.element.css("left"),10)+(d.position.left-d.originalPosition.left)||null,k=parseInt(d.element.css("top"),10)+(d.position.top-d.originalPosition.top)||null;c.animate||this.element.css(a.extend(i,{top:k,left:j})),d.helper.height(d.size.height),d.helper.width(d.size.width),this._helper&&!c.animate&&this._proportionallyResize()}return a("body").css("cursor","auto"),this.element.removeClass("ui-resizable-resizing"),this._propagate("stop",b),this._helper&&this.helper.remove(),!1},_updateVirtualBoundaries:function(a){var b=this.options,c,e,f,g,h;h={minWidth:d(b.minWidth)?b.minWidth:0,maxWidth:d(b.maxWidth)?b.maxWidth:Infinity,minHeight:d(b.minHeight)?b.minHeight:0,maxHeight:d(b.maxHeight)?b.maxHeight:Infinity};if(this._aspectRatio||a)c=h.minHeight*this.aspectRatio,f=h.minWidth/this.aspectRatio,e=h.maxHeight*this.aspectRatio,g=h.maxWidth/this.aspectRatio,c>h.minWidth&&(h.minWidth=c),f>h.minHeight&&(h.minHeight=f),e<h.maxWidth&&(h.maxWidth=e),g<h.maxHeight&&(h.maxHeight=g);this._vBoundaries=h},_updateCache:function(a){var b=this.options;this.offset=this.helper.offset(),d(a.left)&&(this.position.left=a.left),d(a.top)&&(this.position.top=a.top),d(a.height)&&(this.size.height=a.height),d(a.width)&&(this.size.width=a.width)},_updateRatio:function(a,b){var c=this.options,e=this.position,f=this.size,g=this.axis;return d(a.height)?a.width=a.height*this.aspectRatio:d(a.width)&&(a.height=a.width/this.aspectRatio),g=="sw"&&(a.left=e.left+(f.width-a.width),a.top=null),g=="nw"&&(a.top=e.top+(f.height-a.height),a.left=e.left+(f.width-a.width)),a},_respectSize:function(a,b){var c=this.helper,e=this._vBoundaries,f=this._aspectRatio||b.shiftKey,g=this.axis,h=d(a.width)&&e.maxWidth&&e.maxWidth<a.width,i=d(a.height)&&e.maxHeight&&e.maxHeight<a.height,j=d(a.width)&&e.minWidth&&e.minWidth>a.width,k=d(a.height)&&e.minHeight&&e.minHeight>a.height;j&&(a.width=e.minWidth),k&&(a.height=e.minHeight),h&&(a.width=e.maxWidth),i&&(a.height=e.maxHeight);var l=this.originalPosition.left+this.originalSize.width,m=this.position.top+this.size.height,n=/sw|nw|w/.test(g),o=/nw|ne|n/.test(g);j&&n&&(a.left=l-e.minWidth),h&&n&&(a.left=l-e.maxWidth),k&&o&&(a.top=m-e.minHeight),i&&o&&(a.top=m-e.maxHeight);var p=!a.width&&!a.height;return p&&!a.left&&a.top?a.top=null:p&&!a.top&&a.left&&(a.left=null),a},_proportionallyResize:function(){var b=this.options;if(!this._proportionallyResizeElements.length)return;var c=this.helper||this.element;for(var d=0;d<this._proportionallyResizeElements.length;d++){var e=this._proportionallyResizeElements[d];if(!this.borderDif){var f=[e.css("borderTopWidth"),e.css("borderRightWidth"),e.css("borderBottomWidth"),e.css("borderLeftWidth")],g=[e.css("paddingTop"),e.css("paddingRight"),e.css("paddingBottom"),e.css("paddingLeft")];this.borderDif=a.map(f,function(a,b){var c=parseInt(a,10)||0,d=parseInt(g[b],10)||0;return c+d})}if(!a.browser.msie||!a(c).is(":hidden")&&!a(c).parents(":hidden").length)e.css({height:c.height()-this.borderDif[0]-this.borderDif[2]||0,width:c.width()-this.borderDif[1]-this.borderDif[3]||0});else continue}},_renderProxy:function(){var b=this.element,c=this.options;this.elementOffset=b.offset();if(this._helper){this.helper=this.helper||a('<div style="overflow:hidden;"></div>');var d=a.browser.msie&&a.browser.version<7,e=d?1:0,f=d?2:-1;this.helper.addClass(this._helper).css({width:this.element.outerWidth()+f,height:this.element.outerHeight()+f,position:"absolute",left:this.elementOffset.left-e+"px",top:this.elementOffset.top-e+"px",zIndex:++c.zIndex}),this.helper.appendTo("body").disableSelection()}else this.helper=this.element},_change:{e:function(a,b,c){return{width:this.originalSize.width+b}},w:function(a,b,c){var d=this.options,e=this.originalSize,f=this.originalPosition;return{left:f.left+b,width:e.width-b}},n:function(a,b,c){var d=this.options,e=this.originalSize,f=this.originalPosition;return{top:f.top+c,height:e.height-c}},s:function(a,b,c){return{height:this.originalSize.height+c}},se:function(b,c,d){return a.extend(this._change.s.apply(this,arguments),this._change.e.apply(this,[b,c,d]))},sw:function(b,c,d){return a.extend(this._change.s.apply(this,arguments),this._change.w.apply(this,[b,c,d]))},ne:function(b,c,d){return a.extend(this._change.n.apply(this,arguments),this._change.e.apply(this,[b,c,d]))},nw:function(b,c,d){return a.extend(this._change.n.apply(this,arguments),this._change.w.apply(this,[b,c,d]))}},_propagate:function(b,c){a.ui.plugin.call(this,b,[c,this.ui()]),b!="resize"&&this._trigger(b,c,this.ui())},plugins:{},ui:function(){return{originalElement:this.originalElement,element:this.element,helper:this.helper,position:this.position,size:this.size,originalSize:this.originalSize,originalPosition:this.originalPosition}}}),a.extend(a.ui.resizable,{version:"1.8.20"}),a.ui.plugin.add("resizable","alsoResize",{start:function(b,c){var d=a(this).data("resizable"),e=d.options,f=function(b){a(b).each(function(){var b=a(this);b.data("resizable-alsoresize",{width:parseInt(b.width(),10),height:parseInt(b.height(),10),left:parseInt(b.css("left"),10),top:parseInt(b.css("top"),10)})})};typeof e.alsoResize=="object"&&!e.alsoResize.parentNode?e.alsoResize.length?(e.alsoResize=e.alsoResize[0],f(e.alsoResize)):a.each(e.alsoResize,function(a){f(a)}):f(e.alsoResize)},resize:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d.originalSize,g=d.originalPosition,h={height:d.size.height-f.height||0,width:d.size.width-f.width||0,top:d.position.top-g.top||0,left:d.position.left-g.left||0},i=function(b,d){a(b).each(function(){var b=a(this),e=a(this).data("resizable-alsoresize"),f={},g=d&&d.length?d:b.parents(c.originalElement[0]).length?["width","height"]:["width","height","top","left"];a.each(g,function(a,b){var c=(e[b]||0)+(h[b]||0);c&&c>=0&&(f[b]=c||null)}),b.css(f)})};typeof e.alsoResize=="object"&&!e.alsoResize.nodeType?a.each(e.alsoResize,function(a,b){i(a,b)}):i(e.alsoResize)},stop:function(b,c){a(this).removeData("resizable-alsoresize")}}),a.ui.plugin.add("resizable","animate",{stop:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d._proportionallyResizeElements,g=f.length&&/textarea/i.test(f[0].nodeName),h=g&&a.ui.hasScroll(f[0],"left")?0:d.sizeDiff.height,i=g?0:d.sizeDiff.width,j={width:d.size.width-i,height:d.size.height-h},k=parseInt(d.element.css("left"),10)+(d.position.left-d.originalPosition.left)||null,l=parseInt(d.element.css("top"),10)+(d.position.top-d.originalPosition.top)||null;d.element.animate(a.extend(j,l&&k?{top:l,left:k}:{}),{duration:e.animateDuration,easing:e.animateEasing,step:function(){var c={width:parseInt(d.element.css("width"),10),height:parseInt(d.element.css("height"),10),top:parseInt(d.element.css("top"),10),left:parseInt(d.element.css("left"),10)};f&&f.length&&a(f[0]).css({width:c.width,height:c.height}),d._updateCache(c),d._propagate("resize",b)}})}}),a.ui.plugin.add("resizable","containment",{start:function(b,d){var e=a(this).data("resizable"),f=e.options,g=e.element,h=f.containment,i=h instanceof a?h.get(0):/parent/.test(h)?g.parent().get(0):h;if(!i)return;e.containerElement=a(i);if(/document/.test(h)||h==document)e.containerOffset={left:0,top:0},e.containerPosition={left:0,top:0},e.parentData={element:a(document),left:0,top:0,width:a(document).width(),height:a(document).height()||document.body.parentNode.scrollHeight};else{var j=a(i),k=[];a(["Top","Right","Left","Bottom"]).each(function(a,b){k[a]=c(j.css("padding"+b))}),e.containerOffset=j.offset(),e.containerPosition=j.position(),e.containerSize={height:j.innerHeight()-k[3],width:j.innerWidth()-k[1]};var l=e.containerOffset,m=e.containerSize.height,n=e.containerSize.width,o=a.ui.hasScroll(i,"left")?i.scrollWidth:n,p=a.ui.hasScroll(i)?i.scrollHeight:m;e.parentData={element:i,left:l.left,top:l.top,width:o,height:p}}},resize:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d.containerSize,g=d.containerOffset,h=d.size,i=d.position,j=d._aspectRatio||b.shiftKey,k={top:0,left:0},l=d.containerElement;l[0]!=document&&/static/.test(l.css("position"))&&(k=g),i.left<(d._helper?g.left:0)&&(d.size.width=d.size.width+(d._helper?d.position.left-g.left:d.position.left-k.left),j&&(d.size.height=d.size.width/d.aspectRatio),d.position.left=e.helper?g.left:0),i.top<(d._helper?g.top:0)&&(d.size.height=d.size.height+(d._helper?d.position.top-g.top:d.position.top),j&&(d.size.width=d.size.height*d.aspectRatio),d.position.top=d._helper?g.top:0),d.offset.left=d.parentData.left+d.position.left,d.offset.top=d.parentData.top+d.position.top;var m=Math.abs((d._helper?d.offset.left-k.left:d.offset.left-k.left)+d.sizeDiff.width),n=Math.abs((d._helper?d.offset.top-k.top:d.offset.top-g.top)+d.sizeDiff.height),o=d.containerElement.get(0)==d.element.parent().get(0),p=/relative|absolute/.test(d.containerElement.css("position"));o&&p&&(m-=d.parentData.left),m+d.size.width>=d.parentData.width&&(d.size.width=d.parentData.width-m,j&&(d.size.height=d.size.width/d.aspectRatio)),n+d.size.height>=d.parentData.height&&(d.size.height=d.parentData.height-n,j&&(d.size.width=d.size.height*d.aspectRatio))},stop:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d.position,g=d.containerOffset,h=d.containerPosition,i=d.containerElement,j=a(d.helper),k=j.offset(),l=j.outerWidth()-d.sizeDiff.width,m=j.outerHeight()-d.sizeDiff.height;d._helper&&!e.animate&&/relative/.test(i.css("position"))&&a(this).css({left:k.left-h.left-g.left,width:l,height:m}),d._helper&&!e.animate&&/static/.test(i.css("position"))&&a(this).css({left:k.left-h.left-g.left,width:l,height:m})}}),a.ui.plugin.add("resizable","ghost",{start:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d.size;d.ghost=d.originalElement.clone(),d.ghost.css({opacity:.25,display:"block",position:"relative",height:f.height,width:f.width,margin:0,left:0,top:0}).addClass("ui-resizable-ghost").addClass(typeof e.ghost=="string"?e.ghost:""),d.ghost.appendTo(d.helper)},resize:function(b,c){var d=a(this).data("resizable"),e=d.options;d.ghost&&d.ghost.css({position:"relative",height:d.size.height,width:d.size.width})},stop:function(b,c){var d=a(this).data("resizable"),e=d.options;d.ghost&&d.helper&&d.helper.get(0).removeChild(d.ghost.get(0))}}),a.ui.plugin.add("resizable","grid",{resize:function(b,c){var d=a(this).data("resizable"),e=d.options,f=d.size,g=d.originalSize,h=d.originalPosition,i=d.axis,j=e._aspectRatio||b.shiftKey;e.grid=typeof e.grid=="number"?[e.grid,e.grid]:e.grid;var k=Math.round((f.width-g.width)/(e.grid[0]||1))*(e.grid[0]||1),l=Math.round((f.height-g.height)/(e.grid[1]||1))*(e.grid[1]||1);/^(se|s|e)$/.test(i)?(d.size.width=g.width+k,d.size.height=g.height+l):/^(ne)$/.test(i)?(d.size.width=g.width+k,d.size.height=g.height+l,d.position.top=h.top-l):/^(sw)$/.test(i)?(d.size.width=g.width+k,d.size.height=g.height+l,d.position.left=h.left-k):(d.size.width=g.width+k,d.size.height=g.height+l,d.position.top=h.top-l,d.position.left=h.left-k)}});var c=function(a){return parseInt(a,10)||0},d=function(a){return!isNaN(parseInt(a,10))}})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.selectable.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.widget("ui.selectable",a.ui.mouse,{options:{appendTo:"body",autoRefresh:!0,distance:0,filter:"*",tolerance:"touch"},_create:function(){var b=this;this.element.addClass("ui-selectable"),this.dragged=!1;var c;this.refresh=function(){c=a(b.options.filter,b.element[0]),c.addClass("ui-selectee"),c.each(function(){var b=a(this),c=b.offset();a.data(this,"selectable-item",{element:this,$element:b,left:c.left,top:c.top,right:c.left+b.outerWidth(),bottom:c.top+b.outerHeight(),startselected:!1,selected:b.hasClass("ui-selected"),selecting:b.hasClass("ui-selecting"),unselecting:b.hasClass("ui-unselecting")})})},this.refresh(),this.selectees=c.addClass("ui-selectee"),this._mouseInit(),this.helper=a("<div class='ui-selectable-helper'></div>")},destroy:function(){return this.selectees.removeClass("ui-selectee").removeData("selectable-item"),this.element.removeClass("ui-selectable ui-selectable-disabled").removeData("selectable").unbind(".selectable"),this._mouseDestroy(),this},_mouseStart:function(b){var c=this;this.opos=[b.pageX,b.pageY];if(this.options.disabled)return;var d=this.options;this.selectees=a(d.filter,this.element[0]),this._trigger("start",b),a(d.appendTo).append(this.helper),this.helper.css({left:b.clientX,top:b.clientY,width:0,height:0}),d.autoRefresh&&this.refresh(),this.selectees.filter(".ui-selected").each(function(){var d=a.data(this,"selectable-item");d.startselected=!0,!b.metaKey&&!b.ctrlKey&&(d.$element.removeClass("ui-selected"),d.selected=!1,d.$element.addClass("ui-unselecting"),d.unselecting=!0,c._trigger("unselecting",b,{unselecting:d.element}))}),a(b.target).parents().andSelf().each(function(){var d=a.data(this,"selectable-item");if(d){var e=!b.metaKey&&!b.ctrlKey||!d.$element.hasClass("ui-selected");return d.$element.removeClass(e?"ui-unselecting":"ui-selected").addClass(e?"ui-selecting":"ui-unselecting"),d.unselecting=!e,d.selecting=e,d.selected=e,e?c._trigger("selecting",b,{selecting:d.element}):c._trigger("unselecting",b,{unselecting:d.element}),!1}})},_mouseDrag:function(b){var c=this;this.dragged=!0;if(this.options.disabled)return;var d=this.options,e=this.opos[0],f=this.opos[1],g=b.pageX,h=b.pageY;if(e>g){var i=g;g=e,e=i}if(f>h){var i=h;h=f,f=i}return this.helper.css({left:e,top:f,width:g-e,height:h-f}),this.selectees.each(function(){var i=a.data(this,"selectable-item");if(!i||i.element==c.element[0])return;var j=!1;d.tolerance=="touch"?j=!(i.left>g||i.right<e||i.top>h||i.bottom<f):d.tolerance=="fit"&&(j=i.left>e&&i.right<g&&i.top>f&&i.bottom<h),j?(i.selected&&(i.$element.removeClass("ui-selected"),i.selected=!1),i.unselecting&&(i.$element.removeClass("ui-unselecting"),i.unselecting=!1),i.selecting||(i.$element.addClass("ui-selecting"),i.selecting=!0,c._trigger("selecting",b,{selecting:i.element}))):(i.selecting&&((b.metaKey||b.ctrlKey)&&i.startselected?(i.$element.removeClass("ui-selecting"),i.selecting=!1,i.$element.addClass("ui-selected"),i.selected=!0):(i.$element.removeClass("ui-selecting"),i.selecting=!1,i.startselected&&(i.$element.addClass("ui-unselecting"),i.unselecting=!0),c._trigger("unselecting",b,{unselecting:i.element}))),i.selected&&!b.metaKey&&!b.ctrlKey&&!i.startselected&&(i.$element.removeClass("ui-selected"),i.selected=!1,i.$element.addClass("ui-unselecting"),i.unselecting=!0,c._trigger("unselecting",b,{unselecting:i.element})))}),!1},_mouseStop:function(b){var c=this;this.dragged=!1;var d=this.options;return a(".ui-unselecting",this.element[0]).each(function(){var d=a.data(this,"selectable-item");d.$element.removeClass("ui-unselecting"),d.unselecting=!1,d.startselected=!1,c._trigger("unselected",b,{unselected:d.element})}),a(".ui-selecting",this.element[0]).each(function(){var d=a.data(this,"selectable-item");d.$element.removeClass("ui-selecting").addClass("ui-selected"),d.selecting=!1,d.selected=!0,d.startselected=!0,c._trigger("selected",b,{selected:d.element})}),this._trigger("stop",b),this.helper.remove(),!1}}),a.extend(a.ui.selectable,{version:"1.8.20"})})(jQuery);;/*! jQuery UI - v1.8.20 - 2012-04-30
* https://github.com/jquery/jquery-ui
* Includes: jquery.ui.sortable.js
* Copyright (c) 2012 AUTHORS.txt; Licensed MIT, GPL */
(function(a,b){a.widget("ui.sortable",a.ui.mouse,{widgetEventPrefix:"sort",ready:!1,options:{appendTo:"parent",axis:!1,connectWith:!1,containment:!1,cursor:"auto",cursorAt:!1,dropOnEmpty:!0,forcePlaceholderSize:!1,forceHelperSize:!1,grid:!1,handle:!1,helper:"original",items:"> *",opacity:!1,placeholder:!1,revert:!1,scroll:!0,scrollSensitivity:20,scrollSpeed:20,scope:"default",tolerance:"intersect",zIndex:1e3},_create:function(){var a=this.options;this.containerCache={},this.element.addClass("ui-sortable"),this.refresh(),this.floating=this.items.length?a.axis==="x"||/left|right/.test(this.items[0].item.css("float"))||/inline|table-cell/.test(this.items[0].item.css("display")):!1,this.offset=this.element.offset(),this._mouseInit(),this.ready=!0},destroy:function(){a.Widget.prototype.destroy.call(this),this.element.removeClass("ui-sortable ui-sortable-disabled"),this._mouseDestroy();for(var b=this.items.length-1;b>=0;b--)this.items[b].item.removeData(this.widgetName+"-item");return this},_setOption:function(b,c){b==="disabled"?(this.options[b]=c,this.widget()[c?"addClass":"removeClass"]("ui-sortable-disabled")):a.Widget.prototype._setOption.apply(this,arguments)},_mouseCapture:function(b,c){var d=this;if(this.reverting)return!1;if(this.options.disabled||this.options.type=="static")return!1;this._refreshItems(b);var e=null,f=this,g=a(b.target).parents().each(function(){if(a.data(this,d.widgetName+"-item")==f)return e=a(this),!1});a.data(b.target,d.widgetName+"-item")==f&&(e=a(b.target));if(!e)return!1;if(this.options.handle&&!c){var h=!1;a(this.options.handle,e).find("*").andSelf().each(function(){this==b.target&&(h=!0)});if(!h)return!1}return this.currentItem=e,this._removeCurrentsFromItems(),!0},_mouseStart:function(b,c,d){var e=this.options,f=this;this.currentContainer=this,this.refreshPositions(),this.helper=this._createHelper(b),this._cacheHelperProportions(),this._cacheMargins(),this.scrollParent=this.helper.scrollParent(),this.offset=this.currentItem.offset(),this.offset={top:this.offset.top-this.margins.top,left:this.offset.left-this.margins.left},this.helper.css("position","absolute"),this.cssPosition=this.helper.css("position"),a.extend(this.offset,{click:{left:b.pageX-this.offset.left,top:b.pageY-this.offset.top},parent:this._getParentOffset(),relative:this._getRelativeOffset()}),this.originalPosition=this._generatePosition(b),this.originalPageX=b.pageX,this.originalPageY=b.pageY,e.cursorAt&&this._adjustOffsetFromHelper(e.cursorAt),this.domPosition={prev:this.currentItem.prev()[0],parent:this.currentItem.parent()[0]},this.helper[0]!=this.currentItem[0]&&this.currentItem.hide(),this._createPlaceholder(),e.containment&&this._setContainment(),e.cursor&&(a("body").css("cursor")&&(this._storedCursor=a("body").css("cursor")),a("body").css("cursor",e.cursor)),e.opacity&&(this.helper.css("opacity")&&(this._storedOpacity=this.helper.css("opacity")),this.helper.css("opacity",e.opacity)),e.zIndex&&(this.helper.css("zIndex")&&(this._storedZIndex=this.helper.css("zIndex")),this.helper.css("zIndex",e.zIndex)),this.scrollParent[0]!=document&&this.scrollParent[0].tagName!="HTML"&&(this.overflowOffset=this.scrollParent.offset()),this._trigger("start",b,this._uiHash()),this._preserveHelperProportions||this._cacheHelperProportions();if(!d)for(var g=this.containers.length-1;g>=0;g--)this.containers[g]._trigger("activate",b,f._uiHash(this));return a.ui.ddmanager&&(a.ui.ddmanager.current=this),a.ui.ddmanager&&!e.dropBehaviour&&a.ui.ddmanager.prepareOffsets(this,b),this.dragging=!0,this.helper.addClass("ui-sortable-helper"),this._mouseDrag(b),!0},_mouseDrag:function(b){this.position=this._generatePosition(b),this.positionAbs=this._convertPositionTo("absolute"),this.lastPositionAbs||(this.lastPositionAbs=this.positionAbs);if(this.options.scroll){var c=this.options,d=!1;this.scrollParent[0]!=document&&this.scrollParent[0].tagName!="HTML"?(this.overflowOffset.top+this.scrollParent[0].offsetHeight-b.pageY<c.scrollSensitivity?this.scrollParent[0].scrollTop=d=this.scrollParent[0].scrollTop+c.scrollSpeed:b.pageY-this.overflowOffset.top<c.scrollSensitivity&&(this.scrollParent[0].scrollTop=d=this.scrollParent[0].scrollTop-c.scrollSpeed),this.overflowOffset.left+this.scrollParent[0].offsetWidth-b.pageX<c.scrollSensitivity?this.scrollParent[0].scrollLeft=d=this.scrollParent[0].scrollLeft+c.scrollSpeed:b.pageX-this.overflowOffset.left<c.scrollSensitivity&&(this.scrollParent[0].scrollLeft=d=this.scrollParent[0].scrollLeft-c.scrollSpeed)):(b.pageY-a(document).scrollTop()<c.scrollSensitivity?d=a(document).scrollTop(a(document).scrollTop()-c.scrollSpeed):a(window).height()-(b.pageY-a(document).scrollTop())<c.scrollSensitivity&&(d=a(document).scrollTop(a(document).scrollTop()+c.scrollSpeed)),b.pageX-a(document).scrollLeft()<c.scrollSensitivity?d=a(document).scrollLeft(a(document).scrollLeft()-c.scrollSpeed):a(window).width()-(b.pageX-a(document).scrollLeft())<c.scrollSensitivity&&(d=a(document).scrollLeft(a(document).scrollLeft()+c.scrollSpeed))),d!==!1&&a.ui.ddmanager&&!c.dropBehaviour&&a.ui.ddmanager.prepareOffsets(this,b)}this.positionAbs=this._convertPositionTo("absolute");if(!this.options.axis||this.options.axis!="y")this.helper[0].style.left=this.position.left+"px";if(!this.options.axis||this.options.axis!="x")this.helper[0].style.top=this.position.top+"px";for(var e=this.items.length-1;e>=0;e--){var f=this.items[e],g=f.item[0],h=this._intersectsWithPointer(f);if(!h)continue;if(g!=this.currentItem[0]&&this.placeholder[h==1?"next":"prev"]()[0]!=g&&!a.ui.contains(this.placeholder[0],g)&&(this.options.type=="semi-dynamic"?!a.ui.contains(this.element[0],g):!0)){this.direction=h==1?"down":"up";if(this.options.tolerance=="pointer"||this._intersectsWithSides(f))this._rearrange(b,f);else break;this._trigger("change",b,this._uiHash());break}}return this._contactContainers(b),a.ui.ddmanager&&a.ui.ddmanager.drag(this,b),this._trigger("sort",b,this._uiHash()),this.lastPositionAbs=this.positionAbs,!1},_mouseStop:function(b,c){if(!b)return;a.ui.ddmanager&&!this.options.dropBehaviour&&a.ui.ddmanager.drop(this,b);if(this.options.revert){var d=this,e=d.placeholder.offset();d.reverting=!0,a(this.helper).animate({left:e.left-this.offset.parent.left-d.margins.left+(this.offsetParent[0]==document.body?0:this.offsetParent[0].scrollLeft),top:e.top-this.offset.parent.top-d.margins.top+(this.offsetParent[0]==document.body?0:this.offsetParent[0].scrollTop)},parseInt(this.options.revert,10)||500,function(){d._clear(b)})}else this._clear(b,c);return!1},cancel:function(){var b=this;if(this.dragging){this._mouseUp({target:null}),this.options.helper=="original"?this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper"):this.currentItem.show();for(var c=this.containers.length-1;c>=0;c--)this.containers[c]._trigger("deactivate",null,b._uiHash(this)),this.containers[c].containerCache.over&&(this.containers[c]._trigger("out",null,b._uiHash(this)),this.containers[c].containerCache.over=0)}return this.placeholder&&(this.placeholder[0].parentNode&&this.placeholder[0].parentNode.removeChild(this.placeholder[0]),this.options.helper!="original"&&this.helper&&this.helper[0].parentNode&&this.helper.remove(),a.extend(this,{helper:null,dragging:!1,reverting:!1,_noFinalSort:null}),this.domPosition.prev?a(this.domPosition.prev).after(this.currentItem):a(this.domPosition.parent).prepend(this.currentItem)),this},serialize:function(b){var c=this._getItemsAsjQuery(b&&b.connected),d=[];return b=b||{},a(c).each(function(){var c=(a(b.item||this).attr(b.attribute||"id")||"").match(b.expression||/(.+)[-=_](.+)/);c&&d.push((b.key||c[1]+"[]")+"="+(b.key&&b.expression?c[1]:c[2]))}),!d.length&&b.key&&d.push(b.key+"="),d.join("&")},toArray:function(b){var c=this._getItemsAsjQuery(b&&b.connected),d=[];return b=b||{},c.each(function(){d.push(a(b.item||this).attr(b.attribute||"id")||"")}),d},_intersectsWith:function(a){var b=this.positionAbs.left,c=b+this.helperProportions.width,d=this.positionAbs.top,e=d+this.helperProportions.height,f=a.left,g=f+a.width,h=a.top,i=h+a.height,j=this.offset.click.top,k=this.offset.click.left,l=d+j>h&&d+j<i&&b+k>f&&b+k<g;return this.options.tolerance=="pointer"||this.options.forcePointerForContainers||this.options.tolerance!="pointer"&&this.helperProportions[this.floating?"width":"height"]>a[this.floating?"width":"height"]?l:f<b+this.helperProportions.width/2&&c-this.helperProportions.width/2<g&&h<d+this.helperProportions.height/2&&e-this.helperProportions.height/2<i},_intersectsWithPointer:function(b){var c=this.options.axis==="x"||a.ui.isOverAxis(this.positionAbs.top+this.offset.click.top,b.top,b.height),d=this.options.axis==="y"||a.ui.isOverAxis(this.positionAbs.left+this.offset.click.left,b.left,b.width),e=c&&d,f=this._getDragVerticalDirection(),g=this._getDragHorizontalDirection();return e?this.floating?g&&g=="right"||f=="down"?2:1:f&&(f=="down"?2:1):!1},_intersectsWithSides:function(b){var c=a.ui.isOverAxis(this.positionAbs.top+this.offset.click.top,b.top+b.height/2,b.height),d=a.ui.isOverAxis(this.positionAbs.left+this.offset.click.left,b.left+b.width/2,b.width),e=this._getDragVerticalDirection(),f=this._getDragHorizontalDirection();return this.floating&&f?f=="right"&&d||f=="left"&&!d:e&&(e=="down"&&c||e=="up"&&!c)},_getDragVerticalDirection:function(){var a=this.positionAbs.top-this.lastPositionAbs.top;return a!=0&&(a>0?"down":"up")},_getDragHorizontalDirection:function(){var a=this.positionAbs.left-this.lastPositionAbs.left;return a!=0&&(a>0?"right":"left")},refresh:function(a){return this._refreshItems(a),this.refreshPositions(),this},_connectWith:function(){var a=this.options;return a.connectWith.constructor==String?[a.connectWith]:a.connectWith},_getItemsAsjQuery:function(b){var c=this,d=[],e=[],f=this._connectWith();if(f&&b)for(var g=f.length-1;g>=0;g--){var h=a(f[g]);for(var i=h.length-1;i>=0;i--){var j=a.data(h[i],this.widgetName);j&&j!=this&&!j.options.disabled&&e.push([a.isFunction(j.options.items)?j.options.items.call(j.element):a(j.options.items,j.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),j])}}e.push([a.isFunction(this.options.items)?this.options.items.call(this.element,null,{options:this.options,item:this.currentItem}):a(this.options.items,this.element).not(".ui-sortable-helper").not(".ui-sortable-placeholder"),this]);for(var g=e.length-1;g>=0;g--)e[g][0].each(function(){d.push(this)});return a(d)},_removeCurrentsFromItems:function(){var a=this.currentItem.find(":data("+this.widgetName+"-item)");for(var b=0;b<this.items.length;b++)for(var c=0;c<a.length;c++)a[c]==this.items[b].item[0]&&this.items.splice(b,1)},_refreshItems:function(b){this.items=[],this.containers=[this];var c=this.items,d=this,e=[[a.isFunction(this.options.items)?this.options.items.call(this.element[0],b,{item:this.currentItem}):a(this.options.items,this.element),this]],f=this._connectWith();if(f&&this.ready)for(var g=f.length-1;g>=0;g--){var h=a(f[g]);for(var i=h.length-1;i>=0;i--){var j=a.data(h[i],this.widgetName);j&&j!=this&&!j.options.disabled&&(e.push([a.isFunction(j.options.items)?j.options.items.call(j.element[0],b,{item:this.currentItem}):a(j.options.items,j.element),j]),this.containers.push(j))}}for(var g=e.length-1;g>=0;g--){var k=e[g][1],l=e[g][0];for(var i=0,m=l.length;i<m;i++){var n=a(l[i]);n.data(this.widgetName+"-item",k),c.push({item:n,instance:k,width:0,height:0,left:0,top:0})}}},refreshPositions:function(b){this.offsetParent&&this.helper&&(this.offset.parent=this._getParentOffset());for(var c=this.items.length-1;c>=0;c--){var d=this.items[c];if(d.instance!=this.currentContainer&&this.currentContainer&&d.item[0]!=this.currentItem[0])continue;var e=this.options.toleranceElement?a(this.options.toleranceElement,d.item):d.item;b||(d.width=e.outerWidth(),d.height=e.outerHeight());var f=e.offset();d.left=f.left,d.top=f.top}if(this.options.custom&&this.options.custom.refreshContainers)this.options.custom.refreshContainers.call(this);else for(var c=this.containers.length-1;c>=0;c--){var f=this.containers[c].element.offset();this.containers[c].containerCache.left=f.left,this.containers[c].containerCache.top=f.top,this.containers[c].containerCache.width=this.containers[c].element.outerWidth(),this.containers[c].containerCache.height=this.containers[c].element.outerHeight()}return this},_createPlaceholder:function(b){var c=b||this,d=c.options;if(!d.placeholder||d.placeholder.constructor==String){var e=d.placeholder;d.placeholder={element:function(){var b=a(document.createElement(c.currentItem[0].nodeName)).addClass(e||c.currentItem[0].className+" ui-sortable-placeholder").removeClass("ui-sortable-helper")[0];return e||(b.style.visibility="hidden"),b},update:function(a,b){if(e&&!d.forcePlaceholderSize)return;b.height()||b.height(c.currentItem.innerHeight()-parseInt(c.currentItem.css("paddingTop")||0,10)-parseInt(c.currentItem.css("paddingBottom")||0,10)),b.width()||b.width(c.currentItem.innerWidth()-parseInt(c.currentItem.css("paddingLeft")||0,10)-parseInt(c.currentItem.css("paddingRight")||0,10))}}}c.placeholder=a(d.placeholder.element.call(c.element,c.currentItem)),c.currentItem.after(c.placeholder),d.placeholder.update(c,c.placeholder)},_contactContainers:function(b){var c=null,d=null;for(var e=this.containers.length-1;e>=0;e--){if(a.ui.contains(this.currentItem[0],this.containers[e].element[0]))continue;if(this._intersectsWith(this.containers[e].containerCache)){if(c&&a.ui.contains(this.containers[e].element[0],c.element[0]))continue;c=this.containers[e],d=e}else this.containers[e].containerCache.over&&(this.containers[e]._trigger("out",b,this._uiHash(this)),this.containers[e].containerCache.over=0)}if(!c)return;if(this.containers.length===1)this.containers[d]._trigger("over",b,this._uiHash(this)),this.containers[d].containerCache.over=1;else if(this.currentContainer!=this.containers[d]){var f=1e4,g=null,h=this.positionAbs[this.containers[d].floating?"left":"top"];for(var i=this.items.length-1;i>=0;i--){if(!a.ui.contains(this.containers[d].element[0],this.items[i].item[0]))continue;var j=this.items[i][this.containers[d].floating?"left":"top"];Math.abs(j-h)<f&&(f=Math.abs(j-h),g=this.items[i])}if(!g&&!this.options.dropOnEmpty)return;this.currentContainer=this.containers[d],g?this._rearrange(b,g,null,!0):this._rearrange(b,null,this.containers[d].element,!0),this._trigger("change",b,this._uiHash()),this.containers[d]._trigger("change",b,this._uiHash(this)),this.options.placeholder.update(this.currentContainer,this.placeholder),this.containers[d]._trigger("over",b,this._uiHash(this)),this.containers[d].containerCache.over=1}},_createHelper:function(b){var c=this.options,d=a.isFunction(c.helper)?a(c.helper.apply(this.element[0],[b,this.currentItem])):c.helper=="clone"?this.currentItem.clone():this.currentItem;return d.parents("body").length||a(c.appendTo!="parent"?c.appendTo:this.currentItem[0].parentNode)[0].appendChild(d[0]),d[0]==this.currentItem[0]&&(this._storedCSS={width:this.currentItem[0].style.width,height:this.currentItem[0].style.height,position:this.currentItem.css("position"),top:this.currentItem.css("top"),left:this.currentItem.css("left")}),(d[0].style.width==""||c.forceHelperSize)&&d.width(this.currentItem.width()),(d[0].style.height==""||c.forceHelperSize)&&d.height(this.currentItem.height()),d},_adjustOffsetFromHelper:function(b){typeof b=="string"&&(b=b.split(" ")),a.isArray(b)&&(b={left:+b[0],top:+b[1]||0}),"left"in b&&(this.offset.click.left=b.left+this.margins.left),"right"in b&&(this.offset.click.left=this.helperProportions.width-b.right+this.margins.left),"top"in b&&(this.offset.click.top=b.top+this.margins.top),"bottom"in b&&(this.offset.click.top=this.helperProportions.height-b.bottom+this.margins.top)},_getParentOffset:function(){this.offsetParent=this.helper.offsetParent();var b=this.offsetParent.offset();this.cssPosition=="absolute"&&this.scrollParent[0]!=document&&a.ui.contains(this.scrollParent[0],this.offsetParent[0])&&(b.left+=this.scrollParent.scrollLeft(),b.top+=this.scrollParent.scrollTop());if(this.offsetParent[0]==document.body||this.offsetParent[0].tagName&&this.offsetParent[0].tagName.toLowerCase()=="html"&&a.browser.msie)b={top:0,left:0};return{top:b.top+(parseInt(this.offsetParent.css("borderTopWidth"),10)||0),left:b.left+(parseInt(this.offsetParent.css("borderLeftWidth"),10)||0)}},_getRelativeOffset:function(){if(this.cssPosition=="relative"){var a=this.currentItem.position();return{top:a.top-(parseInt(this.helper.css("top"),10)||0)+this.scrollParent.scrollTop(),left:a.left-(parseInt(this.helper.css("left"),10)||0)+this.scrollParent.scrollLeft()}}return{top:0,left:0}},_cacheMargins:function(){this.margins={left:parseInt(this.currentItem.css("marginLeft"),10)||0,top:parseInt(this.currentItem.css("marginTop"),10)||0}},_cacheHelperProportions:function(){this.helperProportions={width:this.helper.outerWidth(),height:this.helper.outerHeight()}},_setContainment:function(){var b=this.options;b.containment=="parent"&&(b.containment=this.helper[0].parentNode);if(b.containment=="document"||b.containment=="window")this.containment=[0-this.offset.relative.left-this.offset.parent.left,0-this.offset.relative.top-this.offset.parent.top,a(b.containment=="document"?document:window).width()-this.helperProportions.width-this.margins.left,(a(b.containment=="document"?document:window).height()||document.body.parentNode.scrollHeight)-this.helperProportions.height-this.margins.top];if(!/^(document|window|parent)$/.test(b.containment)){var c=a(b.containment)[0],d=a(b.containment).offset(),e=a(c).css("overflow")!="hidden";this.containment=[d.left+(parseInt(a(c).css("borderLeftWidth"),10)||0)+(parseInt(a(c).css("paddingLeft"),10)||0)-this.margins.left,d.top+(parseInt(a(c).css("borderTopWidth"),10)||0)+(parseInt(a(c).css("paddingTop"),10)||0)-this.margins.top,d.left+(e?Math.max(c.scrollWidth,c.offsetWidth):c.offsetWidth)-(parseInt(a(c).css("borderLeftWidth"),10)||0)-(parseInt(a(c).css("paddingRight"),10)||0)-this.helperProportions.width-this.margins.left,d.top+(e?Math.max(c.scrollHeight,c.offsetHeight):c.offsetHeight)-(parseInt(a(c).css("borderTopWidth"),10)||0)-(parseInt(a(c).css("paddingBottom"),10)||0)-this.helperProportions.height-this.margins.top]}},_convertPositionTo:function(b,c){c||(c=this.position);var d=b=="absolute"?1:-1,e=this.options,f=this.cssPosition=="absolute"&&(this.scrollParent[0]==document||!a.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,g=/(html|body)/i.test(f[0].tagName);return{top:c.top+this.offset.relative.top*d+this.offset.parent.top*d-(a.browser.safari&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollTop():g?0:f.scrollTop())*d),left:c.left+this.offset.relative.left*d+this.offset.parent.left*d-(a.browser.safari&&this.cssPosition=="fixed"?0:(this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():g?0:f.scrollLeft())*d)}},_generatePosition:function(b){var c=this.options,d=this.cssPosition=="absolute"&&(this.scrollParent[0]==document||!a.ui.contains(this.scrollParent[0],this.offsetParent[0]))?this.offsetParent:this.scrollParent,e=/(html|body)/i.test(d[0].tagName);this.cssPosition=="relative"&&(this.scrollParent[0]==document||this.scrollParent[0]==this.offsetParent[0])&&(this.offset.relative=this._getRelativeOffset());var f=b.pageX,g=b.pageY;if(this.originalPosition){this.containment&&(b.pageX-this.offset.click.left<this.containment[0]&&(f=this.containment[0]+this.offset.click.left),b.pageY-this.offset.click.top<this.containment[1]&&(g=this.containment[1]+this.offset.click.top),b.pageX-this.offset.click.left>this.containment[2]&&(f=this.containment[2]+this.offset.click.left),b.pageY-this.offset.click.top>this.containment[3]&&(g=this.containment[3]+this.offset.click.top));if(c.grid){var h=this.originalPageY+Math.round((g-this.originalPageY)/c.grid[1])*c.grid[1];g=this.containment?h-this.offset.click.top<this.containment[1]||h-this.offset.click.top>this.containment[3]?h-this.offset.click.top<this.containment[1]?h+c.grid[1]:h-c.grid[1]:h:h;var i=this.originalPageX+Math.round((f-this.originalPageX)/c.grid[0])*c.grid[0];f=this.containment?i-this.offset.click.left<this.containment[0]||i-this.offset.click.left>this.containment[2]?i-this.offset.click.left<this.containment[0]?i+c.grid[0]:i-c.grid[0]:i:i}}return{top:g-this.offset.click.top-this.offset.relative.top-this.offset.parent.top+(a.browser.safari&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollTop():e?0:d.scrollTop()),left:f-this.offset.click.left-this.offset.relative.left-this.offset.parent.left+(a.browser.safari&&this.cssPosition=="fixed"?0:this.cssPosition=="fixed"?-this.scrollParent.scrollLeft():e?0:d.scrollLeft())}},_rearrange:function(a,b,c,d){c?c[0].appendChild(this.placeholder[0]):b.item[0].parentNode.insertBefore(this.placeholder[0],this.direction=="down"?b.item[0]:b.item[0].nextSibling),this.counter=this.counter?++this.counter:1;var e=this,f=this.counter;window.setTimeout(function(){f==e.counter&&e.refreshPositions(!d)},0)},_clear:function(b,c){this.reverting=!1;var d=[],e=this;!this._noFinalSort&&this.currentItem.parent().length&&this.placeholder.before(this.currentItem),this._noFinalSort=null;if(this.helper[0]==this.currentItem[0]){for(var f in this._storedCSS)if(this._storedCSS[f]=="auto"||this._storedCSS[f]=="static")this._storedCSS[f]="";this.currentItem.css(this._storedCSS).removeClass("ui-sortable-helper")}else this.currentItem.show();this.fromOutside&&!c&&d.push(function(a){this._trigger("receive",a,this._uiHash(this.fromOutside))}),(this.fromOutside||this.domPosition.prev!=this.currentItem.prev().not(".ui-sortable-helper")[0]||this.domPosition.parent!=this.currentItem.parent()[0])&&!c&&d.push(function(a){this._trigger("update",a,this._uiHash())});if(!a.ui.contains(this.element[0],this.currentItem[0])){c||d.push(function(a){this._trigger("remove",a,this._uiHash())});for(var f=this.containers.length-1;f>=0;f--)a.ui.contains(this.containers[f].element[0],this.currentItem[0])&&!c&&(d.push(function(a){return function(b){a._trigger("receive",b,this._uiHash(this))}}.call(this,this.containers[f])),d.push(function(a){return function(b){a._trigger("update",b,this._uiHash(this))}}.call(this,this.containers[f])))}for(var f=this.containers.length-1;f>=0;f--)c||d.push(function(a){return function(b){a._trigger("deactivate",b,this._uiHash(this))}}.call(this,this.containers[f])),this.containers[f].containerCache.over&&(d.push(function(a){return function(b){a._trigger("out",b,this._uiHash(this))}}.call(this,this.containers[f])),this.containers[f].containerCache.over=0);this._storedCursor&&a("body").css("cursor",this._storedCursor),this._storedOpacity&&this.helper.css("opacity",this._storedOpacity),this._storedZIndex&&this.helper.css("zIndex",this._storedZIndex=="auto"?"":this._storedZIndex),this.dragging=!1;if(this.cancelHelperRemoval){if(!c){this._trigger("beforeStop",b,this._uiHash());for(var f=0;f<d.length;f++)d[f].call(this,b);this._trigger("stop",b,this._uiHash())}return!1}c||this._trigger("beforeStop",b,this._uiHash()),this.placeholder[0].parentNode.removeChild(this.placeholder[0]),this.helper[0]!=this.currentItem[0]&&this.helper.remove(),this.helper=null;if(!c){for(var f=0;f<d.length;f++)d[f].call(this,b);this._trigger("stop",b,this._uiHash())}return this.fromOutside=!1,!0},_trigger:function(){a.Widget.prototype._trigger.apply(this,arguments)===!1&&this.cancel()},_uiHash:function(b){var c=b||this;return{helper:c.helper,placeholder:c.placeholder||a([]),position:c.position,originalPosition:c.originalPosition,offset:c.positionAbs,item:c.currentItem,sender:b?b.element:null}}}),a.extend(a.ui.sortable,{version:"1.8.20"})})(jQuery);;
;
/*!
 * jQuery Cookie Plugin
 * https://github.com/carhartl/jquery-cookie
 *
 * Copyright 2011, Klaus Hartl
 * Dual licensed under the MIT or GPL Version 2 licenses.
 * http://www.opensource.org/licenses/mit-license.php
 * http://www.opensource.org/licenses/GPL-2.0
 */
(function($) {
    $.cookie = function(key, value, options) {

        // key and at least value given, set cookie...
        if (arguments.length > 1 && (!/Object/.test(Object.prototype.toString.call(value)) || value === null || value === undefined)) {
            options = $.extend({}, options);

            if (value === null || value === undefined) {
                options.expires = -1;
            }

            if (typeof options.expires === 'number') {
                var days = options.expires, t = options.expires = new Date();
                t.setDate(t.getDate() + days);
            }

            value = String(value);

            return (document.cookie = [
                encodeURIComponent(key), '=', options.raw ? value : encodeURIComponent(value),
                options.expires ? '; expires=' + options.expires.toUTCString() : '', // use expires attribute, max-age is not supported by IE
                options.path    ? '; path=' + options.path : '',
                options.domain  ? '; domain=' + options.domain : '',
                options.secure  ? '; secure' : ''
            ].join(''));
        }

        // key and possibly options given, get cookie...
        options = value || {};
        var decode = options.raw ? function(s) { return s; } : decodeURIComponent;

        var pairs = document.cookie.split('; ');
        for (var i = 0, pair; pair = pairs[i] && pairs[i].split('='); i++) {
            if (decode(pair[0]) === key) return decode(pair[1] || ''); // IE saves cookies with empty string as "c; ", e.g. without "=" as opposed to EOMB, thus pair[1] may be undefined
        }
        return null;
    };
})(jQuery);
;
define("ace/keyboard/keybinding/vim",["require","exports","module","ace/keyboard/state_handler"],function(a,b,c){"use strict";var d=a("../state_handler").StateHandler,e=a("../state_handler").matchCharacterOnly,f=function(a,b,c){return{regex:["([0-9]*)",a],exec:b,params:[{name:"times",match:1,type:"number",defaultValue:1}],then:c}},g={start:[{key:"i",then:"insertMode"},{key:"d",then:"deleteMode"},{key:"a",exec:"gotoright",then:"insertMode"},{key:"shift-i",exec:"gotolinestart",then:"insertMode"},{key:"shift-a",exec:"gotolineend",then:"insertMode"},{key:"shift-c",exec:"removetolineend",then:"insertMode"},{key:"shift-r",exec:"overwrite",then:"replaceMode"},f("(k|up)","golineup"),f("(j|down)","golinedown"),f("(l|right)","gotoright"),f("(h|left)","gotoleft"),{key:"shift-g",exec:"gotoend"},f("b","gotowordleft"),f("e","gotowordright"),f("x","del"),f("shift-x","backspace"),f("shift-d","removetolineend"),f("u","undo"),{comment:"Catch some keyboard input to stop it here",match:e}],insertMode:[{key:"esc",then:"start"}],replaceMode:[{key:"esc",exec:"overwrite",then:"start"}],deleteMode:[{key:"d",exec:"removeline",then:"start"}]};b.Vim=new d(g)})
;
define("ace/mode/html",["require","exports","module","ace/lib/oop","ace/mode/text","ace/mode/javascript","ace/mode/css","ace/tokenizer","ace/mode/html_highlight_rules","ace/mode/behaviour/xml","ace/mode/folding/html"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text").Mode,f=a("./javascript").Mode,g=a("./css").Mode,h=a("../tokenizer").Tokenizer,i=a("./html_highlight_rules").HtmlHighlightRules,j=a("./behaviour/xml").XmlBehaviour,k=a("./folding/html").FoldMode,l=function(){var a=new i;this.$tokenizer=new h(a.getRules()),this.$behaviour=new j,this.$embeds=a.getEmbeds(),this.createModeDelegates({"js-":f,"css-":g}),this.foldingRules=new k};d.inherits(l,e),function(){this.toggleCommentLines=function(a,b,c,d){return 0},this.getNextLineIndent=function(a,b,c){return this.$getIndent(b)},this.checkOutdent=function(a,b,c){return!1}}.call(l.prototype),b.Mode=l}),define("ace/mode/javascript",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/javascript_highlight_rules","ace/mode/matching_brace_outdent","ace/range","ace/worker/worker_client","ace/mode/behaviour/cstyle","ace/mode/folding/cstyle"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text").Mode,f=a("../tokenizer").Tokenizer,g=a("./javascript_highlight_rules").JavaScriptHighlightRules,h=a("./matching_brace_outdent").MatchingBraceOutdent,i=a("../range").Range,j=a("../worker/worker_client").WorkerClient,k=a("./behaviour/cstyle").CstyleBehaviour,l=a("./folding/cstyle").FoldMode,m=function(){this.$tokenizer=new f((new g).getRules()),this.$outdent=new h,this.$behaviour=new k,this.foldingRules=new l};d.inherits(m,e),function(){this.toggleCommentLines=function(a,b,c,d){var e=!0,f=/^(\s*)\/\//;for(var g=c;g<=d;g++)if(!f.test(b.getLine(g))){e=!1;break}if(e){var h=new i(0,0,0,0);for(var g=c;g<=d;g++){var j=b.getLine(g),k=j.match(f);h.start.row=g,h.end.row=g,h.end.column=k[0].length,b.replace(h,k[1])}}else b.indentRows(c,d,"//")},this.getNextLineIndent=function(a,b,c){var d=this.$getIndent(b),e=this.$tokenizer.getLineTokens(b,a),f=e.tokens,g=e.state;if(f.length&&f[f.length-1].type=="comment")return d;if(a=="start"||a=="regex_allowed"){var h=b.match(/^.*(?:\bcase\b.*\:|[\{\(\[])\s*$/);h&&(d+=c)}else if(a=="doc-start"){if(g=="start"||a=="regex_allowed")return"";var h=b.match(/^\s*(\/?)\*/);h&&(h[1]&&(d+=" "),d+="* ")}return d},this.checkOutdent=function(a,b,c){return this.$outdent.checkOutdent(b,c)},this.autoOutdent=function(a,b,c){this.$outdent.autoOutdent(b,c)},this.createWorker=function(a){var b=new j(["ace"],"worker-javascript.js","ace/mode/javascript_worker","JavaScriptWorker");return b.attachToDocument(a.getDocument()),b.on("jslint",function(b){var c=[];for(var d=0;d<b.data.length;d++){var e=b.data[d];e&&c.push({row:e.line-1,column:e.character-1,text:e.reason,type:"warning",lint:e})}a.setAnnotations(c)}),b.on("narcissus",function(b){a.setAnnotations([b.data])}),b.on("terminate",function(){a.clearAnnotations()}),b}}.call(m.prototype),b.Mode=m}),define("ace/mode/javascript_highlight_rules",["require","exports","module","ace/lib/oop","ace/lib/lang","ace/unicode","ace/mode/doc_comment_highlight_rules","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../lib/lang"),f=a("../unicode"),g=a("./doc_comment_highlight_rules").DocCommentHighlightRules,h=a("./text_highlight_rules").TextHighlightRules,i=function(){var a=e.arrayToMap("Array|Boolean|Date|Function|Iterator|Number|Object|RegExp|String|Proxy|Namespace|QName|XML|XMLList|ArrayBuffer|Float32Array|Float64Array|Int16Array|Int32Array|Int8Array|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|Error|EvalError|InternalError|RangeError|ReferenceError|StopIteration|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt|JSON|Math|this|arguments|prototype|window|document".split("|")),b=e.arrayToMap("break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|throw|try|typeof|let|var|while|with|const|yield|import|get|set".split("|")),c="case|do|else|finally|in|instanceof|return|throw|try|typeof|yield",d=e.arrayToMap("__parent__|__count__|escape|unescape|with|__proto__".split("|")),h=e.arrayToMap("const|let|var|function".split("|")),i=e.arrayToMap("null|Infinity|NaN|undefined".split("|")),j=e.arrayToMap("class|enum|extends|super|export|implements|private|public|interface|package|protected|static".split("|")),k="["+f.packages.L+"\\$_]["+f.packages.L+f.packages.Mn+f.packages.Mc+f.packages.Nd+f.packages.Pc+"\\$_]*\\b",l="\\\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[0-2][0-7]{0,2}|3[0-6][0-7]?|37[0-7]?|[4-7][0-7]?|.)";this.$rules={start:[{token:"comment",regex:/\/\/.*$/},g.getStartRule("doc-start"),{token:"comment",merge:!0,regex:/\/\*/,next:"comment"},{token:"string",regex:"'(?=.)",next:"qstring"},{token:"string",regex:'"(?=.)',next:"qqstring"},{token:"constant.numeric",regex:/0[xX][0-9a-fA-F]+\b/},{token:"constant.numeric",regex:/[+-]?\d+(?:(?:\.\d*)?(?:[eE][+-]?\d+)?)?\b/},{token:["storage.type","punctuation.operator","support.function","punctuation.operator","entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\.)(prototype)(\\.)("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["storage.type","punctuation.operator","support.function","punctuation.operator","entity.name.function","text","keyword.operator","text"],regex:"("+k+")(\\.)(prototype)(\\.)("+k+")(\\s*)(=)(\\s*)",next:"function_arguments"},{token:["storage.type","punctuation.operator","entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\.)("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["storage.type","text","entity.name.function","text","paren.lparen"],regex:"(function)(\\s+)("+k+")(\\s*)(\\()",next:"function_arguments"},{token:["entity.name.function","text","punctuation.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\s*)(:)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["text","text","storage.type","text","paren.lparen"],regex:"(:)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:"constant.language.boolean",regex:/(?:true|false)\b/},{token:"keyword",regex:"(?:"+c+")\\b",next:"regex_allowed"},{token:["punctuation.operator","support.function"],regex:/(\.)(s(?:h(?:ift|ow(?:Mod(?:elessDialog|alDialog)|Help))|croll(?:X|By(?:Pages|Lines)?|Y|To)?|t(?:opzzzz|rike)|i(?:n|zeToContent|debar|gnText)|ort|u(?:p|b(?:str(?:ing)?)?)|pli(?:ce|t)|e(?:nd|t(?:Re(?:sizable|questHeader)|M(?:i(?:nutes|lliseconds)|onth)|Seconds|Ho(?:tKeys|urs)|Year|Cursor|Time(?:out)?|Interval|ZOptions|Date|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Date|FullYear)|FullYear|Active)|arch)|qrt|lice|avePreferences|mall)|h(?:ome|andleEvent)|navigate|c(?:har(?:CodeAt|At)|o(?:s|n(?:cat|textual|firm)|mpile)|eil|lear(?:Timeout|Interval)?|a(?:ptureEvents|ll)|reate(?:StyleSheet|Popup|EventObject))|t(?:o(?:GMTString|S(?:tring|ource)|U(?:TCString|pperCase)|Lo(?:caleString|werCase))|est|a(?:n|int(?:Enabled)?))|i(?:s(?:NaN|Finite)|ndexOf|talics)|d(?:isableExternalCapture|ump|etachEvent)|u(?:n(?:shift|taint|escape|watch)|pdateCommands)|j(?:oin|avaEnabled)|p(?:o(?:p|w)|ush|lugins.refresh|a(?:ddings|rse(?:Int|Float)?)|r(?:int|ompt|eference))|e(?:scape|nableExternalCapture|val|lementFromPoint|x(?:p|ec(?:Script|Command)?))|valueOf|UTC|queryCommand(?:State|Indeterm|Enabled|Value)|f(?:i(?:nd|le(?:ModifiedDate|Size|CreatedDate|UpdatedDate)|xed)|o(?:nt(?:size|color)|rward)|loor|romCharCode)|watch|l(?:ink|o(?:ad|g)|astIndexOf)|a(?:sin|nchor|cos|t(?:tachEvent|ob|an(?:2)?)|pply|lert|b(?:s|ort))|r(?:ou(?:nd|teEvents)|e(?:size(?:By|To)|calc|turnValue|place|verse|l(?:oad|ease(?:Capture|Events)))|andom)|g(?:o|et(?:ResponseHeader|M(?:i(?:nutes|lliseconds)|onth)|Se(?:conds|lection)|Hours|Year|Time(?:zoneOffset)?|Da(?:y|te)|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Da(?:y|te)|FullYear)|FullYear|A(?:ttention|llResponseHeaders)))|m(?:in|ove(?:B(?:y|elow)|To(?:Absolute)?|Above)|ergeAttributes|a(?:tch|rgins|x))|b(?:toa|ig|o(?:ld|rderWidths)|link|ack))\b(?=\()/},{token:["punctuation.operator","support.function.dom"],regex:/(\.)(s(?:ub(?:stringData|mit)|plitText|e(?:t(?:NamedItem|Attribute(?:Node)?)|lect))|has(?:ChildNodes|Feature)|namedItem|c(?:l(?:ick|o(?:se|neNode))|reate(?:C(?:omment|DATASection|aption)|T(?:Head|extNode|Foot)|DocumentFragment|ProcessingInstruction|E(?:ntityReference|lement)|Attribute))|tabIndex|i(?:nsert(?:Row|Before|Cell|Data)|tem)|open|delete(?:Row|C(?:ell|aption)|T(?:Head|Foot)|Data)|focus|write(?:ln)?|a(?:dd|ppend(?:Child|Data))|re(?:set|place(?:Child|Data)|move(?:NamedItem|Child|Attribute(?:Node)?)?)|get(?:NamedItem|Element(?:sBy(?:Name|TagName)|ById)|Attribute(?:Node)?)|blur)\b(?=\()/},{token:["punctuation.operator","support.constant"],regex:/(\.)(s(?:ystemLanguage|cr(?:ipts|ollbars|een(?:X|Y|Top|Left))|t(?:yle(?:Sheets)?|atus(?:Text|bar)?)|ibling(?:Below|Above)|ource|uffixes|e(?:curity(?:Policy)?|l(?:ection|f)))|h(?:istory|ost(?:name)?|as(?:h|Focus))|y|X(?:MLDocument|SLDocument)|n(?:ext|ame(?:space(?:s|URI)|Prop))|M(?:IN_VALUE|AX_VALUE)|c(?:haracterSet|o(?:n(?:structor|trollers)|okieEnabled|lorDepth|mp(?:onents|lete))|urrent|puClass|l(?:i(?:p(?:boardData)?|entInformation)|osed|asses)|alle(?:e|r)|rypto)|t(?:o(?:olbar|p)|ext(?:Transform|Indent|Decoration|Align)|ags)|SQRT(?:1_2|2)|i(?:n(?:ner(?:Height|Width)|put)|ds|gnoreCase)|zIndex|o(?:scpu|n(?:readystatechange|Line)|uter(?:Height|Width)|p(?:sProfile|ener)|ffscreenBuffering)|NEGATIVE_INFINITY|d(?:i(?:splay|alog(?:Height|Top|Width|Left|Arguments)|rectories)|e(?:scription|fault(?:Status|Ch(?:ecked|arset)|View)))|u(?:ser(?:Profile|Language|Agent)|n(?:iqueID|defined)|pdateInterval)|_content|p(?:ixelDepth|ort|ersonalbar|kcs11|l(?:ugins|atform)|a(?:thname|dding(?:Right|Bottom|Top|Left)|rent(?:Window|Layer)?|ge(?:X(?:Offset)?|Y(?:Offset)?))|r(?:o(?:to(?:col|type)|duct(?:Sub)?|mpter)|e(?:vious|fix)))|e(?:n(?:coding|abledPlugin)|x(?:ternal|pando)|mbeds)|v(?:isibility|endor(?:Sub)?|Linkcolor)|URLUnencoded|P(?:I|OSITIVE_INFINITY)|f(?:ilename|o(?:nt(?:Size|Family|Weight)|rmName)|rame(?:s|Element)|gColor)|E|whiteSpace|l(?:i(?:stStyleType|n(?:eHeight|kColor))|o(?:ca(?:tion(?:bar)?|lName)|wsrc)|e(?:ngth|ft(?:Context)?)|a(?:st(?:M(?:odified|atch)|Index|Paren)|yer(?:s|X)|nguage))|a(?:pp(?:MinorVersion|Name|Co(?:deName|re)|Version)|vail(?:Height|Top|Width|Left)|ll|r(?:ity|guments)|Linkcolor|bove)|r(?:ight(?:Context)?|e(?:sponse(?:XML|Text)|adyState))|global|x|m(?:imeTypes|ultiline|enubar|argin(?:Right|Bottom|Top|Left))|L(?:N(?:10|2)|OG(?:10E|2E))|b(?:o(?:ttom|rder(?:Width|RightWidth|BottomWidth|Style|Color|TopWidth|LeftWidth))|ufferDepth|elow|ackground(?:Color|Image)))\b/},{token:["storage.type","punctuation.operator","support.function.firebug"],regex:/(console)(\.)(warn|info|log|error|time|timeEnd|assert)\b/},{token:function(c){return a.hasOwnProperty(c)?"variable.language":d.hasOwnProperty(c)?"invalid.deprecated":h.hasOwnProperty(c)?"storage.type":b.hasOwnProperty(c)?"keyword":i.hasOwnProperty(c)?"constant.language":j.hasOwnProperty(c)?"invalid.illegal":c=="debugger"?"invalid.deprecated":"identifier"},regex:k},{token:"keyword.operator",regex:/!|\$|%|&|\*|\-\-|\-|\+\+|\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\|\||\?\:|\*=|%=|\+=|\-=|&=|\^=|\b(?:in|instanceof|new|delete|typeof|void)/,next:"regex_allowed"},{token:"punctuation.operator",regex:/\?|\:|\,|\;|\./,next:"regex_allowed"},{token:"paren.lparen",regex:/[\[({]/,next:"regex_allowed"},{token:"paren.rparen",regex:/[\])}]/},{token:"keyword.operator",regex:/\/=?/,next:"regex_allowed"},{token:"comment",regex:/^#!.*$/},{token:"text",regex:/\s+/}],regex_allowed:[g.getStartRule("doc-start"),{token:"comment",merge:!0,regex:"\\/\\*",next:"comment_regex_allowed"},{token:"comment",regex:"\\/\\/.*$"},{token:"string.regexp",regex:"\\/",next:"regex",merge:!0},{token:"text",regex:"\\s+"},{token:"empty",regex:"",next:"start"}],regex:[{token:"regexp.keyword.operator",regex:"\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"},{token:"string.regexp",regex:"/\\w*",next:"start",merge:!0},{token:"string.regexp",regex:"[^\\\\/\\[]+",merge:!0},{token:"string.regexp.charachterclass",regex:"\\[",next:"regex_character_class",merge:!0},{token:"empty",regex:"",next:"start"}],regex_character_class:[{token:"regexp.keyword.operator",regex:"\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"},{token:"string.regexp.charachterclass",regex:"]",next:"regex",merge:!0},{token:"string.regexp.charachterclass",regex:"[^\\\\\\]]+",merge:!0},{token:"empty",regex:"",next:"start"}],function_arguments:[{token:"variable.parameter",regex:k},{token:"punctuation.operator",regex:"[, ]+",merge:!0},{token:"punctuation.operator",regex:"$",merge:!0},{token:"empty",regex:"",next:"start"}],comment_regex_allowed:[{token:"comment",regex:".*?\\*\\/",merge:!0,next:"regex_allowed"},{token:"comment",merge:!0,regex:".+"}],comment:[{token:"comment",regex:".*?\\*\\/",merge:!0,next:"start"},{token:"comment",merge:!0,regex:".+"}],qqstring:[{token:"constant.language.escape",regex:l},{token:"string",regex:'[^"\\\\]+',merge:!0},{token:"string",regex:"\\\\$",next:"qqstring",merge:!0},{token:"string",regex:'"|$',next:"start",merge:!0}],qstring:[{token:"constant.language.escape",regex:l},{token:"string",regex:"[^'\\\\]+",merge:!0},{token:"string",regex:"\\\\$",next:"qstring",merge:!0},{token:"string",regex:"'|$",next:"start",merge:!0}]},this.embedRules(g,"doc-",[g.getEndRule("start")])};d.inherits(i,h),b.JavaScriptHighlightRules=i}),define("ace/mode/doc_comment_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text_highlight_rules").TextHighlightRules,f=function(){this.$rules={start:[{token:"comment.doc.tag",regex:"@[\\w\\d_]+"},{token:"comment.doc",merge:!0,regex:"\\s+"},{token:"comment.doc",merge:!0,regex:"TODO"},{token:"comment.doc",merge:!0,regex:"[^@\\*]+"},{token:"comment.doc",merge:!0,regex:"."}]}};d.inherits(f,e),f.getStartRule=function(a){return{token:"comment.doc",merge:!0,regex:"\\/\\*(?=\\*)",next:a}},f.getEndRule=function(a){return{token:"comment.doc",merge:!0,regex:"\\*\\/",next:a}},b.DocCommentHighlightRules=f}),define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"],function(a,b,c){"use strict";var d=a("../range").Range,e=function(){};(function(){this.checkOutdent=function(a,b){return/^\s+$/.test(a)?/^\s*\}/.test(b):!1},this.autoOutdent=function(a,b){var c=a.getLine(b),e=c.match(/^(\s*\})/);if(!e)return 0;var f=e[1].length,g=a.findMatchingBracket({row:b,column:f});if(!g||g.row==b)return 0;var h=this.$getIndent(a.getLine(g.row));a.replace(new d(b,0,b,f-1),h)},this.$getIndent=function(a){var b=a.match(/^(\s+)/);return b?b[1]:""}}).call(e.prototype),b.MatchingBraceOutdent=e}),define("ace/mode/behaviour/cstyle",["require","exports","module","ace/lib/oop","ace/mode/behaviour"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../behaviour").Behaviour,f=function(){this.add("braces","insertion",function(a,b,c,d,e){if(e=="{"){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"{"+g+"}",selection:!1}:{text:"{}",selection:[1,1]}}if(e=="}"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var k=d.$findOpeningBracket("}",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}else if(e=="\n"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var l=d.findMatchingBracket({row:h.row,column:h.column+1});if(!l)return null;var m=this.getNextLineIndent(a,i.substring(0,i.length-1),d.getTabString()),n=this.$getIndent(d.doc.getLine(l.row));return{text:"\n"+m+"\n"+n,selection:[1,m.length,1,m.length]}}}}),this.add("braces","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="{"){var g=d.doc.getLine(e.start.row),h=g.substring(e.end.column,e.end.column+1);if(h=="}")return e.end.column++,e}}),this.add("parens","insertion",function(a,b,c,d,e){if(e=="("){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"("+g+")",selection:!1}:{text:"()",selection:[1,1]}}if(e==")"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j==")"){var k=d.$findOpeningBracket(")",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}}),this.add("parens","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="("){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h==")")return e.end.column++,e}}),this.add("string_dquotes","insertion",function(a,b,c,d,e){if(e=='"'||e=="'"){var f=e,g=c.getSelectionRange(),h=d.doc.getTextRange(g);if(h!=="")return{text:f+h+f,selection:!1};var i=c.getCursorPosition(),j=d.doc.getLine(i.row),k=j.substring(i.column-1,i.column);if(k=="\\")return null;var l=d.getTokens(g.start.row,g.start.row)[0].tokens,m=0,n,o=-1;for(var p=0;p<l.length;p++){n=l[p],n.type=="string"?o=-1:o<0&&(o=n.value.indexOf(f));if(n.value.length+m>g.start.column)break;m+=l[p].value.length}if(!n||o<0&&n.type!=="comment"&&(n.type!=="string"||g.start.column!==n.value.length+m-1&&n.value.lastIndexOf(f)===n.value.length-1))return{text:f+f,selection:[1,1]};if(n&&n.type==="string"){var q=j.substring(i.column,i.column+1);if(q==f)return{text:"",selection:[1,1]}}}}),this.add("string_dquotes","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&(f=='"'||f=="'")){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h=='"')return e.end.column++,e}})};d.inherits(f,e),b.CstyleBehaviour=f}),define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../../range").Range,f=a("./fold_mode").FoldMode,g=b.FoldMode=function(){};d.inherits(g,f),function(){this.foldingStartMarker=/(\{|\[)[^\}\]]*$|^\s*(\/\*)/,this.foldingStopMarker=/^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/,this.getFoldWidgetRange=function(a,b,c){var d=a.getLine(c),f=d.match(this.foldingStartMarker);if(f){var g=f.index;if(f[1])return this.openingBracketBlock(a,f[1],c,g);var h=a.getCommentFoldRange(c,g+f[0].length);return h.end.column-=2,h}if(b!=="markbeginend")return;var f=d.match(this.foldingStopMarker);if(f){var g=f.index+f[0].length;if(f[2]){var h=a.getCommentFoldRange(c,g);return h.end.column-=2,h}var i={row:c,column:g},j=a.$findOpeningBracket(f[1],i);if(!j)return;return j.column++,i.column--,e.fromPoints(j,i)}}}.call(g.prototype)}),define("ace/mode/folding/fold_mode",["require","exports","module","ace/range"],function(a,b,c){"use strict";var d=a("../../range").Range,e=b.FoldMode=function(){};(function(){this.foldingStartMarker=null,this.foldingStopMarker=null,this.getFoldWidget=function(a,b,c){var d=a.getLine(c);return this.foldingStartMarker.test(d)?"start":b=="markbeginend"&&this.foldingStopMarker&&this.foldingStopMarker.test(d)?"end":""},this.getFoldWidgetRange=function(a,b,c){return null},this.indentationBlock=function(a,b,c){var e=/^\s*/,f=b,g=b,h=a.getLine(b),i=c||h.length,j=h.match(e)[0].length,k=a.getLength();while(++b<k){h=a.getLine(b);var l=h.match(e)[0].length;if(l==h.length)continue;if(l<=j)break;g=b}if(g>f){var m=a.getLine(g).length;return new d(f,i,g,m)}},this.openingBracketBlock=function(a,b,c,e){var f={row:c,column:e+1},g=a.$findClosingBracket(b,f);if(!g)return;var h=a.foldWidgets[g.row];return h==null&&(h=this.getFoldWidget(a,g.row)),h=="start"&&(g.row--,g.column=a.getLine(g.row).length),d.fromPoints(f,g)}}).call(e.prototype)}),define("ace/mode/css",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/css_highlight_rules","ace/mode/matching_brace_outdent","ace/worker/worker_client","ace/mode/folding/cstyle"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text").Mode,f=a("../tokenizer").Tokenizer,g=a("./css_highlight_rules").CssHighlightRules,h=a("./matching_brace_outdent").MatchingBraceOutdent,i=a("../worker/worker_client").WorkerClient,j=a("./folding/cstyle").FoldMode,k=function(){this.$tokenizer=new f((new g).getRules(),"i"),this.$outdent=new h,this.foldingRules=new j};d.inherits(k,e),function(){this.foldingRules="cStyle",this.getNextLineIndent=function(a,b,c){var d=this.$getIndent(b),e=this.$tokenizer.getLineTokens(b,a).tokens;if(e.length&&e[e.length-1].type=="comment")return d;var f=b.match(/^.*\{\s*$/);return f&&(d+=c),d},this.checkOutdent=function(a,b,c){return this.$outdent.checkOutdent(b,c)},this.autoOutdent=function(a,b,c){this.$outdent.autoOutdent(b,c)},this.createWorker=function(a){var b=new i(["ace"],"worker-css.js","ace/mode/css_worker","Worker");return b.attachToDocument(a.getDocument()),b.on("csslint",function(b){var c=[];b.data.forEach(function(a){c.push({row:a.line-1,column:a.col-1,text:a.message,type:a.type,lint:a})}),a.setAnnotations(c)}),b}}.call(k.prototype),b.Mode=k}),define("ace/mode/css_highlight_rules",["require","exports","module","ace/lib/oop","ace/lib/lang","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../lib/lang"),f=a("./text_highlight_rules").TextHighlightRules,g=function(){var a=e.arrayToMap("animation-fill-mode|alignment-adjust|alignment-baseline|animation-delay|animation-direction|animation-duration|animation-iteration-count|animation-name|animation-play-state|animation-timing-function|animation|appearance|azimuth|backface-visibility|background-attachment|background-break|background-clip|background-color|background-image|background-origin|background-position|background-repeat|background-size|background|baseline-shift|binding|bleed|bookmark-label|bookmark-level|bookmark-state|bookmark-target|border-bottom|border-bottom-color|border-bottom-left-radius|border-bottom-right-radius|border-bottom-style|border-bottom-width|border-collapse|border-color|border-image|border-image-outset|border-image-repeat|border-image-slice|border-image-source|border-image-width|border-left|border-left-color|border-left-style|border-left-width|border-radius|border-right|border-right-color|border-right-style|border-right-width|border-spacing|border-style|border-top|border-top-color|border-top-left-radius|border-top-right-radius|border-top-style|border-top-width|border-width|border|bottom|box-align|box-decoration-break|box-direction|box-flex-group|box-flex|box-lines|box-ordinal-group|box-orient|box-pack|box-shadow|box-sizing|break-after|break-before|break-inside|caption-side|clear|clip|color-profile|color|column-count|column-fill|column-gap|column-rule|column-rule-color|column-rule-style|column-rule-width|column-span|column-width|columns|content|counter-increment|counter-reset|crop|cue-after|cue-before|cue|cursor|direction|display|dominant-baseline|drop-initial-after-adjust|drop-initial-after-align|drop-initial-before-adjust|drop-initial-before-align|drop-initial-size|drop-initial-value|elevation|empty-cells|fit|fit-position|float-offset|float|font-family|font-size|font-size-adjust|font-stretch|font-style|font-variant|font-weight|font|grid-columns|grid-rows|hanging-punctuation|height|hyphenate-after|hyphenate-before|hyphenate-character|hyphenate-lines|hyphenate-resource|hyphens|icon|image-orientation|image-rendering|image-resolution|inline-box-align|left|letter-spacing|line-height|line-stacking-ruby|line-stacking-shift|line-stacking-strategy|line-stacking|list-style-image|list-style-position|list-style-type|list-style|margin-bottom|margin-left|margin-right|margin-top|margin|mark-after|mark-before|mark|marks|marquee-direction|marquee-play-count|marquee-speed|marquee-style|max-height|max-width|min-height|min-width|move-to|nav-down|nav-index|nav-left|nav-right|nav-up|opacity|orphans|outline-color|outline-offset|outline-style|outline-width|outline|overflow-style|overflow-x|overflow-y|overflow|padding-bottom|padding-left|padding-right|padding-top|padding|page-break-after|page-break-before|page-break-inside|page-policy|page|pause-after|pause-before|pause|perspective-origin|perspective|phonemes|pitch-range|pitch|play-during|position|presentation-level|punctuation-trim|quotes|rendering-intent|resize|rest-after|rest-before|rest|richness|right|rotation-point|rotation|ruby-align|ruby-overhang|ruby-position|ruby-span|size|speak-header|speak-numeral|speak-punctuation|speak|speech-rate|stress|string-set|table-layout|target-name|target-new|target-position|target|text-align-last|text-align|text-decoration|text-emphasis|text-height|text-indent|text-justify|text-outline|text-shadow|text-transform|text-wrap|top|transform-origin|transform-style|transform|transition-delay|transition-duration|transition-property|transition-timing-function|transition|unicode-bidi|vertical-align|visibility|voice-balance|voice-duration|voice-family|voice-pitch-range|voice-pitch|voice-rate|voice-stress|voice-volume|volume|white-space-collapse|white-space|widows|width|word-break|word-spacing|word-wrap|z-index".split("|")),b=e.arrayToMap("rgb|rgba|url|attr|counter|counters".split("|")),c=e.arrayToMap("absolute|after-edge|after|all-scroll|all|alphabetic|always|antialiased|armenian|auto|avoid-column|avoid-page|avoid|balance|baseline|before-edge|before|below|bidi-override|block-line-height|block|bold|bolder|border-box|both|bottom|box|break-all|break-word|capitalize|caps-height|caption|center|central|char|circle|cjk-ideographic|clone|close-quote|col-resize|collapse|column|consider-shifts|contain|content-box|cover|crosshair|cubic-bezier|dashed|decimal-leading-zero|decimal|default|disabled|disc|disregard-shifts|distribute-all-lines|distribute-letter|distribute-space|distribute|dotted|double|e-resize|ease-in|ease-in-out|ease-out|ease|ellipsis|end|exclude-ruby|fill|fixed|font-size|font|georgian|glyphs|grid-height|groove|hand|hanging|hebrew|help|hidden|hiragana-iroha|hiragana|horizontal|icon|ideograph-alpha|ideograph-numeric|ideograph-parenthesis|ideograph-space|ideographic|inactive|include-ruby|inherit|initial|inline-block|inline-box|inline-line-height|inline-table|inline|inset|inside|inter-ideograph|inter-word|invert|italic|justify|katakana-iroha|katakana|keep-all|last|left|lighter|line-edge|line-through|line|linear|list-item|local|loose|lower-alpha|lower-greek|lower-latin|lower-roman|lowercase|lr-tb|ltr|mathematical|max-height|max-size|medium|menu|message-box|middle|move|n-resize|ne-resize|newspaper|no-change|no-close-quote|no-drop|no-open-quote|no-repeat|none|normal|not-allowed|nowrap|nw-resize|oblique|open-quote|outset|outside|overline|padding-box|page|pointer|pre-line|pre-wrap|pre|preserve-3d|progress|relative|repeat-x|repeat-y|repeat|replaced|reset-size|ridge|right|round|row-resize|rtl|s-resize|scroll|se-resize|separate|slice|small-caps|small-caption|solid|space|square|start|static|status-bar|step-end|step-start|steps|stretch|strict|sub|super|sw-resize|table-caption|table-cell|table-column-group|table-column|table-footer-group|table-header-group|table-row-group|table-row|table|tb-rl|text-after-edge|text-before-edge|text-bottom|text-size|text-top|text|thick|thin|top|transparent|underline|upper-alpha|upper-latin|upper-roman|uppercase|use-script|vertical-ideographic|vertical-text|visible|w-resize|wait|whitespace|z-index|zero".split("|")),d=e.arrayToMap("aqua|black|blue|fuchsia|gray|green|lime|maroon|navy|olive|orange|purple|red|silver|teal|white|yellow".split("|")),f=e.arrayToMap("arial|century|comic|courier|garamond|georgia|helvetica|impact|lucida|symbol|system|tahoma|times|trebuchet|utopia|verdana|webdings|sans-serif|serif|monospace".split("|")),g="\\-?(?:(?:[0-9]+)|(?:[0-9]*\\.[0-9]+))",h="(\\:+)\\b(after|before|first-letter|first-line|moz-selection|selection)\\b",i="(:)\\b(active|checked|disabled|empty|enabled|first-child|first-of-type|focus|hover|indeterminate|invalid|last-child|last-of-type|link|not|nth-child|nth-last-child|nth-last-of-type|nth-of-type|only-child|only-of-type|required|root|target|valid|visited)\\b",j=[{token:"comment",merge:!0,regex:"\\/\\*",next:"ruleset_comment"},{token:"string",regex:'["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'},{token:"string",regex:"['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']"},{token:["constant.numeric","keyword"],regex:"("+g+")(ch|cm|deg|em|ex|fr|gd|grad|Hz|in|kHz|mm|ms|pc|pt|px|rad|rem|s|turn|vh|vm|vw|%)"},{token:["constant.numeric"],regex:"([0-9]+)"},{token:"constant.numeric",regex:"#[a-f0-9]{6}"},{token:"constant.numeric",regex:"#[a-f0-9]{3}"},{token:["punctuation","entity.other.attribute-name.pseudo-element.css"],regex:h},{token:["punctuation","entity.other.attribute-name.pseudo-class.css"],regex:i},{token:function(e){return a.hasOwnProperty(e.toLowerCase())?"support.type":b.hasOwnProperty(e.toLowerCase())?"support.function":c.hasOwnProperty(e.toLowerCase())?"support.constant":d.hasOwnProperty(e.toLowerCase())?"support.constant.color":f.hasOwnProperty(e.toLowerCase())?"support.constant.fonts":"text"},regex:"\\-?[a-zA-Z_][a-zA-Z0-9_\\-]*"}],k=e.copyArray(j);k.unshift({token:"paren.rparen",regex:"\\}",next:"start"});var l=e.copyArray(j);l.unshift({token:"paren.rparen",regex:"\\}",next:"media"});var m=[{token:"comment",merge:!0,regex:".+"}],n=e.copyArray(m);n.unshift({token:"comment",regex:".*?\\*\\/",next:"start"});var o=e.copyArray(m);o.unshift({token:"comment",regex:".*?\\*\\/",next:"media"});var p=e.copyArray(m);p.unshift({token:"comment",regex:".*?\\*\\/",next:"ruleset"}),this.$rules={start:[{token:"comment",merge:!0,regex:"\\/\\*",next:"comment"},{token:"paren.lparen",regex:"\\{",next:"ruleset"},{token:"string",regex:"@.*?{",next:"media"},{token:"keyword",regex:"#[a-z0-9-_]+"},{token:"variable",regex:"\\.[a-z0-9-_]+"},{token:"string",regex:":[a-z0-9-_]+"},{token:"constant",regex:"[a-z0-9-_]+"}],media:[{token:"comment",merge:!0,regex:"\\/\\*",next:"media_comment"},{token:"paren.lparen",regex:"\\{",next:"media_ruleset"},{token:"string",regex:"\\}",next:"start"},{token:"keyword",regex:"#[a-z0-9-_]+"},{token:"variable",regex:"\\.[a-z0-9-_]+"},{token:"string",regex:":[a-z0-9-_]+"},{token:"constant",regex:"[a-z0-9-_]+"}],comment:n,ruleset:k,ruleset_comment:p,media_ruleset:l,media_comment:o}};d.inherits(g,f),b.CssHighlightRules=g}),define("ace/mode/html_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/css_highlight_rules","ace/mode/javascript_highlight_rules","ace/mode/xml_util","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./css_highlight_rules").CssHighlightRules,f=a("./javascript_highlight_rules").JavaScriptHighlightRules,g=a("./xml_util"),h=a("./text_highlight_rules").TextHighlightRules,i=function(){this.$rules={start:[{token:"text",merge:!0,regex:"<\\!\\[CDATA\\[",next:"cdata"},{token:"xml_pe",regex:"<\\?.*?\\?>"},{token:"comment",merge:!0,regex:"<\\!--",next:"comment"},{token:"xml_pe",regex:"<\\!.*?>"},{token:"meta.tag",regex:"<(?=s*script\\b)",next:"script"},{token:"meta.tag",regex:"<(?=s*style\\b)",next:"style"},{token:"meta.tag",regex:"<\\/?",next:"tag"},{token:"text",regex:"\\s+"},{token:"constant.character.entity",regex:"(?:&#[0-9]+;)|(?:&#x[0-9a-fA-F]+;)|(?:&[a-zA-Z0-9_:\\.-]+;)"},{token:"text",regex:"[^<]+"}],cdata:[{token:"text",regex:"\\]\\]>",next:"start"},{token:"text",merge:!0,regex:"\\s+"},{token:"text",merge:!0,regex:".+"}],comment:[{token:"comment",regex:".*?-->",next:"start"},{token:"comment",merge:!0,regex:".+"}]},g.tag(this.$rules,"tag","start"),g.tag(this.$rules,"style","css-start"),g.tag(this.$rules,"script","js-start"),this.embedRules(f,"js-",[{token:"comment",regex:"\\/\\/.*(?=<\\/script>)",next:"tag"},{token:"meta.tag",regex:"<\\/(?=script)",next:"tag"}]),this.embedRules(e,"css-",[{token:"meta.tag",regex:"<\\/(?=style)",next:"tag"}])};d.inherits(i,h),b.HtmlHighlightRules=i}),define("ace/mode/xml_util",["require","exports","module","ace/lib/lang"],function(a,b,c){function g(a){return[{token:"string",regex:'".*?"'},{token:"string",merge:!0,regex:'["].*',next:a+"_qqstring"},{token:"string",regex:"'.*?'"},{token:"string",merge:!0,regex:"['].*",next:a+"_qstring"}]}function h(a,b){return[{token:"string",merge:!0,regex:".*?"+a,next:b},{token:"string",merge:!0,regex:".+"}]}"use strict";var d=a("../lib/lang"),e=d.arrayToMap("button|form|input|label|select|textarea".split("|")),f=d.arrayToMap("table|tbody|td|tfoot|th|tr".split("|"));b.tag=function(a,b,c){a[b]=[{token:"text",regex:"\\s+"},{token:function(a){return a==="a"?"meta.tag.anchor":a==="img"?"meta.tag.image":a==="script"?"meta.tag.script":a==="style"?"meta.tag.style":e.hasOwnProperty(a.toLowerCase())?"meta.tag.form":f.hasOwnProperty(a.toLowerCase())?"meta.tag.table":"meta.tag"},merge:!0,regex:"[-_a-zA-Z0-9:]+",next:b+"_embed_attribute_list"},{token:"empty",regex:"",next:b+"_embed_attribute_list"}],a[b+"_qstring"]=h("'",b+"_embed_attribute_list"),a[b+"_qqstring"]=h('"',b+"_embed_attribute_list"),a[b+"_embed_attribute_list"]=[{token:"meta.tag",merge:!0,regex:"/?>",next:c},{token:"keyword.operator",regex:"="},{token:"entity.other.attribute-name",regex:"[-_a-zA-Z0-9:]+"},{token:"constant.numeric",regex:"[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"},{token:"text",regex:"\\s+"}].concat(g(b))}}),define("ace/mode/behaviour/xml",["require","exports","module","ace/lib/oop","ace/mode/behaviour","ace/mode/behaviour/cstyle"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../behaviour").Behaviour,f=a("./cstyle").CstyleBehaviour,g=function(){this.inherit(f,["string_dquotes"]),this.add("brackets","insertion",function(a,b,c,d,e){if(e=="<"){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?!1:{text:"<>",selection:[1,1]}}if(e==">"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j==">")return{text:"",selection:[1,1]}}else if(e=="\n"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),k=i.substring(h.column,h.column+2);if(k=="</"){var l=this.$getIndent(d.doc.getLine(h.row))+d.getTabString(),m=this.$getIndent(d.doc.getLine(h.row));return{text:"\n"+l+"\n"+m,selection:[1,l.length,1,l.length]}}}})};d.inherits(g,e),b.XmlBehaviour=g}),define("ace/mode/folding/html",["require","exports","module","ace/lib/oop","ace/mode/folding/mixed","ace/mode/folding/xml","ace/mode/folding/cstyle"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("./mixed").FoldMode,f=a("./xml").FoldMode,g=a("./cstyle").FoldMode,h=b.FoldMode=function(){e.call(this,new f({area:1,base:1,br:1,col:1,command:1,embed:1,hr:1,img:1,input:1,keygen:1,link:1,meta:1,param:1,source:1,track:1,wbr:1,li:1,dt:1,dd:1,p:1,rt:1,rp:1,optgroup:1,option:1,colgroup:1,td:1,th:1}),{"js-":new g,"css-":new g})};d.inherits(h,e)}),define("ace/mode/folding/mixed",["require","exports","module","ace/lib/oop","ace/mode/folding/fold_mode"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("./fold_mode").FoldMode,f=b.FoldMode=function(a,b){this.defaultMode=a,this.subModes=b};d.inherits(f,e),function(){this.$getMode=function(a){for(var b in this.subModes)if(a.indexOf(b)===0)return this.subModes[b];return null},this.$tryMode=function(a,b,c,d){var e=this.$getMode(a);return e?e.getFoldWidget(b,c,d):""},this.getFoldWidget=function(a,b,c){return this.$tryMode(a.getState(c-1),a,b,c)||this.$tryMode(a.getState(c),a,b,c)||this.defaultMode.getFoldWidget(a,b,c)},this.getFoldWidgetRange=function(a,b,c){var d=this.$getMode(a.getState(c-1));if(!d||!d.getFoldWidget(a,b,c))d=this.$getMode(a.getState(c));if(!d||!d.getFoldWidget(a,b,c))d=this.defaultMode;return d.getFoldWidgetRange(a,b,c)}}.call(f.prototype)}),define("ace/mode/folding/xml",["require","exports","module","ace/lib/oop","ace/lib/lang","ace/range","ace/mode/folding/fold_mode","ace/token_iterator"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../../lib/lang"),f=a("../../range").Range,g=a("./fold_mode").FoldMode,h=a("../../token_iterator").TokenIterator,i=b.FoldMode=function(a){g.call(this),this.voidElements=a||{}};d.inherits(i,g),function(){this.getFoldWidget=function(a,b,c){var d=this._getFirstTagInLine(a,c);return d.closing?b=="markbeginend"?"end":"":!d.tagName||this.voidElements[d.tagName.toLowerCase()]?"":d.selfClosing?"":d.value.indexOf("/"+d.tagName)!==-1?"":"start"},this._getFirstTagInLine=function(a,b){var c=a.getTokens(b,b)[0].tokens,d="";for(var f=0;f<c.length;f++){var g=c[f];g.type.indexOf("meta.tag")===0?d+=g.value:d+=e.stringRepeat(" ",g.value.length)}return this._parseTag(d)},this.tagRe=/^(\s*)(<?(\/?)([-_a-zA-Z0-9:!]*)\s*(\/?)>?)/,this._parseTag=function(a){var b=this.tagRe.exec(a),c=this.tagRe.lastIndex||0;return this.tagRe.lastIndex=0,{value:a,match:b?b[2]:"",closing:b?!!b[3]:!1,selfClosing:b?!!b[5]||b[2]=="/>":!1,tagName:b?b[4]:"",column:b[1]?c+b[1].length:c}},this._readTagForward=function(a){var b=a.getCurrentToken();if(!b)return null;var c="",d;do if(b.type.indexOf("meta.tag")===0){if(!d)var d={row:a.getCurrentTokenRow(),column:a.getCurrentTokenColumn()};c+=b.value;if(c.indexOf(">")!==-1){var e=this._parseTag(c);return e.start=d,e.end={row:a.getCurrentTokenRow(),column:a.getCurrentTokenColumn()+b.value.length},a.stepForward(),e}}while(b=a.stepForward());return null},this._readTagBackward=function(a){var b=a.getCurrentToken();if(!b)return null;var c="",d;do if(b.type.indexOf("meta.tag")===0){d||(d={row:a.getCurrentTokenRow(),column:a.getCurrentTokenColumn()+b.value.length}),c=b.value+c;if(c.indexOf("<")!==-1){var e=this._parseTag(c);return e.end=d,e.start={row:a.getCurrentTokenRow(),column:a.getCurrentTokenColumn()},a.stepBackward(),e}}while(b=a.stepBackward());return null},this._pop=function(a,b){while(a.length){var c=a[a.length-1];if(!b||c.tagName==b.tagName)return a.pop();if(this.voidElements[b.tagName])return;if(this.voidElements[c.tagName]){a.pop();continue}return null}},this.getFoldWidgetRange=function(a,b,c){var d=this._getFirstTagInLine(a,c);if(!d.match)return null;var e=d.closing||d.selfClosing,g=[],i;if(!e){var j=new h(a,c,d.column),k={row:c,column:d.column+d.tagName.length+2};while(i=this._readTagForward(j)){if(i.selfClosing){if(!g.length)return i.start.column+=i.tagName.length+2,i.end.column-=2,f.fromPoints(i.start,i.end);continue}if(i.closing){this._pop(g,i);if(g.length==0)return f.fromPoints(k,i.start)}else g.push(i)}}else{var j=new h(a,c,d.column+d.match.length),l={row:c,column:d.column};while(i=this._readTagBackward(j)){if(i.selfClosing){if(!g.length)return i.start.column+=i.tagName.length+2,i.end.column-=2,f.fromPoints(i.start,i.end);continue}if(!i.closing){this._pop(g,i);if(g.length==0)return i.start.column+=i.tagName.length+2,f.fromPoints(i.start,l)}else g.push(i)}}}}.call(i.prototype)})
;
define("ace/mode/javascript",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/javascript_highlight_rules","ace/mode/matching_brace_outdent","ace/range","ace/worker/worker_client","ace/mode/behaviour/cstyle","ace/mode/folding/cstyle"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text").Mode,f=a("../tokenizer").Tokenizer,g=a("./javascript_highlight_rules").JavaScriptHighlightRules,h=a("./matching_brace_outdent").MatchingBraceOutdent,i=a("../range").Range,j=a("../worker/worker_client").WorkerClient,k=a("./behaviour/cstyle").CstyleBehaviour,l=a("./folding/cstyle").FoldMode,m=function(){this.$tokenizer=new f((new g).getRules()),this.$outdent=new h,this.$behaviour=new k,this.foldingRules=new l};d.inherits(m,e),function(){this.toggleCommentLines=function(a,b,c,d){var e=!0,f=/^(\s*)\/\//;for(var g=c;g<=d;g++)if(!f.test(b.getLine(g))){e=!1;break}if(e){var h=new i(0,0,0,0);for(var g=c;g<=d;g++){var j=b.getLine(g),k=j.match(f);h.start.row=g,h.end.row=g,h.end.column=k[0].length,b.replace(h,k[1])}}else b.indentRows(c,d,"//")},this.getNextLineIndent=function(a,b,c){var d=this.$getIndent(b),e=this.$tokenizer.getLineTokens(b,a),f=e.tokens,g=e.state;if(f.length&&f[f.length-1].type=="comment")return d;if(a=="start"||a=="regex_allowed"){var h=b.match(/^.*(?:\bcase\b.*\:|[\{\(\[])\s*$/);h&&(d+=c)}else if(a=="doc-start"){if(g=="start"||a=="regex_allowed")return"";var h=b.match(/^\s*(\/?)\*/);h&&(h[1]&&(d+=" "),d+="* ")}return d},this.checkOutdent=function(a,b,c){return this.$outdent.checkOutdent(b,c)},this.autoOutdent=function(a,b,c){this.$outdent.autoOutdent(b,c)},this.createWorker=function(a){var b=new j(["ace"],"worker-javascript.js","ace/mode/javascript_worker","JavaScriptWorker");return b.attachToDocument(a.getDocument()),b.on("jslint",function(b){var c=[];for(var d=0;d<b.data.length;d++){var e=b.data[d];e&&c.push({row:e.line-1,column:e.character-1,text:e.reason,type:"warning",lint:e})}a.setAnnotations(c)}),b.on("narcissus",function(b){a.setAnnotations([b.data])}),b.on("terminate",function(){a.clearAnnotations()}),b}}.call(m.prototype),b.Mode=m}),define("ace/mode/javascript_highlight_rules",["require","exports","module","ace/lib/oop","ace/lib/lang","ace/unicode","ace/mode/doc_comment_highlight_rules","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("../lib/lang"),f=a("../unicode"),g=a("./doc_comment_highlight_rules").DocCommentHighlightRules,h=a("./text_highlight_rules").TextHighlightRules,i=function(){var a=e.arrayToMap("Array|Boolean|Date|Function|Iterator|Number|Object|RegExp|String|Proxy|Namespace|QName|XML|XMLList|ArrayBuffer|Float32Array|Float64Array|Int16Array|Int32Array|Int8Array|Uint16Array|Uint32Array|Uint8Array|Uint8ClampedArray|Error|EvalError|InternalError|RangeError|ReferenceError|StopIteration|SyntaxError|TypeError|URIError|decodeURI|decodeURIComponent|encodeURI|encodeURIComponent|eval|isFinite|isNaN|parseFloat|parseInt|JSON|Math|this|arguments|prototype|window|document".split("|")),b=e.arrayToMap("break|case|catch|continue|default|delete|do|else|finally|for|function|if|in|instanceof|new|return|switch|throw|try|typeof|let|var|while|with|const|yield|import|get|set".split("|")),c="case|do|else|finally|in|instanceof|return|throw|try|typeof|yield",d=e.arrayToMap("__parent__|__count__|escape|unescape|with|__proto__".split("|")),h=e.arrayToMap("const|let|var|function".split("|")),i=e.arrayToMap("null|Infinity|NaN|undefined".split("|")),j=e.arrayToMap("class|enum|extends|super|export|implements|private|public|interface|package|protected|static".split("|")),k="["+f.packages.L+"\\$_]["+f.packages.L+f.packages.Mn+f.packages.Mc+f.packages.Nd+f.packages.Pc+"\\$_]*\\b",l="\\\\(?:x[0-9a-fA-F]{2}|u[0-9a-fA-F]{4}|[0-2][0-7]{0,2}|3[0-6][0-7]?|37[0-7]?|[4-7][0-7]?|.)";this.$rules={start:[{token:"comment",regex:/\/\/.*$/},g.getStartRule("doc-start"),{token:"comment",merge:!0,regex:/\/\*/,next:"comment"},{token:"string",regex:"'(?=.)",next:"qstring"},{token:"string",regex:'"(?=.)',next:"qqstring"},{token:"constant.numeric",regex:/0[xX][0-9a-fA-F]+\b/},{token:"constant.numeric",regex:/[+-]?\d+(?:(?:\.\d*)?(?:[eE][+-]?\d+)?)?\b/},{token:["storage.type","punctuation.operator","support.function","punctuation.operator","entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\.)(prototype)(\\.)("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["storage.type","punctuation.operator","support.function","punctuation.operator","entity.name.function","text","keyword.operator","text"],regex:"("+k+")(\\.)(prototype)(\\.)("+k+")(\\s*)(=)(\\s*)",next:"function_arguments"},{token:["storage.type","punctuation.operator","entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\.)("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["entity.name.function","text","keyword.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\s*)(=)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["storage.type","text","entity.name.function","text","paren.lparen"],regex:"(function)(\\s+)("+k+")(\\s*)(\\()",next:"function_arguments"},{token:["entity.name.function","text","punctuation.operator","text","storage.type","text","paren.lparen"],regex:"("+k+")(\\s*)(:)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:["text","text","storage.type","text","paren.lparen"],regex:"(:)(\\s*)(function)(\\s*)(\\()",next:"function_arguments"},{token:"constant.language.boolean",regex:/(?:true|false)\b/},{token:"keyword",regex:"(?:"+c+")\\b",next:"regex_allowed"},{token:["punctuation.operator","support.function"],regex:/(\.)(s(?:h(?:ift|ow(?:Mod(?:elessDialog|alDialog)|Help))|croll(?:X|By(?:Pages|Lines)?|Y|To)?|t(?:opzzzz|rike)|i(?:n|zeToContent|debar|gnText)|ort|u(?:p|b(?:str(?:ing)?)?)|pli(?:ce|t)|e(?:nd|t(?:Re(?:sizable|questHeader)|M(?:i(?:nutes|lliseconds)|onth)|Seconds|Ho(?:tKeys|urs)|Year|Cursor|Time(?:out)?|Interval|ZOptions|Date|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Date|FullYear)|FullYear|Active)|arch)|qrt|lice|avePreferences|mall)|h(?:ome|andleEvent)|navigate|c(?:har(?:CodeAt|At)|o(?:s|n(?:cat|textual|firm)|mpile)|eil|lear(?:Timeout|Interval)?|a(?:ptureEvents|ll)|reate(?:StyleSheet|Popup|EventObject))|t(?:o(?:GMTString|S(?:tring|ource)|U(?:TCString|pperCase)|Lo(?:caleString|werCase))|est|a(?:n|int(?:Enabled)?))|i(?:s(?:NaN|Finite)|ndexOf|talics)|d(?:isableExternalCapture|ump|etachEvent)|u(?:n(?:shift|taint|escape|watch)|pdateCommands)|j(?:oin|avaEnabled)|p(?:o(?:p|w)|ush|lugins.refresh|a(?:ddings|rse(?:Int|Float)?)|r(?:int|ompt|eference))|e(?:scape|nableExternalCapture|val|lementFromPoint|x(?:p|ec(?:Script|Command)?))|valueOf|UTC|queryCommand(?:State|Indeterm|Enabled|Value)|f(?:i(?:nd|le(?:ModifiedDate|Size|CreatedDate|UpdatedDate)|xed)|o(?:nt(?:size|color)|rward)|loor|romCharCode)|watch|l(?:ink|o(?:ad|g)|astIndexOf)|a(?:sin|nchor|cos|t(?:tachEvent|ob|an(?:2)?)|pply|lert|b(?:s|ort))|r(?:ou(?:nd|teEvents)|e(?:size(?:By|To)|calc|turnValue|place|verse|l(?:oad|ease(?:Capture|Events)))|andom)|g(?:o|et(?:ResponseHeader|M(?:i(?:nutes|lliseconds)|onth)|Se(?:conds|lection)|Hours|Year|Time(?:zoneOffset)?|Da(?:y|te)|UTC(?:M(?:i(?:nutes|lliseconds)|onth)|Seconds|Hours|Da(?:y|te)|FullYear)|FullYear|A(?:ttention|llResponseHeaders)))|m(?:in|ove(?:B(?:y|elow)|To(?:Absolute)?|Above)|ergeAttributes|a(?:tch|rgins|x))|b(?:toa|ig|o(?:ld|rderWidths)|link|ack))\b(?=\()/},{token:["punctuation.operator","support.function.dom"],regex:/(\.)(s(?:ub(?:stringData|mit)|plitText|e(?:t(?:NamedItem|Attribute(?:Node)?)|lect))|has(?:ChildNodes|Feature)|namedItem|c(?:l(?:ick|o(?:se|neNode))|reate(?:C(?:omment|DATASection|aption)|T(?:Head|extNode|Foot)|DocumentFragment|ProcessingInstruction|E(?:ntityReference|lement)|Attribute))|tabIndex|i(?:nsert(?:Row|Before|Cell|Data)|tem)|open|delete(?:Row|C(?:ell|aption)|T(?:Head|Foot)|Data)|focus|write(?:ln)?|a(?:dd|ppend(?:Child|Data))|re(?:set|place(?:Child|Data)|move(?:NamedItem|Child|Attribute(?:Node)?)?)|get(?:NamedItem|Element(?:sBy(?:Name|TagName)|ById)|Attribute(?:Node)?)|blur)\b(?=\()/},{token:["punctuation.operator","support.constant"],regex:/(\.)(s(?:ystemLanguage|cr(?:ipts|ollbars|een(?:X|Y|Top|Left))|t(?:yle(?:Sheets)?|atus(?:Text|bar)?)|ibling(?:Below|Above)|ource|uffixes|e(?:curity(?:Policy)?|l(?:ection|f)))|h(?:istory|ost(?:name)?|as(?:h|Focus))|y|X(?:MLDocument|SLDocument)|n(?:ext|ame(?:space(?:s|URI)|Prop))|M(?:IN_VALUE|AX_VALUE)|c(?:haracterSet|o(?:n(?:structor|trollers)|okieEnabled|lorDepth|mp(?:onents|lete))|urrent|puClass|l(?:i(?:p(?:boardData)?|entInformation)|osed|asses)|alle(?:e|r)|rypto)|t(?:o(?:olbar|p)|ext(?:Transform|Indent|Decoration|Align)|ags)|SQRT(?:1_2|2)|i(?:n(?:ner(?:Height|Width)|put)|ds|gnoreCase)|zIndex|o(?:scpu|n(?:readystatechange|Line)|uter(?:Height|Width)|p(?:sProfile|ener)|ffscreenBuffering)|NEGATIVE_INFINITY|d(?:i(?:splay|alog(?:Height|Top|Width|Left|Arguments)|rectories)|e(?:scription|fault(?:Status|Ch(?:ecked|arset)|View)))|u(?:ser(?:Profile|Language|Agent)|n(?:iqueID|defined)|pdateInterval)|_content|p(?:ixelDepth|ort|ersonalbar|kcs11|l(?:ugins|atform)|a(?:thname|dding(?:Right|Bottom|Top|Left)|rent(?:Window|Layer)?|ge(?:X(?:Offset)?|Y(?:Offset)?))|r(?:o(?:to(?:col|type)|duct(?:Sub)?|mpter)|e(?:vious|fix)))|e(?:n(?:coding|abledPlugin)|x(?:ternal|pando)|mbeds)|v(?:isibility|endor(?:Sub)?|Linkcolor)|URLUnencoded|P(?:I|OSITIVE_INFINITY)|f(?:ilename|o(?:nt(?:Size|Family|Weight)|rmName)|rame(?:s|Element)|gColor)|E|whiteSpace|l(?:i(?:stStyleType|n(?:eHeight|kColor))|o(?:ca(?:tion(?:bar)?|lName)|wsrc)|e(?:ngth|ft(?:Context)?)|a(?:st(?:M(?:odified|atch)|Index|Paren)|yer(?:s|X)|nguage))|a(?:pp(?:MinorVersion|Name|Co(?:deName|re)|Version)|vail(?:Height|Top|Width|Left)|ll|r(?:ity|guments)|Linkcolor|bove)|r(?:ight(?:Context)?|e(?:sponse(?:XML|Text)|adyState))|global|x|m(?:imeTypes|ultiline|enubar|argin(?:Right|Bottom|Top|Left))|L(?:N(?:10|2)|OG(?:10E|2E))|b(?:o(?:ttom|rder(?:Width|RightWidth|BottomWidth|Style|Color|TopWidth|LeftWidth))|ufferDepth|elow|ackground(?:Color|Image)))\b/},{token:["storage.type","punctuation.operator","support.function.firebug"],regex:/(console)(\.)(warn|info|log|error|time|timeEnd|assert)\b/},{token:function(c){return a.hasOwnProperty(c)?"variable.language":d.hasOwnProperty(c)?"invalid.deprecated":h.hasOwnProperty(c)?"storage.type":b.hasOwnProperty(c)?"keyword":i.hasOwnProperty(c)?"constant.language":j.hasOwnProperty(c)?"invalid.illegal":c=="debugger"?"invalid.deprecated":"identifier"},regex:k},{token:"keyword.operator",regex:/!|\$|%|&|\*|\-\-|\-|\+\+|\+|~|===|==|=|!=|!==|<=|>=|<<=|>>=|>>>=|<>|<|>|!|&&|\|\||\?\:|\*=|%=|\+=|\-=|&=|\^=|\b(?:in|instanceof|new|delete|typeof|void)/,next:"regex_allowed"},{token:"punctuation.operator",regex:/\?|\:|\,|\;|\./,next:"regex_allowed"},{token:"paren.lparen",regex:/[\[({]/,next:"regex_allowed"},{token:"paren.rparen",regex:/[\])}]/},{token:"keyword.operator",regex:/\/=?/,next:"regex_allowed"},{token:"comment",regex:/^#!.*$/},{token:"text",regex:/\s+/}],regex_allowed:[g.getStartRule("doc-start"),{token:"comment",merge:!0,regex:"\\/\\*",next:"comment_regex_allowed"},{token:"comment",regex:"\\/\\/.*$"},{token:"string.regexp",regex:"\\/",next:"regex",merge:!0},{token:"text",regex:"\\s+"},{token:"empty",regex:"",next:"start"}],regex:[{token:"regexp.keyword.operator",regex:"\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"},{token:"string.regexp",regex:"/\\w*",next:"start",merge:!0},{token:"string.regexp",regex:"[^\\\\/\\[]+",merge:!0},{token:"string.regexp.charachterclass",regex:"\\[",next:"regex_character_class",merge:!0},{token:"empty",regex:"",next:"start"}],regex_character_class:[{token:"regexp.keyword.operator",regex:"\\\\(?:u[\\da-fA-F]{4}|x[\\da-fA-F]{2}|.)"},{token:"string.regexp.charachterclass",regex:"]",next:"regex",merge:!0},{token:"string.regexp.charachterclass",regex:"[^\\\\\\]]+",merge:!0},{token:"empty",regex:"",next:"start"}],function_arguments:[{token:"variable.parameter",regex:k},{token:"punctuation.operator",regex:"[, ]+",merge:!0},{token:"punctuation.operator",regex:"$",merge:!0},{token:"empty",regex:"",next:"start"}],comment_regex_allowed:[{token:"comment",regex:".*?\\*\\/",merge:!0,next:"regex_allowed"},{token:"comment",merge:!0,regex:".+"}],comment:[{token:"comment",regex:".*?\\*\\/",merge:!0,next:"start"},{token:"comment",merge:!0,regex:".+"}],qqstring:[{token:"constant.language.escape",regex:l},{token:"string",regex:'[^"\\\\]+',merge:!0},{token:"string",regex:"\\\\$",next:"qqstring",merge:!0},{token:"string",regex:'"|$',next:"start",merge:!0}],qstring:[{token:"constant.language.escape",regex:l},{token:"string",regex:"[^'\\\\]+",merge:!0},{token:"string",regex:"\\\\$",next:"qstring",merge:!0},{token:"string",regex:"'|$",next:"start",merge:!0}]},this.embedRules(g,"doc-",[g.getEndRule("start")])};d.inherits(i,h),b.JavaScriptHighlightRules=i}),define("ace/mode/doc_comment_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"],function(a,b,c){"use strict";var d=a("../lib/oop"),e=a("./text_highlight_rules").TextHighlightRules,f=function(){this.$rules={start:[{token:"comment.doc.tag",regex:"@[\\w\\d_]+"},{token:"comment.doc",merge:!0,regex:"\\s+"},{token:"comment.doc",merge:!0,regex:"TODO"},{token:"comment.doc",merge:!0,regex:"[^@\\*]+"},{token:"comment.doc",merge:!0,regex:"."}]}};d.inherits(f,e),f.getStartRule=function(a){return{token:"comment.doc",merge:!0,regex:"\\/\\*(?=\\*)",next:a}},f.getEndRule=function(a){return{token:"comment.doc",merge:!0,regex:"\\*\\/",next:a}},b.DocCommentHighlightRules=f}),define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"],function(a,b,c){"use strict";var d=a("../range").Range,e=function(){};(function(){this.checkOutdent=function(a,b){return/^\s+$/.test(a)?/^\s*\}/.test(b):!1},this.autoOutdent=function(a,b){var c=a.getLine(b),e=c.match(/^(\s*\})/);if(!e)return 0;var f=e[1].length,g=a.findMatchingBracket({row:b,column:f});if(!g||g.row==b)return 0;var h=this.$getIndent(a.getLine(g.row));a.replace(new d(b,0,b,f-1),h)},this.$getIndent=function(a){var b=a.match(/^(\s+)/);return b?b[1]:""}}).call(e.prototype),b.MatchingBraceOutdent=e}),define("ace/mode/behaviour/cstyle",["require","exports","module","ace/lib/oop","ace/mode/behaviour"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../behaviour").Behaviour,f=function(){this.add("braces","insertion",function(a,b,c,d,e){if(e=="{"){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"{"+g+"}",selection:!1}:{text:"{}",selection:[1,1]}}if(e=="}"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var k=d.$findOpeningBracket("}",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}else if(e=="\n"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j=="}"){var l=d.findMatchingBracket({row:h.row,column:h.column+1});if(!l)return null;var m=this.getNextLineIndent(a,i.substring(0,i.length-1),d.getTabString()),n=this.$getIndent(d.doc.getLine(l.row));return{text:"\n"+m+"\n"+n,selection:[1,m.length,1,m.length]}}}}),this.add("braces","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="{"){var g=d.doc.getLine(e.start.row),h=g.substring(e.end.column,e.end.column+1);if(h=="}")return e.end.column++,e}}),this.add("parens","insertion",function(a,b,c,d,e){if(e=="("){var f=c.getSelectionRange(),g=d.doc.getTextRange(f);return g!==""?{text:"("+g+")",selection:!1}:{text:"()",selection:[1,1]}}if(e==")"){var h=c.getCursorPosition(),i=d.doc.getLine(h.row),j=i.substring(h.column,h.column+1);if(j==")"){var k=d.$findOpeningBracket(")",{column:h.column+1,row:h.row});if(k!==null)return{text:"",selection:[1,1]}}}}),this.add("parens","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&f=="("){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h==")")return e.end.column++,e}}),this.add("string_dquotes","insertion",function(a,b,c,d,e){if(e=='"'||e=="'"){var f=e,g=c.getSelectionRange(),h=d.doc.getTextRange(g);if(h!=="")return{text:f+h+f,selection:!1};var i=c.getCursorPosition(),j=d.doc.getLine(i.row),k=j.substring(i.column-1,i.column);if(k=="\\")return null;var l=d.getTokens(g.start.row,g.start.row)[0].tokens,m=0,n,o=-1;for(var p=0;p<l.length;p++){n=l[p],n.type=="string"?o=-1:o<0&&(o=n.value.indexOf(f));if(n.value.length+m>g.start.column)break;m+=l[p].value.length}if(!n||o<0&&n.type!=="comment"&&(n.type!=="string"||g.start.column!==n.value.length+m-1&&n.value.lastIndexOf(f)===n.value.length-1))return{text:f+f,selection:[1,1]};if(n&&n.type==="string"){var q=j.substring(i.column,i.column+1);if(q==f)return{text:"",selection:[1,1]}}}}),this.add("string_dquotes","deletion",function(a,b,c,d,e){var f=d.doc.getTextRange(e);if(!e.isMultiLine()&&(f=='"'||f=="'")){var g=d.doc.getLine(e.start.row),h=g.substring(e.start.column+1,e.start.column+2);if(h=='"')return e.end.column++,e}})};d.inherits(f,e),b.CstyleBehaviour=f}),define("ace/mode/folding/cstyle",["require","exports","module","ace/lib/oop","ace/range","ace/mode/folding/fold_mode"],function(a,b,c){"use strict";var d=a("../../lib/oop"),e=a("../../range").Range,f=a("./fold_mode").FoldMode,g=b.FoldMode=function(){};d.inherits(g,f),function(){this.foldingStartMarker=/(\{|\[)[^\}\]]*$|^\s*(\/\*)/,this.foldingStopMarker=/^[^\[\{]*(\}|\])|^[\s\*]*(\*\/)/,this.getFoldWidgetRange=function(a,b,c){var d=a.getLine(c),f=d.match(this.foldingStartMarker);if(f){var g=f.index;if(f[1])return this.openingBracketBlock(a,f[1],c,g);var h=a.getCommentFoldRange(c,g+f[0].length);return h.end.column-=2,h}if(b!=="markbeginend")return;var f=d.match(this.foldingStopMarker);if(f){var g=f.index+f[0].length;if(f[2]){var h=a.getCommentFoldRange(c,g);return h.end.column-=2,h}var i={row:c,column:g},j=a.$findOpeningBracket(f[1],i);if(!j)return;return j.column++,i.column--,e.fromPoints(j,i)}}}.call(g.prototype)}),define("ace/mode/folding/fold_mode",["require","exports","module","ace/range"],function(a,b,c){"use strict";var d=a("../../range").Range,e=b.FoldMode=function(){};(function(){this.foldingStartMarker=null,this.foldingStopMarker=null,this.getFoldWidget=function(a,b,c){var d=a.getLine(c);return this.foldingStartMarker.test(d)?"start":b=="markbeginend"&&this.foldingStopMarker&&this.foldingStopMarker.test(d)?"end":""},this.getFoldWidgetRange=function(a,b,c){return null},this.indentationBlock=function(a,b,c){var e=/^\s*/,f=b,g=b,h=a.getLine(b),i=c||h.length,j=h.match(e)[0].length,k=a.getLength();while(++b<k){h=a.getLine(b);var l=h.match(e)[0].length;if(l==h.length)continue;if(l<=j)break;g=b}if(g>f){var m=a.getLine(g).length;return new d(f,i,g,m)}},this.openingBracketBlock=function(a,b,c,e){var f={row:c,column:e+1},g=a.$findClosingBracket(b,f);if(!g)return;var h=a.foldWidgets[g.row];return h==null&&(h=this.getFoldWidget(a,g.row)),h=="start"&&(g.row--,g.column=a.getLine(g.row).length),d.fromPoints(f,g)}}).call(e.prototype)})
;
/*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */
var Mustache = (typeof module !== "undefined" && module.exports) || {};

(function (exports) {

  exports.name = "mustache.js";
  exports.version = "0.5.0-dev";
  exports.tags = ["{{", "}}"];
  exports.parse = parse;
  exports.compile = compile;
  exports.render = render;
  exports.clearCache = clearCache;

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  var _toString = Object.prototype.toString;
  var _isArray = Array.isArray;
  var _forEach = Array.prototype.forEach;
  var _trim = String.prototype.trim;

  var isArray;
  if (_isArray) {
    isArray = _isArray;
  } else {
    isArray = function (obj) {
      return _toString.call(obj) === "[object Array]";
    };
  }

  var forEach;
  if (_forEach) {
    forEach = function (obj, callback, scope) {
      return _forEach.call(obj, callback, scope);
    };
  } else {
    forEach = function (obj, callback, scope) {
      for (var i = 0, len = obj.length; i < len; ++i) {
        callback.call(scope, obj[i], i, obj);
      }
    };
  }

  var spaceRe = /^\s*$/;

  function isWhitespace(string) {
    return spaceRe.test(string);
  }

  var trim;
  if (_trim) {
    trim = function (string) {
      return string == null ? "" : _trim.call(string);
    };
  } else {
    var trimLeft, trimRight;

    if (isWhitespace("\xA0")) {
      trimLeft = /^\s+/;
      trimRight = /\s+$/;
    } else {
      // IE doesn't match non-breaking spaces with \s, thanks jQuery.
      trimLeft = /^[\s\xA0]+/;
      trimRight = /[\s\xA0]+$/;
    }

    trim = function (string) {
      return string == null ? "" :
        String(string).replace(trimLeft, "").replace(trimRight, "");
    };
  }

  var escapeMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;'
  };

  function escapeHTML(string) {
    return String(string).replace(/&(?!\w+;)|[<>"']/g, function (s) {
      return escapeMap[s] || s;
    });
  }

  /**
   * Adds the `template`, `line`, and `file` properties to the given error
   * object and alters the message to provide more useful debugging information.
   */
  function debug(e, template, line, file) {
    file = file || "<template>";

    var lines = template.split("\n"),
        start = Math.max(line - 3, 0),
        end = Math.min(lines.length, line + 3),
        context = lines.slice(start, end);

    var c;
    for (var i = 0, len = context.length; i < len; ++i) {
      c = i + start + 1;
      context[i] = (c === line ? " >> " : "    ") + context[i];
    }

    e.template = template;
    e.line = line;
    e.file = file;
    e.message = [file + ":" + line, context.join("\n"), "", e.message].join("\n");

    return e;
  }

  /**
   * Looks up the value of the given `name` in the given context `stack`.
   */
  function lookup(name, stack, defaultValue) {
    if (name === ".") {
      return stack[stack.length - 1];
    }

    var names = name.split(".");
    var lastIndex = names.length - 1;
    var target = names[lastIndex];

    var value, context, i = stack.length, j, localStack;
    while (i) {
      localStack = stack.slice(0);
      context = stack[--i];

      j = 0;
      while (j < lastIndex) {
        context = context[names[j++]];

        if (context == null) {
          break;
        }

        localStack.push(context);
      }

      if (context && typeof context === "object" && target in context) {
        value = context[target];
        break;
      }
    }

    // If the value is a function, call it in the current context.
    if (typeof value === "function") {
      value = value.call(localStack[localStack.length - 1]);
    }

    if (value == null)  {
      return defaultValue;
    }

    return value;
  }

  function renderSection(name, stack, callback, inverted) {
    var buffer = "";
    var value =  lookup(name, stack);

    if (inverted) {
      // From the spec: inverted sections may render text once based on the
      // inverse value of the key. That is, they will be rendered if the key
      // doesn't exist, is false, or is an empty list.
      if (value == null || value === false || (isArray(value) && value.length === 0)) {
        buffer += callback();
      }
    } else if (isArray(value)) {
      forEach(value, function (value) {
        stack.push(value);
        buffer += callback();
        stack.pop();
      });
    } else if (typeof value === "object") {
      stack.push(value);
      buffer += callback();
      stack.pop();
    } else if (typeof value === "function") {
      var scope = stack[stack.length - 1];
      var scopedRender = function (template) {
        return render(template, scope);
      };
      buffer += value.call(scope, callback(), scopedRender) || "";
    } else if (value) {
      buffer += callback();
    }

    return buffer;
  }

  /**
   * Parses the given `template` and returns the source of a function that,
   * with the proper arguments, will render the template. Recognized options
   * include the following:
   *
   *   - file     The name of the file the template comes from (displayed in
   *              error messages)
   *   - tags     An array of open and close tags the `template` uses. Defaults
   *              to the value of Mustache.tags
   *   - debug    Set `true` to log the body of the generated function to the
   *              console
   *   - space    Set `true` to preserve whitespace from lines that otherwise
   *              contain only a {{tag}}. Defaults to `false`
   */
  function parse(template, options) {
    options = options || {};

    var tags = options.tags || exports.tags,
        openTag = tags[0],
        closeTag = tags[tags.length - 1];

    var code = [
      'var buffer = "";', // output buffer
      "\nvar line = 1;", // keep track of source line number
      "\ntry {",
      '\nbuffer += "'
    ];

    var spaces = [],      // indices of whitespace in code on the current line
        hasTag = false,   // is there a {{tag}} on the current line?
        nonSpace = false; // is there a non-space char on the current line?

    // Strips all space characters from the code array for the current line
    // if there was a {{tag}} on it and otherwise only spaces.
    var stripSpace = function () {
      if (hasTag && !nonSpace && !options.space) {
        while (spaces.length) {
          code.splice(spaces.pop(), 1);
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    };

    var sectionStack = [], updateLine, nextOpenTag, nextCloseTag;

    var setTags = function (source) {
      tags = trim(source).split(/\s+/);
      nextOpenTag = tags[0];
      nextCloseTag = tags[tags.length - 1];
    };

    var includePartial = function (source) {
      code.push(
        '";',
        updateLine,
        '\nvar partial = partials["' + trim(source) + '"];',
        '\nif (partial) {',
        '\n  buffer += render(partial,stack[stack.length - 1],partials);',
        '\n}',
        '\nbuffer += "'
      );
    };

    var openSection = function (source, inverted) {
      var name = trim(source);

      if (name === "") {
        throw debug(new Error("Section name may not be empty"), template, line, options.file);
      }

      sectionStack.push({name: name, inverted: inverted});

      code.push(
        '";',
        updateLine,
        '\nvar name = "' + name + '";',
        '\nvar callback = (function () {',
        '\n  return function () {',
        '\n    var buffer = "";',
        '\nbuffer += "'
      );
    };

    var openInvertedSection = function (source) {
      openSection(source, true);
    };

    var closeSection = function (source) {
      var name = trim(source);
      var openName = sectionStack.length != 0 && sectionStack[sectionStack.length - 1].name;

      if (!openName || name != openName) {
        throw debug(new Error('Section named "' + name + '" was never opened'), template, line, options.file);
      }

      var section = sectionStack.pop();

      code.push(
        '";',
        '\n    return buffer;',
        '\n  };',
        '\n})();'
      );

      if (section.inverted) {
        code.push("\nbuffer += renderSection(name,stack,callback,true);");
      } else {
        code.push("\nbuffer += renderSection(name,stack,callback);");
      }

      code.push('\nbuffer += "');
    };

    var sendPlain = function (source) {
      code.push(
        '";',
        updateLine,
        '\nbuffer += lookup("' + trim(source) + '",stack,"");',
        '\nbuffer += "'
      );
    };

    var sendEscaped = function (source) {
      code.push(
        '";',
        updateLine,
        '\nbuffer += escapeHTML(lookup("' + trim(source) + '",stack,""));',
        '\nbuffer += "'
      );
    };

    var line = 1, c, callback;
    for (var i = 0, len = template.length; i < len; ++i) {
      if (template.slice(i, i + openTag.length) === openTag) {
        i += openTag.length;
        c = template.substr(i, 1);
        updateLine = '\nline = ' + line + ';';
        nextOpenTag = openTag;
        nextCloseTag = closeTag;
        hasTag = true;

        switch (c) {
        case "!": // comment
          i++;
          callback = null;
          break;
        case "=": // change open/close tags, e.g. {{=<% %>=}}
          i++;
          closeTag = "=" + closeTag;
          callback = setTags;
          break;
        case ">": // include partial
          i++;
          callback = includePartial;
          break;
        case "#": // start section
          i++;
          callback = openSection;
          break;
        case "^": // start inverted section
          i++;
          callback = openInvertedSection;
          break;
        case "/": // end section
          i++;
          callback = closeSection;
          break;
        case "{": // plain variable
          closeTag = "}" + closeTag;
          // fall through
        case "&": // plain variable
          i++;
          nonSpace = true;
          callback = sendPlain;
          break;
        default: // escaped variable
          nonSpace = true;
          callback = sendEscaped;
        }

        var end = template.indexOf(closeTag, i);

        if (end === -1) {
          throw debug(new Error('Tag "' + openTag + '" was not closed properly'), template, line, options.file);
        }

        var source = template.substring(i, end);

        if (callback) {
          callback(source);
        }

        // Maintain line count for \n in source.
        var n = 0;
        while (~(n = source.indexOf("\n", n))) {
          line++;
          n++;
        }

        i = end + closeTag.length - 1;
        openTag = nextOpenTag;
        closeTag = nextCloseTag;
      } else {
        c = template.substr(i, 1);

        switch (c) {
        case '"':
        case "\\":
          nonSpace = true;
          code.push("\\" + c);
          break;
        case "\r":
          // Ignore carriage returns.
          break;
        case "\n":
          spaces.push(code.length);
          code.push("\\n");
          stripSpace(); // Check for whitespace on the current line.
          line++;
          break;
        default:
          if (isWhitespace(c)) {
            spaces.push(code.length);
          } else {
            nonSpace = true;
          }

          code.push(c);
        }
      }
    }

    if (sectionStack.length != 0) {
      throw debug(new Error('Section "' + sectionStack[sectionStack.length - 1].name + '" was not closed properly'), template, line, options.file);
    }

    // Clean up any whitespace from a closing {{tag}} that was at the end
    // of the template without a trailing \n.
    stripSpace();

    code.push(
      '";',
      "\nreturn buffer;",
      "\n} catch (e) { throw {error: e, line: line}; }"
    );

    // Ignore `buffer += "";` statements.
    var body = code.join("").replace(/buffer \+= "";\n/g, "");

    if (options.debug) {
      if (typeof console != "undefined" && console.log) {
        console.log(body);
      } else if (typeof print === "function") {
        print(body);
      }
    }

    return body;
  }

  /**
   * Used by `compile` to generate a reusable function for the given `template`.
   */
  function _compile(template, options) {
    var args = "view,partials,stack,lookup,escapeHTML,renderSection,render";
    var body = parse(template, options);
    var fn = new Function(args, body);

    // This anonymous function wraps the generated function so we can do
    // argument coercion, setup some variables, and handle any errors
    // encountered while executing it.
    return function (view, partials) {
      partials = partials || {};

      var stack = [view]; // context stack

      try {
        return fn(view, partials, stack, lookup, escapeHTML, renderSection, render);
      } catch (e) {
        throw debug(e.error, template, e.line, options.file);
      }
    };
  }

  // Cache of pre-compiled templates.
  var _cache = {};

  /**
   * Clear the cache of compiled templates.
   */
  function clearCache() {
    _cache = {};
  }

  /**
   * Compiles the given `template` into a reusable function using the given
   * `options`. In addition to the options accepted by Mustache.parse,
   * recognized options include the following:
   *
   *   - cache    Set `false` to bypass any pre-compiled version of the given
   *              template. Otherwise, a given `template` string will be cached
   *              the first time it is parsed
   */
  function compile(template, options) {
    options = options || {};

    // Use a pre-compiled version from the cache if we have one.
    if (options.cache !== false) {
      if (!_cache[template]) {
        _cache[template] = _compile(template, options);
      }

      return _cache[template];
    }

    return _compile(template, options);
  }

  /**
   * High-level function that renders the given `template` using the given
   * `view` and `partials`. If you need to use any of the template options (see
   * `compile` above), you must compile in a separate step, and then call that
   * compiled function.
   */
  function render(template, view, partials) {
    return compile(template)(view, partials);
  }

})(Mustache);
;
/**
* A handy class to calculate color values.
*
* @version 1.0
* @author Robert Eisele <robert@xarg.org>
* @copyright Copyright (c) 2010, Robert Eisele
* @link http://www.xarg.org/2010/03/generate-client-side-png-files-using-javascript/
* @license http://www.opensource.org/licenses/bsd-license.php BSD License
*
*/

(function() {

	// helper functions for that ctx
	function write(buffer, offs) {
		for (var i = 2; i < arguments.length; i++) {
			for (var j = 0; j < arguments[i].length; j++) {
				buffer[offs++] = arguments[i].charAt(j);
			}
		}
	}

	function byte2(w) {
		return String.fromCharCode((w >> 8) & 255, w & 255);
	}

	function byte4(w) {
		return String.fromCharCode((w >> 24) & 255, (w >> 16) & 255, (w >> 8) & 255, w & 255);
	}

	function byte2lsb(w) {
		return String.fromCharCode(w & 255, (w >> 8) & 255);
	}

	window.PNGlib = function(width,height,depth) {

		this.width   = width;
		this.height  = height;
		this.depth   = depth;

		// pixel data and row filter identifier size
		this.pix_size = height * (width + 1);

		// deflate header, pix_size, block headers, adler32 checksum
		this.data_size = 2 + this.pix_size + 5 * Math.floor((0xfffe + this.pix_size) / 0xffff) + 4;

		// offsets and sizes of Png chunks
		this.ihdr_offs = 0;									// IHDR offset and size
		this.ihdr_size = 4 + 4 + 13 + 4;
		this.plte_offs = this.ihdr_offs + this.ihdr_size;	// PLTE offset and size
		this.plte_size = 4 + 4 + 3 * depth + 4;
		this.trns_offs = this.plte_offs + this.plte_size;	// tRNS offset and size
		this.trns_size = 4 + 4 + depth + 4;
		this.idat_offs = this.trns_offs + this.trns_size;	// IDAT offset and size
		this.idat_size = 4 + 4 + this.data_size + 4;
		this.iend_offs = this.idat_offs + this.idat_size;	// IEND offset and size
		this.iend_size = 4 + 4 + 4;
		this.buffer_size  = this.iend_offs + this.iend_size;	// total PNG size

		this.buffer  = new Array();
		this.palette = new Object();
		this.pindex  = 0;

		var _crc32 = new Array();

		// initialize buffer with zero bytes
		for (var i = 0; i < this.buffer_size; i++) {
			this.buffer[i] = "\x00";
		}

		// initialize non-zero elements
		write(this.buffer, this.ihdr_offs, byte4(this.ihdr_size - 12), 'IHDR', byte4(width), byte4(height), "\x08\x03");
		write(this.buffer, this.plte_offs, byte4(this.plte_size - 12), 'PLTE');
		write(this.buffer, this.trns_offs, byte4(this.trns_size - 12), 'tRNS');
		write(this.buffer, this.idat_offs, byte4(this.idat_size - 12), 'IDAT');
		write(this.buffer, this.iend_offs, byte4(this.iend_size - 12), 'IEND');

		// initialize deflate header
		var header = ((8 + (7 << 4)) << 8) | (3 << 6);
		header+= 31 - (header % 31);

		write(this.buffer, this.idat_offs + 8, byte2(header));

		// initialize deflate block headers
		for (var i = 0; (i << 16) - 1 < this.pix_size; i++) {
			var size, bits;
			if (i + 0xffff < this.pix_size) {
				size = 0xffff;
				bits = "\x00";
			} else {
				size = this.pix_size - (i << 16) - i;
				bits = "\x01";
			}
			write(this.buffer, this.idat_offs + 8 + 2 + (i << 16) + (i << 2), bits, byte2lsb(size), byte2lsb(~size));
		}

		/* Create crc32 lookup table */
		for (var i = 0; i < 256; i++) {
			var c = i;
			for (var j = 0; j < 8; j++) {
				if (c & 1) {
					c = -306674912 ^ ((c >> 1) & 0x7fffffff);
				} else {
					c = (c >> 1) & 0x7fffffff;
				}
			}
			_crc32[i] = c;
		}

		// compute the index into a png for a given pixel
		this.index = function(x,y) {
			var i = y * (this.width + 1) + x + 1;
			var j = this.idat_offs + 8 + 2 + 5 * Math.floor((i / 0xffff) + 1) + i;
			return j;
		}

		// convert a color and build up the palette
		this.color = function(red, green, blue, alpha) {

			alpha = alpha >= 0 ? alpha : 255;
			var color = (((((alpha << 8) | red) << 8) | green) << 8) | blue;

			if (typeof this.palette[color] == "undefined") {
				if (this.pindex == this.depth) return "\x00";

				var ndx = this.plte_offs + 8 + 3 * this.pindex;

				this.buffer[ndx + 0] = String.fromCharCode(red);
				this.buffer[ndx + 1] = String.fromCharCode(green);
				this.buffer[ndx + 2] = String.fromCharCode(blue);
				this.buffer[this.trns_offs+8+this.pindex] = String.fromCharCode(alpha);

				this.palette[color] = String.fromCharCode(this.pindex++);
			}
			return this.palette[color];
		}

		// output a PNG string, Base64 encoded
		this.getBase64 = function() {

			var s = this.getDump();

			var ch = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
			var c1, c2, c3, e1, e2, e3, e4;
			var l = s.length;
			var i = 0;
			var r = "";

			do {
				c1 = s.charCodeAt(i);
				e1 = c1 >> 2;
				c2 = s.charCodeAt(i+1);
				e2 = ((c1 & 3) << 4) | (c2 >> 4);
				c3 = s.charCodeAt(i+2);
				if (l < i+2) { e3 = 64; } else { e3 = ((c2 & 0xf) << 2) | (c3 >> 6); }
				if (l < i+3) { e4 = 64; } else { e4 = c3 & 0x3f; }
				r+= ch.charAt(e1) + ch.charAt(e2) + ch.charAt(e3) + ch.charAt(e4);
			} while ((i+= 3) < l);
			return r;
		}

		// output a PNG string
		this.getDump = function() {

			// compute adler32 of output pixels + row filter bytes
			var BASE = 65521; /* largest prime smaller than 65536 */
			var NMAX = 5552;  /* NMAX is the largest n such that 255n(n+1)/2 + (n+1)(BASE-1) <= 2^32-1 */
			var s1 = 1;
			var s2 = 0;
			var n = NMAX;

			for (var y = 0; y < this.height; y++) {
				for (var x = -1; x < this.width; x++) {
					s1+= this.buffer[this.index(x, y)].charCodeAt(0);
					s2+= s1;
					if ((n-= 1) == 0) {
						s1%= BASE;
						s2%= BASE;
						n = NMAX;
					}
				}
			}
			s1%= BASE;
			s2%= BASE;
			write(this.buffer, this.idat_offs + this.idat_size - 8, byte4((s2 << 16) | s1));

			// compute crc32 of the PNG chunks
			function crc32(png, offs, size) {
				var crc = -1;
				for (var i = 4; i < size-4; i += 1) {
					crc = _crc32[(crc ^ png[offs+i].charCodeAt(0)) & 0xff] ^ ((crc >> 8) & 0x00ffffff);
				}
				write(png, offs+size-4, byte4(crc ^ -1));
			}

			crc32(this.buffer, this.ihdr_offs, this.ihdr_size);
			crc32(this.buffer, this.plte_offs, this.plte_size);
			crc32(this.buffer, this.trns_offs, this.trns_size);
			crc32(this.buffer, this.idat_offs, this.idat_size);
			crc32(this.buffer, this.iend_offs, this.iend_size);

			// convert PNG to string
			return "\211PNG\r\n\032\n"+this.buffer.join('');
		}
	}

})();
;
define("ace/theme/twilight",["require","exports","module","ace/lib/dom"],function(a,b,c){b.isDark=!0,b.cssClass="ace-twilight",b.cssText=".ace-twilight .ace_editor {  border: 2px solid rgb(159, 159, 159);}.ace-twilight .ace_editor.ace_focus {  border: 2px solid #327fbd;}.ace-twilight .ace_gutter {  background: #e8e8e8;  color: #333;}.ace-twilight .ace_print_margin {  width: 1px;  background: #e8e8e8;}.ace-twilight .ace_scroller {  background-color: #141414;}.ace-twilight .ace_text-layer {  cursor: text;  color: #F8F8F8;}.ace-twilight .ace_cursor {  border-left: 2px solid #A7A7A7;}.ace-twilight .ace_cursor.ace_overwrite {  border-left: 0px;  border-bottom: 1px solid #A7A7A7;}.ace-twilight .ace_marker-layer .ace_selection {  background: rgba(221, 240, 255, 0.20);}.ace-twilight.multiselect .ace_selection.start {  box-shadow: 0 0 3px 0px #141414;  border-radius: 2px;}.ace-twilight .ace_marker-layer .ace_step {  background: rgb(198, 219, 174);}.ace-twilight .ace_marker-layer .ace_bracket {  margin: -1px 0 0 -1px;  border: 1px solid rgba(255, 255, 255, 0.25);}.ace-twilight .ace_marker-layer .ace_active_line {  background: rgba(255, 255, 255, 0.031);}.ace-twilight .ace_marker-layer .ace_selected_word {  border: 1px solid rgba(221, 240, 255, 0.20);}.ace-twilight .ace_invisible {  color: rgba(255, 255, 255, 0.25);}.ace-twilight .ace_keyword, .ace-twilight .ace_meta {  color:#CDA869;}.ace-twilight .ace_constant, .ace-twilight .ace_constant.ace_other {  color:#CF6A4C;}.ace-twilight .ace_constant.ace_character,  {  color:#CF6A4C;}.ace-twilight .ace_constant.ace_character.ace_escape,  {  color:#CF6A4C;}.ace-twilight .ace_invalid.ace_illegal {  color:#F8F8F8;background-color:rgba(86, 45, 86, 0.75);}.ace-twilight .ace_invalid.ace_deprecated {  text-decoration:underline;font-style:italic;color:#D2A8A1;}.ace-twilight .ace_support {  color:#9B859D;}.ace-twilight .ace_support.ace_constant {  color:#CF6A4C;}.ace-twilight .ace_fold {    background-color: #AC885B;    border-color: #F8F8F8;}.ace-twilight .ace_support.ace_function {  color:#DAD085;}.ace-twilight .ace_storage {  color:#F9EE98;}.ace-twilight .ace_variable {  color:#AC885B;}.ace-twilight .ace_string {  color:#8F9D6A;}.ace-twilight .ace_string.ace_regexp {  color:#E9C062;}.ace-twilight .ace_comment {  font-style:italic;color:#5F5A60;}.ace-twilight .ace_variable {  color:#7587A6;}.ace-twilight .ace_xml_pe {  color:#494949;}.ace-twilight .ace_meta.ace_tag {  color:#AC885B;}.ace-twilight .ace_entity.ace_name.ace_function {  color:#AC885B;}.ace-twilight .ace_markup.ace_underline {    text-decoration:underline;}.ace-twilight .ace_markup.ace_heading {  color:#CF6A4C;}.ace-twilight .ace_markup.ace_list {  color:#F9EE98;}";var d=a("../lib/dom");d.importCssString(b.cssText,b.cssClass)})
;
// Underscore.js 1.3.3
// (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
// Underscore is freely distributable under the MIT license.
// Portions of Underscore are inspired or borrowed from Prototype,
// Oliver Steele's Functional, and John Resig's Micro-Templating.
// For all details and documentation:
// http://documentcloud.github.com/underscore
(function(){function r(a,c,d){if(a===c)return 0!==a||1/a==1/c;if(null==a||null==c)return a===c;a._chain&&(a=a._wrapped);c._chain&&(c=c._wrapped);if(a.isEqual&&b.isFunction(a.isEqual))return a.isEqual(c);if(c.isEqual&&b.isFunction(c.isEqual))return c.isEqual(a);var e=l.call(a);if(e!=l.call(c))return!1;switch(e){case "[object String]":return a==""+c;case "[object Number]":return a!=+a?c!=+c:0==a?1/a==1/c:a==+c;case "[object Date]":case "[object Boolean]":return+a==+c;case "[object RegExp]":return a.source==
c.source&&a.global==c.global&&a.multiline==c.multiline&&a.ignoreCase==c.ignoreCase}if("object"!=typeof a||"object"!=typeof c)return!1;for(var f=d.length;f--;)if(d[f]==a)return!0;d.push(a);var f=0,g=!0;if("[object Array]"==e){if(f=a.length,g=f==c.length)for(;f--&&(g=f in a==f in c&&r(a[f],c[f],d)););}else{if("constructor"in a!="constructor"in c||a.constructor!=c.constructor)return!1;for(var h in a)if(b.has(a,h)&&(f++,!(g=b.has(c,h)&&r(a[h],c[h],d))))break;if(g){for(h in c)if(b.has(c,h)&&!f--)break;
g=!f}}d.pop();return g}var s=this,I=s._,o={},k=Array.prototype,p=Object.prototype,i=k.slice,J=k.unshift,l=p.toString,K=p.hasOwnProperty,y=k.forEach,z=k.map,A=k.reduce,B=k.reduceRight,C=k.filter,D=k.every,E=k.some,q=k.indexOf,F=k.lastIndexOf,p=Array.isArray,L=Object.keys,t=Function.prototype.bind,b=function(a){return new m(a)};"undefined"!==typeof exports?("undefined"!==typeof module&&module.exports&&(exports=module.exports=b),exports._=b):s._=b;b.VERSION="1.3.3";var j=b.each=b.forEach=function(a,
c,d){if(a!=null)if(y&&a.forEach===y)a.forEach(c,d);else if(a.length===+a.length)for(var e=0,f=a.length;e<f;e++){if(e in a&&c.call(d,a[e],e,a)===o)break}else for(e in a)if(b.has(a,e)&&c.call(d,a[e],e,a)===o)break};b.map=b.collect=function(a,c,b){var e=[];if(a==null)return e;if(z&&a.map===z)return a.map(c,b);j(a,function(a,g,h){e[e.length]=c.call(b,a,g,h)});if(a.length===+a.length)e.length=a.length;return e};b.reduce=b.foldl=b.inject=function(a,c,d,e){var f=arguments.length>2;a==null&&(a=[]);if(A&&
a.reduce===A){e&&(c=b.bind(c,e));return f?a.reduce(c,d):a.reduce(c)}j(a,function(a,b,i){if(f)d=c.call(e,d,a,b,i);else{d=a;f=true}});if(!f)throw new TypeError("Reduce of empty array with no initial value");return d};b.reduceRight=b.foldr=function(a,c,d,e){var f=arguments.length>2;a==null&&(a=[]);if(B&&a.reduceRight===B){e&&(c=b.bind(c,e));return f?a.reduceRight(c,d):a.reduceRight(c)}var g=b.toArray(a).reverse();e&&!f&&(c=b.bind(c,e));return f?b.reduce(g,c,d,e):b.reduce(g,c)};b.find=b.detect=function(a,
c,b){var e;G(a,function(a,g,h){if(c.call(b,a,g,h)){e=a;return true}});return e};b.filter=b.select=function(a,c,b){var e=[];if(a==null)return e;if(C&&a.filter===C)return a.filter(c,b);j(a,function(a,g,h){c.call(b,a,g,h)&&(e[e.length]=a)});return e};b.reject=function(a,c,b){var e=[];if(a==null)return e;j(a,function(a,g,h){c.call(b,a,g,h)||(e[e.length]=a)});return e};b.every=b.all=function(a,c,b){var e=true;if(a==null)return e;if(D&&a.every===D)return a.every(c,b);j(a,function(a,g,h){if(!(e=e&&c.call(b,
a,g,h)))return o});return!!e};var G=b.some=b.any=function(a,c,d){c||(c=b.identity);var e=false;if(a==null)return e;if(E&&a.some===E)return a.some(c,d);j(a,function(a,b,h){if(e||(e=c.call(d,a,b,h)))return o});return!!e};b.include=b.contains=function(a,c){var b=false;if(a==null)return b;if(q&&a.indexOf===q)return a.indexOf(c)!=-1;return b=G(a,function(a){return a===c})};b.invoke=function(a,c){var d=i.call(arguments,2);return b.map(a,function(a){return(b.isFunction(c)?c||a:a[c]).apply(a,d)})};b.pluck=
function(a,c){return b.map(a,function(a){return a[c]})};b.max=function(a,c,d){if(!c&&b.isArray(a)&&a[0]===+a[0])return Math.max.apply(Math,a);if(!c&&b.isEmpty(a))return-Infinity;var e={computed:-Infinity};j(a,function(a,b,h){b=c?c.call(d,a,b,h):a;b>=e.computed&&(e={value:a,computed:b})});return e.value};b.min=function(a,c,d){if(!c&&b.isArray(a)&&a[0]===+a[0])return Math.min.apply(Math,a);if(!c&&b.isEmpty(a))return Infinity;var e={computed:Infinity};j(a,function(a,b,h){b=c?c.call(d,a,b,h):a;b<e.computed&&
(e={value:a,computed:b})});return e.value};b.shuffle=function(a){var b=[],d;j(a,function(a,f){d=Math.floor(Math.random()*(f+1));b[f]=b[d];b[d]=a});return b};b.sortBy=function(a,c,d){var e=b.isFunction(c)?c:function(a){return a[c]};return b.pluck(b.map(a,function(a,b,c){return{value:a,criteria:e.call(d,a,b,c)}}).sort(function(a,b){var c=a.criteria,d=b.criteria;return c===void 0?1:d===void 0?-1:c<d?-1:c>d?1:0}),"value")};b.groupBy=function(a,c){var d={},e=b.isFunction(c)?c:function(a){return a[c]};
j(a,function(a,b){var c=e(a,b);(d[c]||(d[c]=[])).push(a)});return d};b.sortedIndex=function(a,c,d){d||(d=b.identity);for(var e=0,f=a.length;e<f;){var g=e+f>>1;d(a[g])<d(c)?e=g+1:f=g}return e};b.toArray=function(a){return!a?[]:b.isArray(a)||b.isArguments(a)?i.call(a):a.toArray&&b.isFunction(a.toArray)?a.toArray():b.values(a)};b.size=function(a){return b.isArray(a)?a.length:b.keys(a).length};b.first=b.head=b.take=function(a,b,d){return b!=null&&!d?i.call(a,0,b):a[0]};b.initial=function(a,b,d){return i.call(a,
0,a.length-(b==null||d?1:b))};b.last=function(a,b,d){return b!=null&&!d?i.call(a,Math.max(a.length-b,0)):a[a.length-1]};b.rest=b.tail=function(a,b,d){return i.call(a,b==null||d?1:b)};b.compact=function(a){return b.filter(a,function(a){return!!a})};b.flatten=function(a,c){return b.reduce(a,function(a,e){if(b.isArray(e))return a.concat(c?e:b.flatten(e));a[a.length]=e;return a},[])};b.without=function(a){return b.difference(a,i.call(arguments,1))};b.uniq=b.unique=function(a,c,d){var d=d?b.map(a,d):a,
e=[];a.length<3&&(c=true);b.reduce(d,function(d,g,h){if(c?b.last(d)!==g||!d.length:!b.include(d,g)){d.push(g);e.push(a[h])}return d},[]);return e};b.union=function(){return b.uniq(b.flatten(arguments,true))};b.intersection=b.intersect=function(a){var c=i.call(arguments,1);return b.filter(b.uniq(a),function(a){return b.every(c,function(c){return b.indexOf(c,a)>=0})})};b.difference=function(a){var c=b.flatten(i.call(arguments,1),true);return b.filter(a,function(a){return!b.include(c,a)})};b.zip=function(){for(var a=
i.call(arguments),c=b.max(b.pluck(a,"length")),d=Array(c),e=0;e<c;e++)d[e]=b.pluck(a,""+e);return d};b.indexOf=function(a,c,d){if(a==null)return-1;var e;if(d){d=b.sortedIndex(a,c);return a[d]===c?d:-1}if(q&&a.indexOf===q)return a.indexOf(c);d=0;for(e=a.length;d<e;d++)if(d in a&&a[d]===c)return d;return-1};b.lastIndexOf=function(a,b){if(a==null)return-1;if(F&&a.lastIndexOf===F)return a.lastIndexOf(b);for(var d=a.length;d--;)if(d in a&&a[d]===b)return d;return-1};b.range=function(a,b,d){if(arguments.length<=
1){b=a||0;a=0}for(var d=arguments[2]||1,e=Math.max(Math.ceil((b-a)/d),0),f=0,g=Array(e);f<e;){g[f++]=a;a=a+d}return g};var H=function(){};b.bind=function(a,c){var d,e;if(a.bind===t&&t)return t.apply(a,i.call(arguments,1));if(!b.isFunction(a))throw new TypeError;e=i.call(arguments,2);return d=function(){if(!(this instanceof d))return a.apply(c,e.concat(i.call(arguments)));H.prototype=a.prototype;var b=new H,g=a.apply(b,e.concat(i.call(arguments)));return Object(g)===g?g:b}};b.bindAll=function(a){var c=
i.call(arguments,1);c.length==0&&(c=b.functions(a));j(c,function(c){a[c]=b.bind(a[c],a)});return a};b.memoize=function(a,c){var d={};c||(c=b.identity);return function(){var e=c.apply(this,arguments);return b.has(d,e)?d[e]:d[e]=a.apply(this,arguments)}};b.delay=function(a,b){var d=i.call(arguments,2);return setTimeout(function(){return a.apply(null,d)},b)};b.defer=function(a){return b.delay.apply(b,[a,1].concat(i.call(arguments,1)))};b.throttle=function(a,c){var d,e,f,g,h,i,j=b.debounce(function(){h=
g=false},c);return function(){d=this;e=arguments;f||(f=setTimeout(function(){f=null;h&&a.apply(d,e);j()},c));g?h=true:i=a.apply(d,e);j();g=true;return i}};b.debounce=function(a,b,d){var e;return function(){var f=this,g=arguments;d&&!e&&a.apply(f,g);clearTimeout(e);e=setTimeout(function(){e=null;d||a.apply(f,g)},b)}};b.once=function(a){var b=false,d;return function(){if(b)return d;b=true;return d=a.apply(this,arguments)}};b.wrap=function(a,b){return function(){var d=[a].concat(i.call(arguments,0));
return b.apply(this,d)}};b.compose=function(){var a=arguments;return function(){for(var b=arguments,d=a.length-1;d>=0;d--)b=[a[d].apply(this,b)];return b[0]}};b.after=function(a,b){return a<=0?b():function(){if(--a<1)return b.apply(this,arguments)}};b.keys=L||function(a){if(a!==Object(a))throw new TypeError("Invalid object");var c=[],d;for(d in a)b.has(a,d)&&(c[c.length]=d);return c};b.values=function(a){return b.map(a,b.identity)};b.functions=b.methods=function(a){var c=[],d;for(d in a)b.isFunction(a[d])&&
c.push(d);return c.sort()};b.extend=function(a){j(i.call(arguments,1),function(b){for(var d in b)a[d]=b[d]});return a};b.pick=function(a){var c={};j(b.flatten(i.call(arguments,1)),function(b){b in a&&(c[b]=a[b])});return c};b.defaults=function(a){j(i.call(arguments,1),function(b){for(var d in b)a[d]==null&&(a[d]=b[d])});return a};b.clone=function(a){return!b.isObject(a)?a:b.isArray(a)?a.slice():b.extend({},a)};b.tap=function(a,b){b(a);return a};b.isEqual=function(a,b){return r(a,b,[])};b.isEmpty=
function(a){if(a==null)return true;if(b.isArray(a)||b.isString(a))return a.length===0;for(var c in a)if(b.has(a,c))return false;return true};b.isElement=function(a){return!!(a&&a.nodeType==1)};b.isArray=p||function(a){return l.call(a)=="[object Array]"};b.isObject=function(a){return a===Object(a)};b.isArguments=function(a){return l.call(a)=="[object Arguments]"};b.isArguments(arguments)||(b.isArguments=function(a){return!(!a||!b.has(a,"callee"))});b.isFunction=function(a){return l.call(a)=="[object Function]"};
b.isString=function(a){return l.call(a)=="[object String]"};b.isNumber=function(a){return l.call(a)=="[object Number]"};b.isFinite=function(a){return b.isNumber(a)&&isFinite(a)};b.isNaN=function(a){return a!==a};b.isBoolean=function(a){return a===true||a===false||l.call(a)=="[object Boolean]"};b.isDate=function(a){return l.call(a)=="[object Date]"};b.isRegExp=function(a){return l.call(a)=="[object RegExp]"};b.isNull=function(a){return a===null};b.isUndefined=function(a){return a===void 0};b.has=function(a,
b){return K.call(a,b)};b.noConflict=function(){s._=I;return this};b.identity=function(a){return a};b.times=function(a,b,d){for(var e=0;e<a;e++)b.call(d,e)};b.escape=function(a){return(""+a).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#x27;").replace(/\//g,"&#x2F;")};b.result=function(a,c){if(a==null)return null;var d=a[c];return b.isFunction(d)?d.call(a):d};b.mixin=function(a){j(b.functions(a),function(c){M(c,b[c]=a[c])})};var N=0;b.uniqueId=
function(a){var b=N++;return a?a+b:b};b.templateSettings={evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,escape:/<%-([\s\S]+?)%>/g};var u=/.^/,n={"\\":"\\","'":"'",r:"\r",n:"\n",t:"\t",u2028:"\u2028",u2029:"\u2029"},v;for(v in n)n[n[v]]=v;var O=/\\|'|\r|\n|\t|\u2028|\u2029/g,P=/\\(\\|'|r|n|t|u2028|u2029)/g,w=function(a){return a.replace(P,function(a,b){return n[b]})};b.template=function(a,c,d){d=b.defaults(d||{},b.templateSettings);a="__p+='"+a.replace(O,function(a){return"\\"+n[a]}).replace(d.escape||
u,function(a,b){return"'+\n_.escape("+w(b)+")+\n'"}).replace(d.interpolate||u,function(a,b){return"'+\n("+w(b)+")+\n'"}).replace(d.evaluate||u,function(a,b){return"';\n"+w(b)+"\n;__p+='"})+"';\n";d.variable||(a="with(obj||{}){\n"+a+"}\n");var a="var __p='';var print=function(){__p+=Array.prototype.join.call(arguments, '')};\n"+a+"return __p;\n",e=new Function(d.variable||"obj","_",a);if(c)return e(c,b);c=function(a){return e.call(this,a,b)};c.source="function("+(d.variable||"obj")+"){\n"+a+"}";return c};
b.chain=function(a){return b(a).chain()};var m=function(a){this._wrapped=a};b.prototype=m.prototype;var x=function(a,c){return c?b(a).chain():a},M=function(a,c){m.prototype[a]=function(){var a=i.call(arguments);J.call(a,this._wrapped);return x(c.apply(b,a),this._chain)}};b.mixin(b);j("pop,push,reverse,shift,sort,splice,unshift".split(","),function(a){var b=k[a];m.prototype[a]=function(){var d=this._wrapped;b.apply(d,arguments);var e=d.length;(a=="shift"||a=="splice")&&e===0&&delete d[0];return x(d,
this._chain)}});j(["concat","join","slice"],function(a){var b=k[a];m.prototype[a]=function(){return x(b.apply(this._wrapped,arguments),this._chain)}});m.prototype.chain=function(){this._chain=true;return this};m.prototype.value=function(){return this._wrapped}}).call(this);
