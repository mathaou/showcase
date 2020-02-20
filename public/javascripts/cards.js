'use strict';

var socket = io();

var registrationPayload = {};
var player = null;
var opponent = null;
var opponents = null;

var hand = null;

var discard1 = [];
var discard2 = [];
var discard3 = [];
var discard4 = [];

var oDiscard1 = [];
var oDiscard2 = [];
var oDiscard3 = [];
var oDiscard4 = [];

var building1 = [];
var building2 = [];
var building3 = [];
var building4 = [];

var currentStock = null;
var currentPlayer = null;
var selectedCard = -1;
var selectedArea = null;
var isTurn = false;
var numPlayers = 0;
var selectedOpponent = -1;

var opponentIndexes = {
  1: [2, 3, 4],
  2: [1, 3, 4],
  3: [1, 2, 4],
  4: [1, 2, 3],
};

const setNotification = text => {
  $('.notifications').html(`<span class='on notification-text'>${text}</span>`);
};

const getPlayer = () => {
  return JSON.stringify(player, null, 3);
};

const getOpponents = () => {
  return JSON.stringify(opponents, null, 3);
};

const getOpponent = () => {
  return JSON.stringify(opponent, null, 3);
};

const getSelectedPlayer = () => {
  console.log(currentPlayer);
  return $('.player-tabs .active').text();
};

const getCardFaceForValue = val => {
  let cardFace = val > 0 ? `${val}` : '*';
  cardFace = val < 10 || cardFace === '*' ? `${cardFace}&nbsp;` : `${cardFace}`;
  return cardFace;
};

const getDescriptorForValue = val => {
  return val > 0 ? `num-${val}` : 'wild';
};

/*
Something about this setup requires the server to send state packets to the 
client pseudo rapidly
Probably bad design and will incur large costs in deployment
Look into this...
*/

const handleOpponentDiscard = () => {
  if (opponent) {
    let oDiscard1ToCheck = opponent.discard1;
    let oDiscard2ToCheck = opponent.discard2;
    let oDiscard3ToCheck = opponent.discard3;
    let oDiscard4ToCheck = opponent.discard4;

    handleCard('opponent', 1, oDiscard1, oDiscard1ToCheck);
    handleCard('opponent', 2, oDiscard2, oDiscard2ToCheck);
    handleCard('opponent', 3, oDiscard3, oDiscard3ToCheck);
    handleCard('opponent', 4, oDiscard4, oDiscard4ToCheck);
  }
}

const clearOpponentDiscards = (target, n, targetN, targetNToCheck, doIt) => {
  let targetNPlayCard = $(`div[data-${target}-number="${n}"]`);

  let t = $(targetNPlayCard)
    .find('.mark')
    .text()
    .trim();
  let val = targetNToCheck[targetNToCheck.length - 1];

  let cardFace = getCardFaceForValue(val);
  let descriptor = getDescriptorForValue(val);

  if (t !== '&nbsp;&nbsp;') {
    for (let i = 1; i <= 12; i++) {
      $(targetNPlayCard).removeClass(`num-${i}`);
    }

    $(targetNPlayCard).removeClass(`wild`);

    $(targetNPlayCard)
      .find('.mark')
      .html('&nbsp;&nbsp;');
  }

  if (doIt) {
    $(targetNPlayCard).addClass(descriptor);
    $(targetNPlayCard)
      .find('.mark')
      .html(cardFace);

    targetN = targetNToCheck;
  }
};

const handleCard = (target, n, targetN, targetNToCheck) => {
  if (
    targetNToCheck.length > 0 &&
    JSON.stringify(targetNToCheck) !== JSON.stringify(targetN)
  ) {
    clearOpponentDiscards(target, n, targetN, targetNToCheck, true);
  } else if (targetNToCheck.length === 0) {
    clearOpponentDiscards(target, n, targetN, targetNToCheck, false);
  }
};

/*=============================+
 |Create the card given a value|
 +=============================*/

const createCard = val => {
  let descriptor = getDescriptorForValue(val);
  let cardFace = getCardFaceForValue(val);

  let mark = $('<span/>')
    .addClass('mark')
    .html(cardFace);
  let inner = $('<span/>')
    .addClass('inner')
    .append(mark);
  let card = $('<div/>')
    .addClass(`play-card ${descriptor}`)
    .append(inner);

  return card;
};



