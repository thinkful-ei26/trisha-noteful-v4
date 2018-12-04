'use strict';

const express = require('express');
const passport = require('passport');
const jwt= require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRY } = require('../config');

const router = express.Router();

//jwt.sign() invokes the User schema toJSON() which removes the password and __v from payload
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

// /* POST on /api/login */
// router.post('/', localAuth, (req, res) => {
//   return res.json(req.user);
// });

router.post('/', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  return res.json({ authToken });
});


module.exports = router;