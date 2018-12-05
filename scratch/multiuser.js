'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note');

const router = express.Router();

router.use('/', passport.authenticate('jwt', { session: false, failWithError: true }));

/* ========== GET/READ ALL ITEMS ========== */
router.get('/', (req, res, next) => {
  const { searchTerm, folderId, tagId } = req.query;
  const userId = req.user.id;

  let filter = {};

  if (searchTerm) {
    const re = new RegExp(searchTerm, 'i');
    filter.$or = [{ 'title': re }, { 'content': re }];
  }

  if (folderId) {
    filter.folderId = folderId;
  }

  if (tagId) {
    filter.tags = tagId;
  }

  if (userId) {
    filter.userId = userId;
  }

  Note.find(filter)
    .populate('tags')
    .sort({ updatedAt: 'desc' })
    .then(results => {
      res.json(results);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== GET/READ A SINGLE ITEM ========== */
router.get('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  Note.findOne({ _id : id, userId })
    .populate('tags')
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });
});

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (tags) {
    const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  if (!userId) {
    const err = new Error('Missing `userId` in request body');
    err.status = 400;
    return next(err);
  }

  const newNote = { title, content, folderId, tags, userId };
  if (newNote.folderId === '') {
    delete newNote.folderId;
  }

  Note.create(newNote)
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });
});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */

// need a way to validate that the userId is the same as the userId in the folder and tags

// const validateFolders = (folderId, userId) => {
//   if (folderId === userId) {
//     return Promise.resolve(); /* the entire note via a promise */
//   }
//   if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
//     const err = new Error('The `folderId` is not valid');
//     err.status = 400;
//     return Promise.reject(err);
//   }
// };
// /* 
// "tags": [
//   {
//       "name": "Waldo",
//       "userId": "000000000000000000000002",
//       "createdAt": "2018-12-05T17:29:31.923Z",
//       "updatedAt": "2018-12-05T17:29:31.923Z",
//       "id": "333333333333333333333302"
//   }
// ], */

// const validateTags = (tags, userId) => {
  
//   if (tags.id === userId) {
//     /* the entire note via a promise */
//     return Promise.resolve();
//   }

//   //1. tags is an array
//   if ( !Array.isArray(tags) ) {
//     const err = new Error('The `tags` property must be an array');
//     err.status = 400;
//     return Promise.reject(err);
//   }
//   //2. tag id in the array is a valid ObjectId
//   // forEach loop is not needed because you don't need all fields/property
//   // use filter: you've got an array of tags, you can filter the tagsId that doesn't match the userId and then throw an error if it fails

//   tags.filter();
//   if (tags[id] && !mongoose.Types.ObjectId.isValid(tagId)) {
//     const err = new Error('The `tagId` is not valid');
//     err.status = 400;
//     return Promise.reject(err);
//   }

//   // const invalid = tags.filter( field => {
//   //   if (field)
//   // });
  
// };

router.put('/:id', (req, res, next) => {
  // const { id, tags, folderId } = req.params;
  const { id } = req.params;
  const userId = req.user.id;

  const toUpdate = {};
  const updateableFields = ['title', 'content', 'folderId', 'tags'];

  updateableFields.forEach(field => {
    if (field in req.body) {
      toUpdate[field] = req.body[field];
    }
  });

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.title === '') {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return next(err);
  }

  if (toUpdate.tags) {
    const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
    if (badIds.length) {
      const err = new Error('The `tags` array contains an invalid `id`');
      err.status = 400;
      return next(err);
    }
  }

  if (toUpdate.folderId === '') {
    delete toUpdate.folderId;
    toUpdate.$unset = {folderId : 1};
  }

  if (toUpdate.userId && !mongoose.Types.ObjectId.isValid(toUpdate.userId)) {
    const err = new Error('The `userId` is not valid');
    err.status = 400;
    return next(err);
  }

  //validate that folders and notes are valid via a promise
  //invoke the validate functions and pass in params
  // Promise.all([
  //   validateFolders( folderId, userId),
  //   validateTags( tags ,userId)
  // ])
  //   .then(result => {
  //     if (result) {
  //       res.json(result);
  //     } else {
  //       next();
  //     }
  //   })
  //   .catch(err => {
  //     next(err);
  //   });
 
  Note.findByIdAndUpdate(id, toUpdate, { new: true })
    .then(result => {
      if (result) {
        res.json(result);
      } else {
        next();
      }
    })
    .catch(err => {
      next(err);
    });

});

/* ========== DELETE/REMOVE A SINGLE ITEM ========== */
router.delete('/:id', (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('The `id` is not valid');
    err.status = 400;
    return next(err);
  }

  if (!userId) {
    const err = new Error('Missing `userId` in request body');
    err.status = 400;
    return next(err);
  }

  Note.findOneAndRemove({ _id : id, userId })
    .then(() => {
      res.sendStatus(204);
    })
    .catch(err => {
      next(err);
    });
});

module.exports = router;
