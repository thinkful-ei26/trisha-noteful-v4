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

const { folders, notes, tags, users } = require('../db/data');
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
        return token; // is this needed?
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

    it.only('should return a list sorted with the correct number of folders', () => {
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
        });
    });

    it('should return a list sorted by name with the correct fields and values', function () {
      return Promise.all([
        Folder.find().sort('name'),
        chai.request(app)
          .get('/api/folders')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then(([data, res]) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
          res.body.forEach(function (item, i) {
            expect(item).to.be.a('object');
            expect(item).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
            expect(item.id).to.equal(data[i].id);
            expect(item.name).to.equal(data[i].name);
            expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
            expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
          });
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');
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

  // describe.only('GET /api/folders/:id', function () {

  //   it.only('should return correct folder', function () {
  //     let data;
  //     return Folder.findOne({ userId: user.id }) //find a note that is from the same user with the same jwt from before
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).get(`/api/folders/${data.id}`)
  //           .set('Authorization', `Bearer ${token}}`); //set is the same POSTMAN 
  //       })
  //       .then((res) => {
  //         expect(res).to.have.status(200);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.an('object');
  //         expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
  //         expect(res.body.id).to.equal(data.id);
  //         expect(res.body.name).to.equal(data.name);
  //         expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
  //         expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
  //       });
  //   });

  //   it('should respond with a 400 for an invalid id', function () {
  //     return chai.request(app)
  //       .get('/api/folders/NOT-A-VALID-ID')
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should respond with a 404 for an id that does not exist', function () {
  //     // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
  //     return chai.request(app)
  //       .get('/api/folders/DOESNOTEXIST')
  //       .then(res => {
  //         expect(res).to.have.status(404);
  //       });
  //   });

  //   it('should catch errors and respond properly', function () {
  //     sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).get(`/api/folders/${data.id}`);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('POST /api/folders', function () {

  //   it('should create and return a new item when provided valid data', function () {
  //     const newItem = { name: 'newFolder' };
  //     let body;
  //     return chai.request(app)
  //       .post('/api/folders')
  //       .send(newItem)
  //       .then(function (res) {
  //         body = res.body;
  //         expect(res).to.have.status(201);
  //         expect(res).to.have.header('location');
  //         expect(res).to.be.json;
  //         expect(body).to.be.a('object');
  //         expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
  //         return Folder.findById(body.id);
  //       })
  //       .then(data => {
  //         expect(body.id).to.equal(data.id);
  //         expect(body.name).to.equal(data.name);
  //         expect(new Date(body.createdAt)).to.eql(data.createdAt);
  //         expect(new Date(body.updatedAt)).to.eql(data.updatedAt);
  //       });
  //   });

  //   it('should return an error when missing "name" field', function () {
  //     const newItem = {};
  //     return chai.request(app)
  //       .post('/api/folders')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when "name" field is empty string', function () {
  //     const newItem = { name: '' };
  //     return chai.request(app)
  //       .post('/api/folders')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when given a duplicate name', function () {
  //     return Folder.findOne()
  //       .then(data => {
  //         const newItem = { name: data.name };
  //         return chai.request(app).post('/api/folders').send(newItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Folder name already exists');
  //       });
  //   });

  //   it('should catch errors and respond properly', function () {
  //     sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

  //     const newItem = { name: 'newFolder' };
  //     return chai.request(app)
  //       .post('/api/folders')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('PUT /api/folders/:id', function () {

  //   it('should update the folder', function () {
  //     const updateItem = { name: 'Updated Name' };
  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem);
  //       })
  //       .then(function (res) {
  //         expect(res).to.have.status(200);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
  //         expect(res.body.id).to.equal(data.id);
  //         expect(res.body.name).to.equal(updateItem.name);
  //         expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
  //         // expect item to have been updated
  //         expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
  //       });
  //   });

  //   it('should respond with a 400 for an invalid id', function () {
  //     const updateItem = { name: 'Blah' };
  //     return chai.request(app)
  //       .put('/api/folders/NOT-A-VALID-ID')
  //       .send(updateItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should respond with a 404 for an id that does not exist', function () {
  //     const updateItem = { name: 'Blah' };
  //     // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
  //     return chai.request(app)
  //       .put('/api/folders/DOESNOTEXIST')
  //       .send(updateItem)
  //       .then(res => {
  //         expect(res).to.have.status(404);
  //       });
  //   });

  //   it('should return an error when missing "name" field', function () {
  //     const updateItem = {};
  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when "name" field is empty string', function () {
  //     const updateItem = { name: '' };
  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .put(`/api/folders/${data.id}`)
  //           .send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when given a duplicate name', function () {
  //     return Folder.find().limit(2)
  //       .then(results => {
  //         const [item1, item2] = results;
  //         item1.name = item2.name;
  //         return chai.request(app)
  //           .put(`/api/folders/${item1.id}`)
  //           .send(item1);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Folder name already exists');
  //       });
  //   });

  //   it('should catch errors and respond properly', function () {
  //     sandbox.stub(Folder.schema.options.toObject, 'transform').throws('FakeError');

  //     const updateItem = { name: 'Updated Name' };
  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).put(`/api/folders/${data.id}`).send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('DELETE /api/folders/:id', function () {

  //   it('should delete an existing folder and respond with 204', function () {
  //     let data;
  //     return Folder.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app).delete(`/api/folders/${data.id}`);
  //       })
  //       .then(function (res) {
  //         expect(res).to.have.status(204);
  //         expect(res.body).to.be.empty;
  //         return Folder.count({ _id: data.id });
  //       })
  //       .then(count => {
  //         expect(count).to.equal(0);
  //       });
  //   });

  //   it('should delete an existing folder and remove folderId reference from note', function () {
  //     let folderId;
  //     return Note.findOne({ folderId: { $exists: true } })
  //       .then(data => {
  //         folderId = data.folderId;
  //         return chai.request(app)
  //           .delete(`/api/folders/${folderId}`);
  //       })
  //       .then(function (res) {
  //         expect(res).to.have.status(204);
  //         expect(res.body).to.be.empty;
  //         return Note.count({ folderId });
  //       })
  //       .then(count => {
  //         expect(count).to.equal(0);
  //       });
  //   });

  //   it('should respond with a 400 for an invalid id', function () {
  //     return chai.request(app)
  //       .delete('/api/folders/NOT-A-VALID-ID')
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should catch errors and respond properly', function () {
  //     sandbox.stub(express.response, 'sendStatus').throws('FakeError');
  //     return Folder.findOne()
  //       .then(data => {
  //         return chai.request(app).delete(`/api/folders/${data.id}`);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

});
