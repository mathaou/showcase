import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index';
import path from 'path';

const app = express();

app.use((req, res, next) => {
    if (req.headers.host.slice(0, 4) !== 'www.' && req.headers.host.indexOf('localhost') === -1) {
        var newHost = 'www.' + req.headers.host;
        return res.redirect(301, req.protocol + '://' + newHost + req.originalUrl);
    }
    next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(__dirname, { dotfiles: 'allow' } ), indexRouter);
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.static(path.join(__dirname, '../node_modules/jquery/dist/')))
app.use(express.static(path.join(__dirname, '../node_modules/bootstrap/dist/')))
app.use(express.static(path.join(__dirname, '../node_modules/font-awesome/')))
app.set('views', __dirname + '/views')
app.set('view engine', 'pug')

export default app;
