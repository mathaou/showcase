// @flow

import { midiToNoteName, toMidi } from '@tonaljs/midi';
import { sortedNoteNames, permutations } from '@tonaljs/array';
import { fromSemitones } from '@tonaljs/interval';
import { transposeBy } from '@tonaljs/note';
import { distance } from '@tonaljs/tonal';

const normalizeToC = (candidate: any) => {
  var distanceFromC = toMidi(candidate.notes[0]) % 12;
  var transpose = fromSemitones(
    distanceFromC < 6 ? distanceFromC * -1 : 12 - distanceFromC
  );

  candidate.notes = candidate.notes.map(transposeBy(transpose));
};

const numberFromRoot = (temp: any) => {
  var startingIndex = 3;
  var lowest = toMidi(
    `${temp[startingIndex].replace(/[\d]/gm, '')}${startingIndex}`
  );

  return temp.map(e => {
    let trim = e.replace(/[\d]/gm, '');
    let valToCheck = toMidi(`${trim}${startingIndex}`);

    if (valToCheck > lowest) {
      lowest = valToCheck;
    } else {
      startingIndex++;
      lowest = toMidi(`${trim}${startingIndex}`);
    }

    return `${trim}${startingIndex}`;
  });
};

export const transmit = (mqttClient: any, arr: any, sharp: boolean) => {
  var comparisons = [];

  var array = permutations(arr);

  // console.log(array);

  for (var i = 0; i < array.length; i++) {
    var temp = array[i];
    var startingIndex = 3;
    var lowest = 0;

    /*======================+
     |number here if desired|
     +======================*/

    var intervals = ['1P'];

    for (var x = 1; x < temp.length; x++) {
      let d = distance(temp[x - 1], temp[x]);
      intervals.push(d);
    }

    var score = 0;
    intervals.forEach(e => {
      /*==================================+
       |arbitrary for now, find better way|
       +==================================*/
      if (e === '3M' || e === '2A' || e === '3m' || e === '5P') score++;
    });

    var candidate = {
      notes: temp,
      intervals: intervals,
      score,
    };

    comparisons.push(candidate);
  }

  // console.log(comparisons);

  /*==========================================+
   |Filter by some maximum score if that helps|
   +==========================================*/

  // var max = Math.max(
  //   ...comparisons.map(e => {
  //     return e.score;
  //   })
  // );

  var candidate = comparisons.filter(e => {
    if (e !== 'undefined') return e;
  });

  /*=============================================================+
   |Sends the first candidte - the intervals will be sent as well|
   |~-~-~-~-~-~-~-~-later, once kinks ironed out~-~-~-~-~-~-~-~-~|
   +=============================================================*/
  var candidateNotes = candidate[0].notes;
  mqttClient.sendData(JSON.stringify(candidateNotes));

  /*==================================================================================+
   |Gross but the only easy way I could think of to deal with mingus-python's devotion|
   |~-~-~-~-~-~-~-~-to adhering to strict definitions of a key center~-~-~-~-~-~-~-~-~|
   +==================================================================================*/
  if (candidateNotes.includes('C') || candidateNotes.includes('F') || candidateNotes.includes('E') || candidateNotes.includes('B')) {
    if(sharp) {
      mqttClient.sendData(
        JSON.stringify(
          candidateNotes.map(note => {
            if (note === 'F') return 'E#';
            else if (note === 'C') return 'B#';
            else return note;
          })
        )
      );
    } else {
      mqttClient.sendData(
        JSON.stringify(
          candidateNotes.map(note => {
            if (note === 'E') return 'Fb';
            else if (note === 'B') return 'Cb';
            else return note;
          })
        )
      );
    }
  }
};

export const buildChord = (mqttClient: any, payload: any) => {
  const { note, status } = payload;

  mqttClient.chordArray.push(payload);
  // console.log(payload);

  mqttClient.chordArray = mqttClient.chordArray.filter(e => {
    if (e.note === note && status === 0) return false;
    return true;
  });

  if (mqttClient.chordArray.length > 0) {
    var chordDetectionSharps = [];
    var chordDetectionFlats = [];

    /*======================================================+
     |Keep the note numbering for now, important for sorting|
     +======================================================*/
    mqttClient.chordArray.map(e => {
      chordDetectionFlats.push(
        midiToNoteName(e.note, { sharps: false })
      );
      chordDetectionSharps.push(
        midiToNoteName(e.note, { sharps: true })
      );
    });

    /*===========================================+
     |ensure no duplicates (perhaps isolated bug)|
     +===========================================*/
    chordDetectionSharps = sortedNoteNames([...new Set(chordDetectionSharps)]).map(note => {
      return note.replace(/[\d]+/gim, '');
    })
    chordDetectionFlats = sortedNoteNames([...new Set(chordDetectionFlats)]).map(note => {
      return note.replace(/[\d]+/gim, '');
    });

    /*====================+
     |For testing purposes|
     +====================*/
    // transmit('D4 F#4 A4 B5'.split(' '));

    transmit(mqttClient, chordDetectionSharps, true);
    if(chordDetectionSharps.toString() !== chordDetectionFlats.toString()) {
      transmit(mqttClient, chordDetectionFlats, false);
    }
  }
};
