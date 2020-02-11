'use strict';

var socket = io.connect('https://localhost:3002');
// var stream = ss.createStream();

const onMidiAccessSuccess = access => {
  midiAccess = access;

  var inputs = midiAccess.inputs;
  console.log(inputs);
  var inputIterators = inputs.values();

  var firstInput = inputIterators.next().value;

  if (!firstInput) return;
  firstInput.onmidimessage = handleMidiMessage;
  console.log('MIDI SUCCESS');
};

const onMidiAccessFailure = error => {
  console.log('Oops. Something were wrong with requestMIDIAccess', error.code);
};

const getMIDIMessage = message => {
  var command = message.data[0];
  var velocity = message.data.length > 2 ? message.data[2] : 0; // a velocity value might not be included with a noteOff command

  if (velocity > 0) {
    return 1; // noteOn
  } else {
    return 0; // noteOff
  }
};

const handleMidiMessage = e => {
  console.log(e);
  let newObj = {};
  newObj.note = e.data[1];
  newObj.status = getMIDIMessage(e);

  let payload = JSON.stringify(newObj, null, 2);

  // console.log(payload);
  // newObj.timeStamp = e.timeStamp; // unnecessary?
  ss(socket).emit('event', payload);
};

// MIDI access
var midiAccess = null;
navigator.requestMIDIAccess().then(onMidiAccessSuccess, onMidiAccessFailure);
