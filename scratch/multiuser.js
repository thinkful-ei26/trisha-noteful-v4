'use strict';

const mongoose = require('mongoose');
const { MONGODB_URI} = require('../config');

const Note = require('../models/note');
const Folder = require('../models/folder');

mongoose.connect(MONGODB_URI, { useNewUrlParser : true, useCreateIndex : true})
  .then( () => {
    // const newNote = {
    //   title: 'this is a new note', 
    //   content: 'bacon ipsum'
    // };

    // return Note.create(newNote)
    //   .then( result => {
    //     console.log(result);
    //   })
    //   .catch(err => {
    //     console.log(err);
    //   });

    const userId = '000000000000000000000002';

    return Folder.find({userId})
      .sort('name')
      .then(results => {
        console.log(results);
      })
      .catch( err => {
        console.log(err.message);
      });
  })
  .then( () => {
    return mongoose.disconnect();
  })
  .catch( err => {
    console.log(err.message);
  });