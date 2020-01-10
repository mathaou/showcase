#!/usr/bin/env node

/**
 * Module dependencies.
 */

import app from '../app';
import debugLib from 'debug';
import http from 'http';
import https from 'https';

import fs from 'fs';

const debug = debugLib('showcase:server');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');

app.set('port', port);

app.enable('trust proxy');

/**
 * Create HTTP server.
 */

const generateHTTPSData = () => {
  return {
    key: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/cert.pem'),
    ca: fs.readFileSync('/etc/letsencrypt/live/www.mfarstad.com/chain.pem')
  }
}

// var server = http.createServer(app).listen(8080);
var secureServer = https.createServer(generateHTTPSData(), app);

/**
 * Listen on provided port, on all network interfaces.
 */

// server.listen(port, () => {
//   console.log('HTTP server listening on '+ port);
// });

// server.on('error', onError);

secureServer.listen(port, () => {
  console.log('HTTPS server listening on '+ port);
});

secureServer.on('error', onError);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
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
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port;

  // handle specific listen errors with friendly messages
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
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = secureServer.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log(`Listening on ${bind}`);
  debug('Listening on ' + bind);
}