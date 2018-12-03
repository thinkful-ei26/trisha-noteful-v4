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

  /* Now that you've added bcrypt: replace below with a promise chain that hashes the password*/
  // const newUser = { fullname, username, password };

  // User.create(newUser)
  //   .then( result => {
  //     res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
  //   })
  //   .catch( err => next(err));

  return User.hashPassword(password)
    .then( digest => {
      const newUser = { 
        fullname,
        username, 
        password: digest
      }; 
      return User.create(newUser);
    })
    .then( result => {
      return res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch( err => {
      if(err.code === 11000 ) { //11000 is a mongo error code that checks for a duplicates
        err = new Error('The username already exists');
        err.status = 400;
      }
      next(err);
    });

});

module.exports = router;