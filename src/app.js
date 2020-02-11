// @flow

import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index';
import path from 'path';

const app = express();

// redirect non-www
app.use((req, res, next) => {
  if (
    req.headers.host.slice(0, 4) !== 'www.' &&
    req.headers.host.indexOf('localhost') === -1
  ) {
    var newHost = 'www.' + req.headers.host;
    return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
  }
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../node_modules/jquery/dist/')));
app.use(
  express.static(path.join(__dirname, '../node_modules/socket.io-stream/'))
);
app.use(
  express.static(path.join(__dirname, '../node_modules/socket.io-client/dist/'))
);
// app.use(express.static(path.join(__dirname, '../node_modules/mqtt/dist/')));

app.use(
  express.static(path.join(__dirname, '../node_modules/bootstrap/dist/'))
);
app.use(express.static(path.join(__dirname, '../node_modules/font-awesome/')));

// for ssl
// app.use(express.static(__dirname, { dotfiles: "allow" }), indexRouter);

app.use(indexRouter);

app.set('views', __dirname + '/views');
app.set('view engine', 'pug');

// error handling
app.use((err, req, res, next) => {
  return res.status(500).render('error', {
    message:
      'Internal server error. Please contact the administrator at matthewwilliamfarstad@gmail.com if this issue continues to be unresolved.',
  });
});

export default app;
