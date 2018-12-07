'use strict';

/* Require passport-local in the file and set the Strategy property to a local variable named LocalStrategy using object destructuring. */
const { Strategy : LocalStrategy } = require('passport-local');
const User = require('../models/user');

// Define your "basicStrategy": how your credentials are validated
const localStrategy = new LocalStrategy( (username, password, done) => {
  let user;

  User.findOne({ username })
    .then( results => {
      user = results;
      if (!user) {
        //if the user is not found on db, then reject the promise
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect username',
          location: 'username' 
        });
      }

      //using passport-local, validate the password provided
      return  user.validatePassword(password);
    })
    .then( isValid => {
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }
      //if no issues, then call done() and return user
      // next() is not avaible in passport so we call done()
      return done(null, user);
    })
    .catch( err => {
      if (err.reason === 'LoginError') {
        return done(null, false);
      }
      // again, we call done(err) instead of next(err) b/c of passport
      return done(err);
    });
});

module.exports = localStrategy;