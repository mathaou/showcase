import express from 'express';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import indexRouter from './routes/index';
import path from 'path';
import http from 'http';
import { redirectToHTTPS } from 'express-http-to-https';
 

const app = express();

app.use(redirectToHTTPS([/localhost:(\d{4})/], [/\/insecure/], 301));
 
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
