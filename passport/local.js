'use strict';

const passport = require(passport);
/* Require passport-local in the file and set the Strategy property to a local variable named LocalStrategy using object destructuring. */
const { Strategy : LocalStrategy } = require('passport-local');
const User = require('../models/user');

/* 
 - Define a new local strategy using new LocalStrategy 
 - Goal: define how your credentials are validated, "basicStrategy"
*/
const localStrategy = new LocalStrategy( (username, password, done) => {
  let user;

  // 1) find one user when given the username
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

      //.validatePassport is from passport-local
      const isValid = user.validatePassword(password);
      if (!isValid) {
        return Promise.reject({
          reason: 'LoginError',
          message: 'Incorrect password',
          location: 'password'
        });
      }

      //if no issues, then call done() and return user
      // per Chris, the next() is not avaible in passport so we call done() 12/3/18 workshop
      return done(null, user);
    })
    .catch( err => {
      console.log(err);

      //not sure what this is doing
      if (err.reason === 'LoginError') {
        return done(null, false);
      }
      // again, we call done(err) instead of next(err) b/c of passport
      return done(err);
    });
});