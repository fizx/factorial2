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