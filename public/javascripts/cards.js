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
  return selectedOpponent;
};

const getCardFaceForValue = val => {
  let cardFace = val > 0 ? `${val}` : '*';
  cardFace = val < 10 || cardFace === '*' ? `${cardFace}&nbsp;` : `${cardFace}`;
  return cardFace;
};

const getDescriptorForValue = val => {
  return val > 0 ? `num-${val}` : 'wild';
};

const handleSelect = (e, area) => {
  e.stopImmediatePropagation();
  let element = $(e.target).closest('.play-card');

  if($(element).hasClass('selected')) {
    console.log('toggling')
    $(element).toggleClass('selected');
    selectedArea = null;
    selectedCard = -1;
  } else {
    console.log('selecting other cards');
    $(
      '#hand .play-card, #player .stock .play-card, #player .discard .play-card'
    ).removeClass('selected');
    $(element).addClass('selected');

    selectedCard = parseInt(
      $(element)
        .find('.mark')
        .text()
        .trim()
    );
    selectedCard = isNaN(selectedCard) || !selectedCard ? 0 : selectedCard;
    selectedArea = area;
  }
}

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

const handlePlayerDiscard = () => {
  if(player) {
    let discard1ToCheck = player.discard1;
    let discard2ToCheck = player.discard2;
    let discard3ToCheck = player.discard3;
    let discard4ToCheck = player.discard4;

    handleCard('discard', 1, discard1, discard1ToCheck);
    handleCard('discard', 2, discard2, discard2ToCheck);
    handleCard('discard', 3, discard3, discard3ToCheck);
    handleCard('discard', 4, discard4, discard4ToCheck);
  }
}

