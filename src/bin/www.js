#!/usr/bin/env node

// @flow

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
  currentPlayer: 1
};

const nextPlayer = () => {
  let val = players.currentPlayer + 1;
  let mod = val % players.players.length;
  players.currentPlayer = (mod === 0) ? players.players.length : mod;
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

const generateHand = id => {
  var selectedPlayer = players.players.filter(player => {
    if (player.id === id) return true;
  })[0];

  var handSize = selectedPlayer.hand.length;

  for (let i = handSize; i < MAX_CARDS; i++) {
    if (players.deck.length === 0) {
      initializeDeck();
    }

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

const generateStock = id => {
  var selectedPlayer = players.players.filter(player => {
    if (player.id === id) return player;
  })[0];

  for (let i = 0; i < STOCK_MAX; i++) {
    if (players.deck.length === 0) {
      initializeDeck();
    }

    selectedPlayer.stock.push(players.deck.pop());
  }
};

/*====================+
 |Publish player state|
 +====================*/

socket.on('connection', client => {
  console.log('Client connected...');

  mqttClient.setSocket(socket);
  mqttClient.setChordArray(chordArray);

  const ss = require('socket.io-stream');

  client.on('discard', data => {
    players.players = players.players.map(player => {
      if(player.id === data.id) {
        let removedCard = player.hand.splice(player.hand.indexOf(data.card), 1);
        console.log(`Removed ${JSON.stringify(removedCard)} from hand...`);
        console.log(player.hand);
        switch(parseInt(data.area.slice(-1))) {
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
            break
        }
      }

      return player;
    });

    nextPlayer();
    socket.sockets.emit('state', players);
  });

  client.on('play', data => {
    players.players = players.players.map(player => {
      if(player.id === data.id) {
        let removedCard = null;
        switch(data.area) {
          case 'hand':
            removedCard = player.hand.splice(player.hand.indexOf(data.card), 1);
            break;
          case 'stock':
            removedCard = player.stock.shift();
            break;
          default:
            let discardIndex = parseInt(data.area.slice(-1));
            switch(discardIndex) {
              case 1:
                removedCard = player.discard3.splice(player.discard3.indexOf(data.card), 1);
                break;
              case 2:
                removedCard = player.discard2.splice(player.discard2.indexOf(data.card), 1);
                break;
              case 3:
                removedCard = player.discard3.splice(player.discard3.indexOf(data.card), 1);
                break;
              case 4:
                removedCard = player.discard4.splice(player.discard4.indexOf(data.card), 1);
                break;
            }
            break;
        }

        switch(data.target) {
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
    // console.log(JSON.stringify(data));
    socket.emit('incomingTaunt', data);
  });

  client.on('register', data => {
    if(data.card !== MAX_CARDS) {
      MAX_CARDS = data.card;
      for(let i = 1; i <= numPlayers; i++) {
        generateHand(i);
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
