'use strict';

//update folders to include jwt auth, so you need to have jwt, users, notes and folders

const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const express = require('express');
const sinon = require('sinon');

//Auth requirements
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY } = require('../config');

const app = require('../server');

//schemas
const Folder = require('../models/folder');
const Note = require('../models/note');
const User = require('../models/user');

const { folders, notes, users } = require('../db/data');
const { TEST_MONGODB_URI } = require('../config');

//mount chai http so you can use it
chai.use(chaiHttp); 

//declare chai.expect as variable to use it for tests
const expect = chai.expect;
const sandbox = sinon.createSandbox();

describe('Noteful API - Folders', () => {
  
  //set token and user at high scope to be accessible for rest of test
  let token;
  let user;

  //test hooks: 
  //connect to db, blow away the existing db
  before( () => {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true })
      .then(() => Promise.all([
        User.deleteMany(),
        Note.deleteMany(),
        Folder.deleteMany()
      ]));
  });

  //insert some notes before test
  beforeEach( () => {
    return Promise.all([
      User.insertMany(users),
      Folder.insertMany(folders),
      Folder.createIndexes(), //tag & folder schemas has indexes 
      Note.insertMany(notes)
    ])
      .then((results) => {
        const userResults = results[0];
        user = userResults[0];
        token =  jwt.sign( { user }, JWT_SECRET, {
          subject: user.username,
          expiresIn: JWT_EXPIRY
        });
      });
  });

  //delete again
  afterEach( () => {
    sandbox.restore();  // restore the previous state of db after each test     https://sinonjs.org/releases/v1.17.7/sandbox/
    return Promise.all([
      User.deleteMany(),
      Note.deleteMany(), 
      Folder.deleteMany()
    ]);
  });

  //after ALL tests, disconnect from db
  after( () => {
    //drop database if you want to:
    // return mongoose.connection.db.dropDatabase()
    //and then disconnect from the moongoose server (this would be a .then promise)
    return mongoose.disconnect();
  });
  
  describe('GET /api/folders', () => {

    it('should return a list sorted with the correct number of folders', () => {
      return Promise.all([
        Folder.find({ userId: user.id})
          .sort('name'),
        chai.request(app) //to use chai http's live integration testing , you need to make a call to the app or url. request.app will open the server for incoming 
          .get('/api/folders')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          // console.log('this is data', data);
          // console.log('this is res', res.body);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list sorted by name with the correct fields and values', () => {
      return Promise.all([
        Folder.find({ userId: user.id})
          .sort('name'),
        chai.request(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach( (item, i) => {
            expect(item).to.be.a('object');
            expect(item).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
            expect(item.id).to.equal(data[i].id);
            expect(item.name).to.equal(data[i].name);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      return chai.request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

  describe('GET /api/folders/:id', () => {

    it('should return correct folder', () => {
      let data;
      return Folder.findOne({ userId: user.id }) //find a note that is from the same user with the same jwt from before
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`); //set is the same POSTMAN 
        })
        .then((res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(data.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', () => {
      return chai.request(app)
        .get('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist',  () => {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      let data;
      return Folder.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

  describe('POST /api/folders', () => {

    it('should create and return a new item when provided valid data', () => {
      const newItem = { name: 'newFolder' };
      
      //body is response body of the newnote you will create on every post
      let body;
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then( res => {
          // console.log(res.body);
          //grab one folder from the array of folders
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.an('object');
          expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId' ); 
          //if validation passes, we've created a new folder, find one then test it
          return Folder.findOne({ _id: body.id, userId: user.id });
        })
        .then(data => {
          expect(body.id).to.equal(data.id);
          expect(body.name).to.equal(data.name);
          expect(new Date(body.createdAt)).to.eql(data.createdAt);
          expect(new Date(body.updatedAt)).to.eql(data.updatedAt);
        });
    });

    it('should return an error when missing "name" field', () => {
      const newItem = {};
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when "name" field is empty string', () => {
      const newItem = { name: '' };
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', () => {
      return Folder.findOne({ userId: user.id })
        .then(data => {
          const newItem = { name: data.name };
          return chai.request(app)
            .post('/api/folders')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');

      const newItem = { name: 'newFolder' };
      return chai.request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

  describe('PUT /api/folders/:id', () => {

    it('should update the folder', () => {
      const updateItem = { name: 'Updated Name' };
      let data;
      return Folder.findOneAndUpdate({ userId: user.id }) 
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then( res => {
          // console.log('res.body: ', res.body);
          // console.log('data.id: ', data.id);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('name', 'userId', 'createdAt', 'updatedAt', 'id');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', () => {
      const updateItem = { name: 'Blah' };
      return chai
        .request(app)
        .put('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', () => {
      const updateItem = { name: 'Blah' };
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai
        .request(app)
        .put('/api/folders/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', () => {
      const updateItem = {};
      let data;
      return Folder.findOneAndUpdate({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai
            .request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          // console.log(res.body);
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when "name" field is empty string', () => {
      const updateItem = { name: '' };
      let data;
      return Folder.findOneAndUpdate({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          // console.log(res.body);
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', () => {
      return Folder.find({ userId: user.id }).limit(2)
        .then(results => {
          // console.log(results); //should be an array of 2 folders
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/folders/${item1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          // console.log(res.body);
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Folder name already exists');
        });
    });

    it('should catch errors and respond properly', () => {
      //let's grab the res.json(results) and give it bad information
      const badInfo = sandbox.stub(Folder.schema.options.toJSON, 'transform').throws('FakeError');
      // console.log(s);

      //alternatively, you could just feed Folder.findOneAndUpdate hardcoded badinfo

      const updateItem = { name: 'Updated Name' };
      let data;
      return Folder.findOneAndUpdate({badInfo})
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

  describe('DELETE /api/folders/:id', () => {

    it('should delete an existing folder and respond with 204', () => {
      let data;
      return Folder.findOneAndRemove({ userId: user.id })
        .then(_data => {
          data = _data;
          // console.log('this is data',data);
          return chai.request(app)
            .delete(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then( res => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Folder.countDocuments({ _id: data.id });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should delete an existing folder and remove folderId reference from note', () => {
      let folderId;
      //find a one note with a folderId that has an existing value
      //AND belonging to the correct user 
      return Note.findOne({ 
        $and: [ 
          { folderId: { $exists: true } }, 
          { userId: user.id } 
        ] 
      }) 
        .then(data => {
          // console.log(data);
          folderId = data.folderId;
          return chai.request(app)
            .delete(`/api/folders/${folderId}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Note.countDocuments({ folderId });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', () => {
      return chai
        .request(app)
        .delete('/api/folders/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          // console.log(res.body);
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should catch errors and respond properly', () => {
      
      //we've got this badData res.json(results), feed error-inducing badData to test if our error messages is working
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      // console.log(badData);

      return Folder.findOneAndRemove({ userId: user.id })
        .then(data => {
          return chai
            .request(app)
            .delete(`/api/folders/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then(res => {
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

});
