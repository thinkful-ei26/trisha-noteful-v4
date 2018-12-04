'use strict';

const express = require('express');
const User = require('../models/user');

const router = express.Router();

/* POST/CREATE user on /api/users */
router.post('/', (req, res, next) => {

  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));

  /* validate the user inputs */
  if(missingField) {
    const err = new Error(`Missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  /* The fields are type string */
  const stringFields = ['username', 'password', 'fullname'];

  const nonStringField = stringFields.find(
    field => {
      return field in req.body && typeof req.body[field] !== 'string';
    }
  );
  
  /* 12/4/18: Mentor Q: why use res.status.json vs throw error? */
  // if (nonStringField) {
  //   const err = new Error(`The field ${nonStringField} must be type String`);
  //   err.status = 422;
  //   return next(err);
  // }

  //if you use {} on res.status.json make sure you return it
  //otherwise without the curly braces you do not to return it 
  if( nonStringField ) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: `Incorrect field type: expected string and got ${typeof nonStringField}` 
    });
  }

  /*  The username and password should not have leading or trailing whitespace. And the endpoint should not automatically trim the values */

  const explicityTrimmedFields = ['username', 'password']; //trim these two because they are credentials
  const nonTrimmedField = explicityTrimmedFields.find(
    field => req.body[field].trim() !== req.body[field]
  );

  if (nonTrimmedField) {
    const err = new Error(`The field: ${nonTrimmedField} cannot start or end with a whitespace`);
    err.status = 422;
    return next(err);
    // return res.status(422).json({
    //   code: 422,
    //   reason: 'ValidationError',
    //   message: 'Cannot start or end with whitespace',
    //   location: nonTrimmedField
    // });
  }

  const sizedFields = {
    username: { min: 1 },
    password: {
      min: 8,
      // bcrypt truncates after 72 characters, so let's not give the illusion
      // of security by storing extra (unused) info
      max: 72
    }
  };

  /* The username is a minimum of 1 character */
  const tooSmallField = Object.keys(sizedFields).find(
    field => 'min' in sizedFields[field] &&
      req.body[field].trim().length < sizedFields[field].min
  );

  /*  The password is a minimum of 8 and max of 72 characters */
  const tooLargeField = Object.keys(sizedFields).find(
    field => 'max' in sizedFields[field] &&
      req.body[field].trim().length > sizedFields[field].max
  );

  if (tooSmallField || tooLargeField) {
    return res.status(422).json({
      code: 422,
      reason: 'ValidationError',
      message: tooSmallField
        ? `Must be at least ${sizedFields[tooSmallField]
          .min} characters long`
        : `Must be at most ${sizedFields[tooLargeField]
          .max} characters long`,
      location: tooSmallField || tooLargeField
    });
  }

  //pre-trim username and password
  let { username, password, fullname = '' } = req.body;
  fullname = fullname.trim();

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