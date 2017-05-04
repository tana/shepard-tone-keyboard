var numKeys = 12;
var keyId = ["C", "Csharp", "D", "Dsharp", "E", "F", "Fsharp", "G", "Gsharp", "A", "Asharp", "B"];
var keyboardChars = ["d", "r", "f", "t", "g", "h", "u", "j", "i", "k", "o", "l"];
var keyElems = [];
var keyCodeToNote = {};
var pressed = [];

var attack = 0.05, decay = 0.05, sustain = 0.7, release=0.2;

var freqs = [];

// web audio context
var actx = new (window.AudioContext || window.webkitAudioContext)();

// generate shepard tone spectrum
var spectrumLen = 256;
var numOctave = 9;
var real = new Float32Array(spectrumLen);
var imag = new Float32Array(spectrumLen);
for (var i = 0, exp = 1; i < numOctave; i++, exp *= 2) {
  real[exp] = 0.5 * Math.cos(Math.PI * (i / numOctave)) + 0.5;
}
var shepardWave = actx.createPeriodicWave(real, imag);

var oscillators = [];
var gains = [];
var timers = [];

for (var i = 0; i < numKeys; i++) {
  // create mapping from keycode to note
  keyCodeToNote[keyboardChars[i].toUpperCase().charCodeAt(0)] = i;

  // fill pressed flags with false
  pressed[i] = false;

  // calculate (lowest) frequency for each notes
  freqs[i] = 55 * Math.pow(2, (i - 9) / 12);

  // create gain node for each notes
  gains[i] = actx.createGain();
  gains[i].connect(actx.destination);
}

window.addEventListener("load", function() {
  for (var i = 0; i < numKeys; i++) {
    // find all elements for keys
    var elem = document.getElementById(keyId[i]);
    keyElems[i] = elem;
  }

  document.addEventListener("keydown", function(e) {
    if (!(e.keyCode in keyCodeToNote)) {
      return;
    }

    var note = keyCodeToNote[e.keyCode];
    noteOn(note);
  });

  document.addEventListener("keyup", function(e) {
    if (!(e.keyCode in keyCodeToNote)) {
      return;
    }

    var note = keyCodeToNote[e.keyCode];
    noteOff(note);
  });

  document.getElementById("attack").addEventListener("change", changeEnvelope);
  document.getElementById("decay").addEventListener("change", changeEnvelope);
  document.getElementById("sustain").addEventListener("change", changeEnvelope);
  document.getElementById("release").addEventListener("change", changeEnvelope);

  document.getElementById("attack").value = attack.toString();
  document.getElementById("decay").value = decay.toString();
  document.getElementById("sustain").value = sustain.toString();
  document.getElementById("release").value = release.toString();

  // touch and mouse events
  for (var i = 0; i < numKeys; i++) {
    (function(note) {
      keyElems[note].addEventListener("touchstart", function(e) {
        noteOn(note);
      });

      keyElems[note].addEventListener("touchend", function(e) {
        noteOff(note);
      });

      keyElems[note].addEventListener("touchmove", function(e) {
        e.preventDefault();
      }, false);

      keyElems[note].addEventListener("mousedown", function(e) {
        noteOn(note);
      });

      keyElems[note].addEventListener("mouseup", function(e) {
        noteOff(note);
      });

    })(i);
  }
});

function noteOn(note) {
  if (pressed[note]) {
    return;
  }
  pressed[note] = true;

  if (timers[note]) {
    clearTimeout(timers[note]);
    timers[note] = undefined;
    oscillators[note].stop();
    oscillators[note].disconnect();
  }

  var osc = actx.createOscillator();
  osc.type = "sine";
  osc.setPeriodicWave(shepardWave);
  osc.frequency.value = freqs[note];
  oscillators[note] = osc;

  var gainNode = gains[note];
  gainNode.gain.cancelScheduledValues(actx.currentTime);
  gainNode.gain.value = 0.0;
  gainNode.gain.linearRampToValueAtTime(1.0, actx.currentTime + attack);
  gainNode.gain.linearRampToValueAtTime(sustain, actx.currentTime + attack + decay);

  osc.connect(gainNode);
  osc.start();

  keyElems[note].style.fill = "red";
}

function noteOff(note) {
  if (!pressed[note]) {
    return;
  }
  pressed[note] = false;

  gains[note].gain.cancelScheduledValues(actx.currentTime);
  gains[note].gain.linearRampToValueAtTime(0.0, actx.currentTime + release);
  timers[note] = setTimeout(function() {
    timers[note] = undefined;
    oscillators[note].stop();
    oscillators[note].disconnect();
  }, release * 1000);

  keyElems[note].style.fill = "";
}

// event handler for change in ADSR sliders
function changeEnvelope() {
  attack = parseFloat(document.getElementById("attack").value);
  decay = parseFloat(document.getElementById("decay").value);
  sustain = parseFloat(document.getElementById("sustain").value);
  release = parseFloat(document.getElementById("release").value);
}