const handlePlays = (players) => {
  let play1ToCheck = players.building1;
  let play2ToCheck = players.building2;
  let play3ToCheck = players.building3;
  let play4ToCheck = players.building4;

  handleCard('play', 1, building1, play1ToCheck);
  handleCard('play', 2, building2, play2ToCheck);
  handleCard('play', 3, building3, play3ToCheck);
  handleCard('play', 4, building4, play4ToCheck);
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

  if(!(val === 12 && target === 'play') && doIt) {
    $(targetNPlayCard).addClass(descriptor);
    $(targetNPlayCard).removeClass(`selected`);
    $(targetNPlayCard)
      .find('.mark')
      .html(cardFace);

    $(targetNPlayCard).attr('data', cardFace);

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

const updateStock = () => {
  if(opponent) {
    let { stock } = opponent;

    $('#opponent .stock').empty();

    if (stock.length > 0) {
      // $('#opponent .stock .play-card .inner').attr('data', `${stock.length}`);
      $('#opponent .stock').append(createCard(stock[0]));
    }
  }
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

  updateStock();
};

const parseState = players => {
  var data = players.players;

  console.log(JSON.stringify(data));

  /*============================+
   |Get player state from server|
   +============================*/

  player = data.filter(x => {
    if (x.name === registrationPayload.name) return true;
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

  if(player) {
    if (currentPlayer === player.id){
      isTurn = true;
    } else {
      isTurn = false;
    }
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

  /*=================+
   |Setup the buttons|
   +=================*/

  if (data.length !== numPlayers) {
    if (data.length === 4) {
      $('.player-4-button, #player-3-button, #player-2-button').removeClass(
        'hidden'
      );
      $('.player-4-button span').html(`${opponents[2].id}`);
      if (hand === null) {
        $('.player-3-button span').html(`${opponents[1].id}`);
        $('.player-2-button span').html(`${opponents[0].id}`);
      }
    } else if (data.length === 3) {
      $('.player-3-button, .player-2-button').removeClass('hidden');
      $('.player-3-button span').html(`${opponents[1].id}`);
      if (hand === null) {
        $('.player-2-button span').html(`${opponents[0].id}`);
      }
    } else if (data.length === 2) {
      $('.player-2-button, .player-1-button').removeClass('hidden');
      $('.player-2-button span').html(`${opponents[0].id}`);
    }
  }

  $('#num-cards').html(players.deck.length);

  numPlayers = data.length;

  if(player) {
    let handToCheck = player.hand;
    console.log(JSON.stringify(handToCheck));


    /*=======================================+
    |If incoming hand is different update UI|
    +=======================================*/

    if (hand === null || JSON.stringify(handToCheck) !== JSON.stringify(hand)) {
      $('#hand').empty();
      console.log('diff');

      handToCheck.map(val => {
        let card = createCard(val);
        $('#hand').append(card);
      });

      console.log('appended');

      hand = handToCheck;
    }

    console.log(JSON.stringify(hand));

    /*=========================+
    |Likewise for all discards|
    +=========================*/

    handlePlayerDiscard();

    handleOpponentDiscard();

    /*=================+
    |And the plays too|
    +=================*/

    handlePlays(players);

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
      $('#player .stock .play-card .inner').attr('data', `${currentStock.length}`);
    } else if(stock.length === 0) {
      $('#player .stock').empty();
    }

    updateStock();

    /*=====================+
    |Handle selected cards|
    +=====================*/

    $('#hand .play-card').on('click', e => {
      handleSelect(e, 'hand');
    });

    $('#player .stock').on('click', e => {
      handleSelect(e, 'stock');
    });


    /*=========================================+
    |First time, default to the first opponent|
    +=========================================*/

    if (selectedOpponent === -1 && numPlayers > 1) {
      selectedOpponent = opponentIndexes[player.id][0];
      $('#opponent').removeClass('hidden');
      console.log('toggling opponent');
      toggleOpponent(selectedOpponent);
    }
  }
};

$(document).ready(() => {
  /*================+
   |Discard on click|
   +================*/
  $('#player .discard .play-card').on('click', e => {
    if (
      isTurn &&
      opponents.length > 0
    ) {
      let element = $(e.target).closest('.play-card');
      let t = $(element)
        .find('.mark')
        .text()
        .trim();
      let discardIndex = parseInt($(element).attr('data-discard-number'));
      
      if(selectedArea === null || selectedArea.indexOf('discard') !== -1 || selectedArea === 'stock') {
        handleSelect(e, `discard${discardIndex}`);
      } else if(selectedArea !== 'stock' && selectedArea.indexOf('discard') === -1 && selectedCard > -1) {
        let payload = {};

        payload.id = player.id;
        payload.card = selectedCard;
        payload.area = `discard${discardIndex}`;

        console.log(JSON.stringify(payload));

        socket.emit('discard', payload);

        selectedArea = null;
        selectedCard = -1;
      }
    }
  });

  /*============+
   |Handle plays|
   +============*/
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

      $(
        '#hand .play-card, #player .stock .play-card, #player .discard .play-card'
      ).removeClass('selected');
      selectedArea = null;
      selectedCard = -1;
    }
  });

  /*======+
   |Taunts|
   +======*/

  $('#taunts span').on('click', e => {
    e.preventDefault();
    $('#taunts').toggleClass('menu-open');

    let payload = {};

    var element = $(e.target).closest('span');

    payload.message = element.text();
    payload.target = getSelectedPlayer();

    console.log(`${JSON.stringify(payload)}`);

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

    $('#registration-area').addClass('hidden');
    $('#opponent').removeClass('hidden');
    $('#building').removeClass('hidden');
    $('#player').removeClass('hidden');
    $('#hand-area').removeClass('hidden');
    handleOpponentDiscard();

    socket.on('gameover', data => {
      $('#opponent').addClass('hidden');
      $('#building').addClass('hidden');
      $('#player').addClass('hidden');
      $('#hand-area').addClass('hidden');

      setNotification('Game over!');

      setTimeout(() => {
        $('#registration-area').removeClass('hidden');
      }, 3000);
    });
    socket.on('state', parseState);
    socket.on('incomingTaunt', data => {
      if (player !== null && !$('#note').hasClass('slide')) {
        console.log(data);

        let id = player.id;

        if (parseInt(data.target) === id) {
          console.log('doin it');
          $('#note').html(data.message);
          $('#note').addClass('slide');
          setTimeout(() => {
            console.log('note removed');
            $('#note').empty();
            $('#note').removeClass('slide');
          }, 3000);
        }
      }
    });
  });
});
