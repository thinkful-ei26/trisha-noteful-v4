'use strict';

const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/user');

const router = express.Router();

/* POST/CREATE user on /api/users */

router.post('/', (req, res, next) => {

  const { fullname, username, password } = req.body;

  //validate the user inputs
  if(!username) {
    const err = new Error('Missing `username` in request body');
    err.status = 400;
    return next(err);
  }

  const newUser = { fullname, username, password };

  User.create(newUser)
    .then( result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch( err => next(err));

});

module.exports = router;