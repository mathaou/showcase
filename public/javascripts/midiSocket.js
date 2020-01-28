(function midiSocket() {
  'use strict';

  console.log('App is running');

  // AUDIO CONTEXT

  var context;
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  context = new AudioContext();

  const playSound = (audioBuffer) => {
    var source = context.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(context.destination);
    source.start(0);
    console.timeEnd('send');
  }
  // WEBSOCKETS

  var client = new BinaryClient(location.origin.replace('https', 'wss').replace('https', 'wss') + '/socket');
  var MIDIStream = null;

  client.on('open', function () {
    MIDIStream = client.createStream();
  });

  client.on('stream', function (stream) {
    stream.on('data', handleReceiveAudioData);
    stream.on('end', handleEndAudioStream);
  })

  const handleReceiveAudioData = (data) => {
    console.log('receive audio data', data);
    context.decodeAudioData(data, playSound);
  }

  function handleEndAudioStream(data) {
    console.log('end', data);
  }

  // MIDI access
  var midiAccess = null;
  navigator.requestMIDIAccess().then(onMidiAccessSuccess, onMidiAccessFailure);

  const onMidiAccessSuccess = (access) => {
    midiAccess = access;

    var inputs = midiAccess.inputs;
    var inputIterators = inputs.values();

    var firstInput = inputIterators.next().value;

    if (!firstInput) return;
    firstInput.onmidimessage = handleMidiMessage;
  }

  const onMidiAccessFailure = (error) => {
    console.log('Oops. Something were wrong with requestMIDIAccess', error.code);
  }

  const handleMidiMessage = (e) => {
    if (!MIDIStream || e.data[0] !== 0x90) return;
    console.log(e);
    console.time('send');
    MIDIStream.write(e.data);
  }
})();