const toggleOpponent = val => {
  let playerClass = opponentIndexes[player.id].indexOf(val);
  let name = opponents.filter(data => {
    if (data.id === val) return true;
  })[0].name;

  $('#opponent .stock').attr('data', name);

  $(`.player-${playerClass + 2}-button`).addClass('active');
  $(`.player-${playerClass + 2}-button input`).prop('checked', true);
  $('.player-tabs .player-2-button').removeClass('active');
  $('.player-tabs .player-3-button').removeClass('active');
  $('.player-tabs .player-4-button').removeClass('active');
  $('.player-tabs input').prop('checked', false);
  $('#opponent').removeClass('player-1');
  $('#opponent').removeClass('player-2');
  $('#opponent').removeClass('player-3');
  $('#opponent').removeClass('player-4');
  $('#opponent').addClass(`player-${opponentIndexes[player.id][playerClass]}`);
  opponent = opponents[playerClass];

  let { stock } = opponent;

  $('#opponent .stock').empty();

  if (stock.length > 0) {
    $('#opponent .stock').append(createCard(stock[0]));
  }
};

const parseState = players => {
  var data = players.players;

  /*============================+
   |Get player state from server|
   +============================*/

  player = data.filter(player => {
    if (player.name === registrationPayload.name) return true;
  })[0];

  /*==========================================+
   |Handle the signifiers for the current turn|
   +==========================================*/

  if (
    (currentPlayer === null || currentPlayer !== players.currentPlayer) &&
    player !== 'undefined' &&
    data.length > 1
  ) {
    console.log(players.currentPlayer);
    currentPlayer = players.currentPlayer;
    let index = opponentIndexes[player.id].indexOf(currentPlayer);
    console.log(
      `Current player is ${currentPlayer} at index ${index}: ${JSON.stringify(
        opponentIndexes[player.id]
      )}`
    );

    $('.player-tabs .player-2-button').removeClass('current-turn');
    $('.player-tabs .player-3-button').removeClass('current-turn');
    $('.player-tabs .player-4-button').removeClass('current-turn');

    if (index === -1) {
      setNotification('Your turn!');
    } else {
      let name = data.filter(x => {
        let indexToCheck = opponentIndexes[player.id][index];
        if (x.id === indexToCheck) return true;
      })[0].name;

      setNotification(`Waiting for ${name}...`);

      $(`.player-tabs :nth-of-type(${index + 1})`).addClass('current-turn');
    }
  }

  /*====================+
   |Set the current turn|
   +====================*/

  if (currentPlayer) {
    if (currentPlayer === player.id) isTurn = true;
    else isTurn = false;
  }

  /*=====================+
   |Get opponents as well|
   +=====================*/

  if (player) {
    opponents = data.filter(o => {
      if (o.id === player.id) return false;
      else return true;
    });
    opponent = opponents[opponentIndexes[player.id].indexOf(selectedOpponent)];
  }

  /*=========================================+
   |First time, default to the first opponent|
   +=========================================*/

  if (selectedOpponent === -1 && numPlayers > 1) {
    selectedOpponent = opponentIndexes[player.id][0];
    $('#opponent').removeClass('hidden');
    toggleOpponent(selectedOpponent);
  }

  /*=================+
   |Setup the buttons|
   +=================*/

  if (data.length !== numPlayers) {
    if (data.length === 4) {
      $('.player-4-button, #player-3-button, #player-2-button').removeClass(
        'hidden'
      );
      $('#player4').after(`${opponents[2].id}`);
      if (hand === null) {
        $('#player3').after(`${opponents[1].id}`);
        $('#player2').after(`${opponents[0].id}`);
      }
    } else if (data.length === 3) {
      $('.player-3-button, .player-2-button').removeClass('hidden');
      $('#player3').after(`${opponents[1].id}`);
      if (hand === null) {
        $('#player2').after(`${opponents[0].id}`);
      }
    } else if (data.length === 2) {
      $('.player-2-button, .player-1-button').removeClass('hidden');
      $('#player2').after(`${opponents[0].id}`);
    }
  }

  $('#num-cards').html(players.deck.length);

  numPlayers = data.length;

  let handToCheck = player.hand;

  /*=======================================+
   |If incoming hand is different update UI|
   +=======================================*/

  if (hand === null || JSON.stringify(handToCheck) !== JSON.stringify(hand)) {
    $('#hand').empty();

    handToCheck.map(val => {
      let card = createCard(val);
      $('#hand').append(card);
    });

    hand = handToCheck;
  }

  /*=========================+
   |Likewise for all discards|
   +=========================*/

  let discard1ToCheck = player.discard1;
  let discard2ToCheck = player.discard2;
  let discard3ToCheck = player.discard3;
  let discard4ToCheck = player.discard4;

  handleCard('discard', 1, discard1, discard1ToCheck);
  handleCard('discard', 2, discard2, discard2ToCheck);
  handleCard('discard', 3, discard3, discard3ToCheck);
  handleCard('discard', 4, discard4, discard4ToCheck);

  handleOpponentDiscard();

  /*=================+
   |And the plays too|
   +=================*/

  let play1ToCheck = players.building1;
  let play2ToCheck = players.building2;
  let play3ToCheck = players.building3;
  let play4ToCheck = players.building4;

  handleCard('play', 1, building1, play1ToCheck);
  handleCard('play', 2, building2, play2ToCheck);
  handleCard('play', 3, building3, play3ToCheck);
  handleCard('play', 4, building4, play4ToCheck);

  /*===============================+
   |If stock is different update UI|
   +===============================*/

  let { stock } = player;

  if (currentStock === null) {
    $('#building').removeClass('hidden');
    $('#player').removeClass('hidden');
  }

  if (
    stock.length > 0 &&
    (currentStock === null ||
      JSON.stringify(currentStock) !== JSON.stringify(stock))
  ) {
    currentStock = stock;
    $('#player .stock').empty();
    $('#player .stock').append(createCard(currentStock[0]));
  }

  /*=====================+
   |Handle selected cards|
   +=====================*/

  $('#hand .play-card').on('click', e => {
    e.preventDefault();
    $(
      '#hand .play-card, #player .stock .play-card, #player .discard .play-card'
    ).removeClass('selected');
    let element = $(e.target).closest('.play-card');
    element.addClass('selected');
    selectedCard = parseInt(
      $(element)
        .find('.mark')
        .text()
        .trim()
    );
    selectedCard = isNaN(selectedCard) || !selectedCard ? 0 : selectedCard;
    selectedArea = 'hand';
  });

  $('#player .stock').on('click', e => {
    e.preventDefault();
    $(
      '#hand .play-card, #player .stock .play-card, #player .discard .play-card'
    ).removeClass('selected');
    let element = $(e.target).closest('.play-card');
    element.addClass('selected');
    selectedCard = parseInt(
      $(element)
        .find('.mark')
        .text()
        .trim()
    );
    selectedCard = isNaN(selectedCard) || !selectedCard ? 0 : selectedCard;
    selectedArea = `stock`;
  });
};

