chrome.browserAction.onClicked.addListener(function(tab) {
  chrome.tabs.insertCSS(null, {file: "factorial.css"});
  chrome.tabs.executeScript(null, {file: "target/.factorial.js"}, function(){
    chrome.tabs.executeScript(null, {code: "Factorial.main()"});
  });
});