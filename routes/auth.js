'use strict';

const express = require('express');
const passport = require('passport');
const jwt= require('jsonwebtoken');

const { JWT_SECRET, JWT_EXPIRY } = require('../config');
const router = express.Router();
const options = { session: false, failWithError: true };
const localAuth = passport.authenticate('local', options);

/* POST on /api/login and send jwt authToken as response*/
router.post('/', localAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

//Protect endpoints using JWT Strategy 
const jwtAuth = passport.authenticate('jwt', options);

router.post('/', jwtAuth, (req, res) => {
  const authToken = createAuthToken(req.user);
  res.json({ authToken });
});

//jwt.sign() invokes the User schema toJSON() which removes the password and __v from payload
const createAuthToken = (user) => {
  return jwt.sign( { user }, JWT_SECRET, {
    subject: user.username,
    expiresIn: JWT_EXPIRY,
    algorithm: 'HS256'
  });
};

module.exports = router;