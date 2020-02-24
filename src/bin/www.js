#!/usr/bin/env node

/*====================+
 |Module dependencies.|
 +====================*/

import app from '../app';
import debugLib from 'debug';
import net from 'net';
import http from 'http';
import https from 'https';

import fs from 'fs';
import path from 'path';

import { buildChord } from '../chordDriver';
import Client from '../mqttClient';

const mqttClient = new Client();
var chordArray = [];

var MAX_CARDS = 7;
var STOCK_MAX = 30;
var numPlayers = 0;

const debug = debugLib('showcase:server');

/*=================================================+
 |Normalize a port into a number, string, or false.|
 +=================================================*/

const normalizePort = val => {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

/*=============================================+
 |Event listener for HTTP server "error" event.|
 +=============================================*/

const onError = error => {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind =
    typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port.toString();

  /*====================================================+
   |handle specific listen errors with friendly messages|
   +====================================================*/
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
};

/*=================================================+
 |Event listener for HTTP server "listening" event.|
 +=================================================*/

const onListening = () => {
  var addr = secureServer.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log(`Listening on ${bind}`);
  debug('Listening on ' + bind);
};

/*===============================================+
 |Get port from environment and store in Express.|
 +===============================================*/

var port = normalizePort(process.env.PORT || '3000');

app.set('port', port);

app.enable('trust proxy');

/*===================+
 |Create HTTP server.|
 +===================*/

const generateHTTPSData = () => {
  return {
    key: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/chain.pem'),
  };
};

net
  .createServer(conn => {
    conn.on('error', err => {
      console.log('Caught flash policy server socket error: ');
      console.log(err.stack);
    });
    conn.once('data', buf => {
      /*===========================================+
       |A TLS handshake record starts with byte 22.|
       +===========================================*/
      var address = buf[0] === 22 ? port + 2 : port + 1;
      var proxy = net.createConnection(address, function() {
        proxy.write(buf);
        conn.pipe(proxy).pipe(conn);
      });
    });
  })
  .listen(port);

http
  .createServer((req, res) => {
    var host = req.headers['host'];
    res.writeHead(301, { Location: 'https://' + host + req.url });
    res.end();
  })
  .listen(port + 1);

var secureServer = https.createServer(generateHTTPSData(), app);

secureServer.listen(port + 2, () => {
  console.log('HTTPS server listening on ' + `${port + 2}`);
});

secureServer.on('error', onError);

const socket = require('socket.io')(secureServer);

/*==================================================+
 |Better implementation, need to get sound to client|
 +==================================================*/

const playTone = (tone, stream) => {
  // implementation soon
  // if (tone > 61 || tone < 1) {
  //   console.log('undefined tone', tone);
  //   return;
  // }
  // const file = fs.createReadStream(path.resolve(__dirname, 'wav', `${tone}.wav`));
  // file.pipe(stream);
  // file.on('end', () => {
  //   file.unpipe(stream);
  // });
  // return file;
};

/*===============+
 |SOCKET IO STUFF|
 +===============*/

var players = {
  players: [],
  building1: [],
  building2: [],
  building3: [],
  building4: [],
  deck: [],
  currentPlayer: 1,
};

const nextPlayer = () => {
  let val = players.currentPlayer + 1;
  let mod = val % players.players.length;
  players.currentPlayer = mod === 0 ? players.players.length : mod;
  console.log(players.currentPlayer);
};

/*=======+
 |Shuffle|
 +=======*/

const shuffle = array => {
  let counter = array.length;

  while (counter > 0) {
    let index = Math.floor(Math.random() * counter);

    counter--;

    let temp = array[counter];
    array[counter] = array[index];
    array[index] = temp;
  }

  return array;
};

/*===============+
 |Initialize deck|
 +===============*/

const initializeDeck = () => {
  players.deck = [];
  for (let i = 0; i < 12; i++) {
    if (i % 2 === 0) players.deck.push(0);
    players.deck.push(0);

    for (let card = 1; card <= 12; card++) {
      players.deck.push(card);
    }
  }

  players.deck = shuffle(players.deck);
};

const countCardsInHand = a => {
  return a.reduce((acc, curr) => {
    if (typeof acc[curr] == 'undefined') {
      acc[curr] = 1;
    } else {
      acc[curr] += 1;
    }

    return acc;
  }, {});
};

const handleReshuffle = () => {
  if (players.deck.length === 0) {
    let acc = [];
    players.players.map(player => {
      acc = acc.concat([
        ...player.hand,
        ...player.stock,
        ...player.discard1,
        ...player.discard2,
        ...player.discard3,
        ...player.discard4,
      ]);
    });

    let tempDeck = [
      ...players.building1,
      ...players.building2,
      ...players.building3,
      ...players.building4,
      ...acc
    ];

    initializeDeck();

    let count = countCardsInHand(tempDeck);

    for(let cardCount = 0; cardCount < players.deck.length; cardCount++){ 
      let indexCount = count[players.deck[cardCount]];
      if(indexCount > 0) {
        players.deck.splice(cardCount, 1);
        count[players.deck[cardCount]]--;
      }
    }
  }
}

/*============================================================================+
 |Fills up a hand and handles reshuffling of the deck. Also accounts for cards|
 |~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-in play~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~|
 +============================================================================*/

const generateHand = id => {
  var selectedPlayer = players.players.filter(player => {
    if (player.id === id) return true;
  })[0];

  var handSize = selectedPlayer.hand.length;

  for (let i = handSize; i < MAX_CARDS; i++) {
    handleReshuffle();

    let pop = players.deck.pop();
    selectedPlayer.hand.push(pop);
  }

  players.players = players.players.map(player => {
    if (player.id === selectedPlayer.id) {
      player.hand = selectedPlayer.hand;
    }

    return player;
  });
};

/*==========================+
 |Counts out all stock cards|
 +==========================*/

const generateStock = id => {
  var selectedPlayer = players.players.filter(player => {
    if (player.id === id) return player;
  })[0];

  let stockLength = selectedPlayer.stock.length;

  for (let i = stockLength; i < STOCK_MAX; i++) {
    handleReshuffle();

    let pop = players.deck.pop();
    selectedPlayer.stock.push(pop);
  }

  players.players = players.players.map(player => {
    if (player.id === selectedPlayer.id) {
      player.stock = selectedPlayer.stock;
    }

    return player;
  });
};

/*============+
 |Rules engine|
 +============*/

const compareToLastPlay = (building, card, lastPlay) => {
  if (building.length !== 0) {
    let diff = card - lastPlay;
    if (diff === 1) return card;
    else if (diff === -lastPlay) return lastPlay + 1;
    else return -1;
  } else if (building.length === 0) {
    if (card === 1) return card;
    else if (card === 0) return 1;
    else return -1;
  }
};

const determinePlayValidity = (target, card) => {
  let lastPlay = null;

  switch (target) {
    case 1:
      lastPlay = players.building1[players.building1.length - 1];
      return compareToLastPlay(players.building1, card, lastPlay);
    case 2:
      lastPlay = players.building2[players.building2.length - 1];
      return compareToLastPlay(players.building2, card, lastPlay);
    case 3:
      lastPlay = players.building3[players.building3.length - 1];
      return compareToLastPlay(players.building3, card, lastPlay);
    case 4:
      lastPlay = players.building4[players.building4.length - 1];
      return compareToLastPlay(players.building4, card, lastPlay);
    default:
      return -1;
  }
};

/*====================+
 |Publish player state|
 +====================*/

socket.on('connection', client => {

  client.on('disconnect', reason => {
    console.log('Disconnect...');
    socket.emit('gameover', {
      name: 'N/A',
    });
    initializeDeck();
    for (let i = 1; i <= numPlayers; i++) {
      socket.emit('incomingTaunt', {
        message: `Player left. Game invalid.`,
        target: i,
      });
    }
    numPlayers = 0;
    players.currentPlayer = 1;
    players.players = [];
    players.building1 = [];
    players.building2 = [];
    players.building3 = [];
    players.building4 = [];
  });

  console.log('Client connected...');

  mqttClient.setSocket(socket);
  mqttClient.setChordArray(chordArray);

  const ss = require('socket.io-stream');

  client.on('discard', data => {
    console.log(JSON.stringify(data));

    let { id, card, area } = data;

    players.players = players.players.map(player => {
      if (player.id === id) {
        let removedCard = player.hand.splice(player.hand.indexOf(card), 1);
        console.log(`Removed ${JSON.stringify(removedCard)} from hand...`);
        console.log(player.hand);
        switch (parseInt(area.slice(-1))) {
          case 1:
            player.discard1.push(removedCard[0]);
            break;
          case 2:
            player.discard2.push(removedCard[0]);
            break;
          case 3:
            player.discard3.push(removedCard[0]);
            break;
          default:
            player.discard4.push(removedCard[0]);
            break;
        }
      }

      return player;
    });

    nextPlayer();
    socket.emit('incomingTaunt', {
      message: 'Your Turn!',
      target: players.currentPlayer,
    });
    generateHand(players.currentPlayer);
    socket.sockets.emit('state', players);
  });

  client.on('play', data => {
    let discardIndex = parseInt(data.area.slice(-1));

    players.players = players.players.map(player => {
      if (player.id === data.id) {
        let removedCard = null;

        let valid = determinePlayValidity(data.target, data.card);

        if (valid === -1) {
          return player;
        }

        switch (data.area) {
          case 'hand':
            removedCard = player.hand.splice(player.hand.indexOf(data.card), 1);
            break;
          case 'stock':
            removedCard = player.stock.shift();
            if (player.stock.length === 0) {
              setTimeout(() => {
                socket.emit('gameover', {
                  name: player.name,
                });
                initializeDeck();
                for (let i = 1; i <= numPlayers; i++) {
                  socket.emit('incomingTaunt', {
                    message: `That's a wrap! All hail ${player.name}!`,
                    target: i,
                  });
                }
                numPlayers = 0;
                players.currentPlayer = 1;
                players.players = [];
                players.building1 = [];
                players.building2 = [];
                players.building3 = [];
                players.building4 = [];
              }, 2000);
            }
            break;
          default:
            switch (discardIndex) {
              case 1:
                removedCard = player.discard1.splice(
                  player.discard1.indexOf(data.card),
                  1
                );
                break;
              case 2:
                removedCard = player.discard2.splice(
                  player.discard2.indexOf(data.card),
                  1
                );
                break;
              case 3:
                removedCard = player.discard3.splice(
                  player.discard3.indexOf(data.card),
                  1
                );
                break;
              case 4:
                removedCard = player.discard4.splice(
                  player.discard4.indexOf(data.card),
                  1
                );
                break;
              default:
                return;
            }
            break;
        }

        removedCard = valid;

        if (removedCard === 12) {
          switch (data.target) {
            case 1:
              players.building1.length = 0;
              break;
            case 2:
              players.building2.length = 0;
              break;
            case 3:
              players.building3.length = 0;
              break;
            case 4:
              players.building4.length = 0;
              break;
            default:
              return;
          }
        } else {
          switch (data.target) {
            case 1:
              players.building1.push(removedCard);
              break;
            case 2:
              players.building2.push(removedCard);
              break;
            case 3:
              players.building3.push(removedCard);
              break;
            case 4:
              players.building4.push(removedCard);
              break;
            default:
              return;
          }
        }

        if (player.hand.length === 0) {
          generateHand(player.id);
          console.log('NEW HAND');
          socket.emit('incomingTaunt', {
            message: 'NEW HAND TURBO BONUS',
            target: player.id,
          });
        }
      }

      return player;
    });

    socket.sockets.emit('state', players);
  });

  /*==================+
   |Handle taunts here|
   +==================*/

  client.on('taunt', data => {
    console.log(JSON.stringify(data));
    socket.emit('incomingTaunt', data);
  });

  client.on('register', data => {
    if (data.card !== MAX_CARDS || data.stock !== STOCK_MAX) {
      MAX_CARDS = data.card;
      for (let i = 1; i <= numPlayers; i++) {
        generateHand(i);
        generateStock(i);
      }
    }

    STOCK_MAX = data.stock;
    console.log(`registering ${data.name}...`);
    players.players.push({
      id: ++numPlayers,
      name: data.name,
      hand: [],
      stock: [],
      discard1: [],
      discard2: [],
      discard3: [],
      discard4: [],
    });

    generateHand(numPlayers);
    generateStock(numPlayers);
    socket.sockets.emit('state', players);
  });

  client.on('error', err => {
    console.log('received error from client:', client.id);
    console.log(err);
  });

  ss(client).on('event', (data, stream) => {
    var payload = JSON.parse(data);

    /*=================+
     |Do the MQTT stuff|
     +=================*/

    buildChord(mqttClient, payload);

    // playTone(tone, other);
  });
});
