'use strict';

const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');

const Note = require('../models/note');
const Folder = require('../models/folder');
const Tag = require('../models/tag');

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

//folderId = invalid
//folderId = "" (empty string)
//folderId = valid mongo _id but does not exist
//folderId = folder belongs to another user

//folderId = undefined
//folderId = valid mongo _id and folder exist

const validateFolderId = (folderId, userId) => {
  //null, undefined, empty string, negative number
  if(folderId === '') {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  if (folderId && !mongoose.Types.ObjectId.isValid(folderId)) {
    const err = new Error('The `folderId` is not valid');
    err.status = 400;
    return Promise.reject(err);
  }
  return Folder.countDocuments({ _id: folderId, userId }) //make sure the folderId is from user by checking the count of the array 
    .then(count => {
      if (count === 0) {
        const err = new Error('The `folderId` is not valid');
        err.status = 400;
        return Promise.reject(err);
      }
    });
};

const validateTagIds = (tags, userId) => {
  //null, undefined, empty string, negative number
  if(tags === undefined) {
    return Promise.resolve();
  }
  
  if (!Array.isArray(tags)) {
    const err = new Error('The `tags` property must be an array');
    err.status = 400;
    return Promise.reject(err);
  }

  const badIds = tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
  if (badIds.length) {
    const err = new Error('The `tags` array contains an invalid `id`');
    err.status = 400;
    return Promise.reject(err);
  }

  return Tag.countDocuments({
    $and: [ {
      _id: { $in: tags },
      userId 
    }
    ]
  }) 
    .then(count => {
      if (tags.length > count) {
        const err = new Error('The `tags` array contains an invalid `id`');
        err.status = 400;
        return Promise.reject(err);
      }
    });
};

/* ========== POST/CREATE AN ITEM ========== */
router.post('/', (req, res, next) => {
  const { title, content, folderId, tags } = req.body;
  //req.user coming from passport
  // we don't need userId in req.body for sensitive information
  const userId = req.user.id;

  /***** Never trust users - validate input *****/
  if (!title) {
    const err = new Error('Missing `title` in request body');
    err.status = 400;
    return next(err);
  }

  const newNote = { title, content, folderId, tags, userId };

  // if (newNote.folderId && !mongoose.Types.ObjectId.isValid(newNote.folderId)) {
  //   const err = new Error('The `folderId` is invalid `id`');
  //   err.status = 400;
  //   return next(err);
  // }

  Promise.all([
    validateFolderId(folderId, userId),
    validateTagIds(tags, userId)
  ])
    .then( () => {
      return Note.create(newNote);
    })
    .then(result => {
      res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
    })
    .catch(err => {
      next(err);
    });

  // validateFolderId(folderId, userId)
  //   .then( () => {
  //     return Note.create(newNote);
  //   })
  //   .then(result => {
  //     res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
  //   })
  //   .catch(err => {
  //     next(err);
  //   });

  // Folder.countDocuments({ _id: folderId, userId }) //make sure the folderId is from user by checking the count of the array 
  //   .then(count => {
  //     if (count === 0 && !folderId) {
  //       const err = new Error('The `folderId` is not valid');
  //       err.status = 400;
  //       return Promise.reject(err);
  // //     }
  //     return Tag.countDocuments({ _id: tags, userId });
  //   })
  //   .then(count => {
  //     if (count === 0) {
  //       const err = new Error('The `tags` is not valid');
  //       err.status = 400;
  //       return next(err);
  //     }
  //     return Note.create(newNote);
  //   })
  //   .then(result => {
  //     res.location(`${req.originalUrl}/${result.id}`).status(201).json(result);
  //   })
  //   .catch(err => {
  //     next(err);
  //   });

});

/* ========== PUT/UPDATE A SINGLE ITEM ========== */

router.put('/:id', (req, res, next) => {
  // const { id, tags, folderId } = req.params;
  const { id } = req.params;
  const userId = req.user.id;
  const { folderId, tags } = req.body;

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

  //moved all to validatetags and validatefolder
  // if (toUpdate.folderId === '') {
  //   delete toUpdate.folderId;
  //   toUpdate.$unset = {folderId : 1};
  // }

  // if (toUpdate.folderId && !mongoose.Types.ObjectId.isValid(toUpdate.folderId)) {
  //   const err = new Error('The `folderId` is not valid');
  //   err.status = 400;
  //   return next(err);
  // }

  // if (!Array.isArray(toUpdate.tags)) {
  //   const err = new Error('The `tags` property must be an array');
  //   err.status = 400;
  //   return next(err);
  // }

  // if (toUpdate.tags) {
  //   const badIds = toUpdate.tags.filter((tag) => !mongoose.Types.ObjectId.isValid(tag));
  //   if (badIds.length) {
  //     const err = new Error('The `tags` array contains an invalid `id`');
  //     err.status = 400;
  //     return next(err);
  //   }
  // }

  // Note.findOneAndUpdate({ _id : id, userId }, toUpdate, { new: true })
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

  Promise.all([
    validateFolderId(folderId, userId),
    validateTagIds(tags, userId)
  ])
    .then( () => {
      return  Note.findOneAndUpdate({ _id: id, userId}, toUpdate, { new : true });
    })
    .then(result => {
      res.json(result);
    })
    .catch(err => {
      next(err);
    });

  // Folder.countDocuments({ _id: toUpdate.folderId, userId }) 
  //   .then(count => {
  //     if (count === 0) {
  //       const err = new Error('The `folderId` is not valid');
  //       err.status = 400;
  //       return next(err);
  //     }
  //     return Tag.countDocuments({ _id: toUpdate.tags, userId });
  //   })
  //   .then(count => {
  //     if (count === 0) {
  //       const err = new Error('The `tags` is not valid');
  //       err.status = 400;
  //       return next(err);
  //     }
  //     return  Note.findOneAndUpdate({ _id: id, userId}, toUpdate, { new : true });
  //   })
  //   .then(result => {
  //     res.json(result);
  //   })
  //   .catch(err => {
  //     next(err);
  //   });
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
