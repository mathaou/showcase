'use strict';

// www.mfarstad.com on production
//.connect('https://www.mfarstad.com:3000', { transports: ['websocket'] });
var socket = io();

var buffer = [];
var lastPayloadSize = 0;

var midiConnections = [];
var selectedMidi = 0;

document.onkeypress = function(e) {
  e = e || window.event;
  let num = parseInt(e.key);
  if (!isNaN(num)) {
    if (num <= midiConnections.length) {
      selectedMidi = num - 1;
      switchMidi();
    }
  }
};

setInterval(() => {
  buffer.length = 0;
  ss(socket).emit('event', 'CLEAR');
}, 500);

socket.on('client', payload => {
  var data = payload.data;

  if (buffer.length === 0 || data[0].length !== lastPayloadSize) {
    data.map(e => {
      buffer.push(e);
    });

    buffer = [...new Set(buffer)]; // remove duplicates
    $('#chord-list').empty(); // clear area
    buffer.map(chord => {
      $('#chord-list')
        .append(`<span class='chord'>${chord.replace()}</span>`)
    });
  }

  lastPayloadSize = data[0].length;
});

const switchMidi = () => {
  console.log(`Switching to ${midiConnections[selectedMidi].name}`);
  midiConnections[selectedMidi].onmidimessage = handleMidiMessage;

  $(`.midiDevice`).css('color', 'black');
  $(`.midiDevice:eq(${selectedMidi})`).css('color', 'blue');
};

const onMidiAccessSuccess = access => {
  midiAccess = access;

  var inputs = midiAccess.inputs;
  var inputIterators = inputs.values();

  var firstInput = null;
  var firstTemp = null;

  let count = 1;

  for (
    var input = inputIterators.next();
    input && !input.done;
    input = inputIterators.next()
  ) {
    var deviceName = input.value.name;
    midiConnections.push(input.value);
    $('#midi-list').append(`<span class='midiDevice'>${count++}: ${deviceName}</span>`);
  }

  switchMidi();
};

const onMidiAccessFailure = error => {
  console.log('Oops. Something were wrong with requestMIDIAccess', error.code);
};

const getMIDIMessage = message => {
  var command = message.data[0];
  /*=============================================================+
   |a velocity value might not be included with a noteOff command|
   +=============================================================*/
  var velocity = message.data.length > 2 ? message.data[2] : 0;

  if (velocity > 0) {
    buffer.length = 0; // clear buffer on new noteOn event
    // $('#chord-list').empty();
    return 1; // noteOn
  } else {
    return 0; // noteOff
  }
};

const handleMidiMessage = e => {
  // console.log(e);
  let newObj = {};
  newObj.note = e.data[1];
  newObj.status = getMIDIMessage(e);

  let payload = JSON.stringify(newObj, null, 2);

  // console.log(payload);

  /*============+
   |unnecessary?|
   +============*/
  // newObj.timeStamp = e.timeStamp;
  ss(socket).emit('event', payload);
};

/*===========+
 |MIDI access|
 +===========*/
var midiAccess = null;
navigator.requestMIDIAccess().then(onMidiAccessSuccess, onMidiAccessFailure);
