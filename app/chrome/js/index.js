(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* global chrome:false */
/* global FileReader:false */

chrome.devtools.panels.create('COBI', 'app/images/cobi-icon.png', 'app/index.html', function (panel) {
  // code invoked on panel creation
  var isEnabled = document.getElementById('is-cobi-supported');
  chrome.devtools.inspectedWindow.eval('COBI !== null && COBI !== undefined', function (result, isException) {
    if (isException) {
      return isEnabled.innerHTML = 'ERROR ' + result;
    }
    isEnabled.innerHTML = result;
  });

  var tcUp = document.getElementById('tc-up');
  var tcDown = document.getElementById('tc-down');
  var tcRight = document.getElementById('tc-right');
  var tcLeft = document.getElementById('tc-left');
  var resultOut = document.getElementById('eval-output');

  var reader = new FileReader();
  reader.onload = function (evt) {
    var content = JSON.parse(evt.target.result);
    var counter = 1;
    for (var msg in content) {
      var val = content[msg];
      var channel = toMixedCase(val.channel);
      var property = toMixedCase(val.property);
      // var payload = val.payload
      setTimeout(function (value) {
        chrome.devtools.inspectedWindow.eval('console.log(' + value + ')'); //, function(result, isException) {resultOut.innerHTML = value;});
      }.bind(null, JSON.stringify(channel + '/' + property + '= ' + val.payload)), 100 * counter);

      // ----------------
      setTimeout(sendCommand.bind(this, channel + '/' + property, JSON.stringify(val.payload)), 100 * counter);
      counter++;
    };
  };

  var input = document.getElementById('input-file');
  input.addEventListener('change', function () {
    reader.readAsText(input.files[0]);
    // resultOut.innerHTML = "input file:";
  });

  tcUp.addEventListener('click', sendTcAction.bind(this, 'UP', resultOut));
  tcDown.addEventListener('click', sendTcAction.bind(this, 'DOWN', resultOut));
  tcLeft.addEventListener('click', sendTcAction.bind(this, 'LEFT', resultOut));
  tcRight.addEventListener('click', sendTcAction.bind(this, 'RIGHT', resultOut));
});

function sendTcAction(value, container) {
  chrome.devtools.inspectedWindow.eval('COBI.__emitter.emit("hub/externalInterfaceAction", "' + value + '")', function (result, isException) {
    container.innerHTML = 'tc: ' + result;
  });
}

function sendCommand(path, value) {
  chrome.devtools.inspectedWindow.eval('COBI.__emitter.emit("' + path + '", ' + value + ')');
}

function toMixedCase(name) {
  var words = name.split('_').map(function (w) {
    return w[0].toUpperCase() + w.substr(1).toLowerCase();
  });
  return words[0].toLowerCase() + words.slice(1).join('');
}

},{}]},{},[1]);
