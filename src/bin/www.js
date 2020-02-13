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

mqttClient.setSocket(socket);
mqttClient.setChordArray(chordArray);

const ss = require('socket.io-stream');

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

socket.on('connection', client => {
  console.log('Client connected...');
  ss(client).on('event', (data, stream) => {
    var payload = JSON.parse(data);

    /*=================+
     |Do the MQTT stuff|
     +=================*/

    buildChord(mqttClient, payload);

    // playTone(tone, other);
  });
});
