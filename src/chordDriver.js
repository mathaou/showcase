// @flow

import { pcset } from '@tonaljs/pcset';
import { chordType, entries } from '@tonaljs/chord-dictionary';
import { midiToNoteName, toMidi } from '@tonaljs/midi';
import { sortedNoteNames, permutations } from '@tonaljs/array';
import { fromSemitones } from '@tonaljs/interval';
import { chord } from '@tonaljs/chord';
import { transposeBy } from '@tonaljs/note';
import { distance } from '@tonaljs/tonal';

import Client from './mqttClient';
const client = new Client();

var chordArray = [];

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

export const transmit = (arr: any) => {
  var comparisons = [];

  var array = permutations(arr);

  for (var i = 0; i < array.length; i++) {
    var temp = array[i];
    var startingIndex = 3;
    var lowest = 0;

    // number here if desired

    var intervals = ['1P'];

    for (var x = 1; x < temp.length; x++) {
      let d = distance(temp[x - 1], temp[x]);
      intervals.push(d);
    }

    var score = 0;
    intervals.forEach(e => {
      // arbitrary for now, find better way
      if (e === '3M' || e === '3m' || e === '5P') score++;
    });

    var candidate = {
      notes: temp,
      intervals: intervals,
      score,
    };

    comparisons.push(candidate);
  }

  var max = Math.max(
    ...comparisons.map(e => {
      return e.score;
    })
  );

  var candidate = comparisons.filter(e => {
    if (e !== 'undefined' && e.score === max) return e;
  });

  console.log(candidate[0].notes);

  client.sendData(JSON.stringify(candidate[0].notes));
};

export const buildChord = (payload: any) => {
  const { note, status } = payload;

  chordArray.push(payload);

  console.log(payload);

  chordArray = chordArray.filter(e => {
    if (e.note === note && status === 0) return false;
    return true;
  });

  if (chordArray.length > 0) {
    var chordDetection = [];

    chordArray.map(e => {
      chordDetection.push(midiToNoteName(e.note, { sharps: true }).replace(/[\d]+/gmi, ''));
    });

    chordDetection = sortedNoteNames([...new Set(chordDetection)]); // ensure no duplicates (perhaps isolated bug)

    // transmit('D4 F#4 A4 B5'.split(' '));
    transmit(chordDetection);
  }
};