$(document).ready(() => {
  $('#player .discard .play-card').on('click', e => {
    if (
      isTurn &&
      opponents.length > 0 &&
      selectedArea !== null &&
      selectedArea.indexOf('discard') === -1 &&
      selectedArea !== 'stock' &&
      selectedCard > -1
    ) {
      let element = $(e.target).closest('.play-card');
      let discardIndex = parseInt($(element).attr('data-discard-number'));
      let payload = {};

      payload.id = player.id;
      payload.card = selectedCard;
      payload.area = `discard${discardIndex}`;

      console.log(JSON.stringify(payload));

      socket.emit('discard', payload);
      selectedArea = null;
      selectedCard = -1;
    }
  });

  $('#building .stacks .play-card').on('click', e => {
    if (
      isTurn &&
      opponents.length > 0 &&
      selectedArea !== null &&
      selectedCard > -1
    ) {
      let element = $(e.target).closest('.play-card');
      let payload = {};

      payload.id = player.id;
      payload.card = selectedCard;
      payload.area = selectedArea;
      payload.target = parseInt($(element).attr('data-play-number'));

      console.log(JSON.stringify(payload));

      socket.emit('play', payload);
      selectedArea = null;
      selectedCard = -1;
    }
  });

  $('#taunts span').on('click', e => {
    e.preventDefault();
    $('#taunts').toggleClass('menu-open');

    let payload = {};

    var element = $(e.target).closest('span');

    payload.message = element.text();
    payload.target = getSelectedPlayer();

    // console.log(`${JSON.stringify(payload)}`);

    socket.emit('taunt', payload);
  });

  $('.notifications').on('click', e => {
    e.preventDefault();
    $('.notifications span').toggleClass('on');
  });

  $('.player-tabs .btn').on('click', e => {
    let element = $(e.target).closest('.player-tab');

    let text = element.text();
    selectedOpponent = parseInt(text);
    toggleOpponent(selectedOpponent);
    opponent = opponents[opponentIndexes[player.id].indexOf(selectedOpponent)];
    handleOpponentDiscard();
  });

  $('.register').on('click', e => {
    registrationPayload.name = $('#playerName').val();
    registrationPayload.stock = $('#stockNumber option:selected').text();
    registrationPayload.card = $('#cardNumber option:selected').text();

    $('#player .stock').attr('data', registrationPayload.name);

    console.log(`Sending ${JSON.stringify(registrationPayload, null, 2)}`);
    socket.emit('register', registrationPayload);

    // $('.hidden').removeClass('hidden');
    $('#registration-area').addClass('hidden');
    $('#hand-area').removeClass('hidden');

    socket.on('state', parseState);
    socket.on('incomingTaunt', data => {
      console.log(data);
      if (player !== null && !$('#note').hasClass('slide')) {
        $('#note').empty();
        $('#note').removeClass('slide');

        let id = player.id;

        if (parseInt(data.target) === id) {
          $('#note').html(data.message);
          $('#note').addClass('slide');
        }

        setTimeout(() => {
          $('#note').empty();
          $('#note').removeClass('slide');
        }, 3000);
      }
    });
  });
});
