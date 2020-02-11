// @flow

import express from 'express';

import { createMultiplePages } from './pagination';

import { title, lastUpdate } from '../constants';

const router = new express.Router(['strict']);

createMultiplePages(router);

router.get('/resume', (req, res, next) => {
  res.render('resume', { title, now: lastUpdate });
});

router.get('/music', (req, res, next) => {
  res.render('music', { title, now: lastUpdate });
});

router.get('/projects', (req, res, next) => {
  res.render('projects', { title, now: lastUpdate });
});

router.get('/files/resume_cv.pdf', (req, res, next) => {
  res.sendFile('/files/resume_cv.pdf');
});

router.get('/', (req, res, next) => {
  res.render('index', { title, now: lastUpdate });
});

router.get('/zodd', (req, res, next) => {
  res.render('zodd', { title: "Zodd Chord Builder", now: lastUpdate });
});

// for ssl cert generation

// router.get("/.well-known/acme-challenge/CHALLENGE_STRING", (req, res, next) => {
//   res.sendFile("/.well-known/acme-challenge/CHALLENGE_STRING");
// });

export default router;
