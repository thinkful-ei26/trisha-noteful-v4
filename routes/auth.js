'use strict';

const express = require('express');
const passport = require('passport');
const {  jwt, JWT_SECRET, JWT_EXPIRY } = require('jsonwebtoken');

const router = express.Router();

const createAuthToken = (user) => {
  return jwt.sign( { user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY
  });
};

/* 
  failWithError option configures the middleware to throw an error instead of automatically returning a 401 response. The error is then caught by the error handling middleware on server.js and returned as JSON.
  - you need to give a json error instead of plaintext 
  */
const options = {
  session: false, 
  failWithError: true
};

const localAuth = passport.authenticate('local', options);

/* POST on /api/login */
router.post('/', localAuth, (req, res) => {
  return res.json(req.user);
});

module.exports = router;