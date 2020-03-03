'use strict';

// www.mfarstad.com on production
//.connect('https://www.mfarstad.com:3000', { transports: ['websocket'] });
var socket = io();

var buffer = [];
var lastPayloadSize = 0;

socket.on('client', payload => {
  var data = payload.data;

  setTimeout(() => {
    buffer.length = 0;
  }, 100);

  if(buffer.length === 0 || data[0].length !== lastPayloadSize) {
    data.map(e => {
      buffer.push(e);
    });

    buffer = [...new Set(buffer)]; // remove duplicates
    $('#chord-list').empty(); // clear area
    buffer.map(chord => {
      $('#chord-list').hide().append(`<span class='chord'>${chord.replace()}</span>`).fadeIn(100);
    });
  }

  lastPayloadSize = data[0].length;
});

const onMidiAccessSuccess = access => {
  midiAccess = access;

  var inputs = midiAccess.inputs;
  var inputIterators = inputs.values();

  var firstInput = null;
  var firstTemp = null;

  for (var input = inputIterators.next(); input && !input.done; input = inputIterators.next()) {
    firstTemp = input.value;
    if(firstInput === null){ 
      if(input.value.name.indexOf('Through') === -1 || input.value.name.indexOf('Output') === -1) firstInput = input.value;
    }
    var deviceName = input.value.name;
    // console.log(deviceName);
    $('#midi-list').append(`<span class='midiDevice'>${deviceName}</span>`);
  }

  if(firstInput === null) firstInput = firstTemp;

  console.log(`${firstInput.name} connected...`);

  firstInput.onmidimessage = handleMidiMessage;
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
