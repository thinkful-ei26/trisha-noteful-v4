'use strict';

//test requirements
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const express = require('express');
const sinon = require('sinon');

//jwt auth 
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRY, TEST_MONGODB_URI } = require('../config');

//connect to server
const app = require('../server');

//schemas
const Tag = require('../models/tag');
const Note = require('../models/note');
const User = require('../models/user');

//data
const { notes, tags, users } = require('../db/data');

//mount chaiHttp so you can use it
chai.use(chaiHttp);

//needed syntax to test endpoints
const expect = chai.expect;
const sandbox = sinon.createSandbox();

describe('Noteful API - Tags', () => {

  let user;
  let token;
  
  //hooks
  before( () => {
    //connect to test db, blow away any existing collections
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true })
      .then(() => Promise.all([
        User.deleteMany(),
        Note.deleteMany(),
        Tag.deleteMany()
      ]));
  });

  //add jwt auth
  beforeEach( () => {
    return Promise.all([
      User.insertMany(users),
      Tag.insertMany(tags),
      Tag.createIndexes(),
      Note.insertMany(notes)
    ])
      .then( ([users]) => {
        user = users[0];
        token =  jwt.sign( { user }, JWT_SECRET, {
          subject: user.username,
          expiresIn: JWT_EXPIRY
        });
      });
  });

  afterEach(() => {
    //using sandbox to change tags schema in tests, after each tests restore schema from previous state 
    sandbox.restore();
    return Promise.all([
      User.deleteMany(),
      Note.deleteMany(),
      Tag.deleteMany()
    ]);
  });

  after( () => {
    return mongoose.connection.db.dropDatabase()
      .then(() => mongoose.disconnect());
  });

  describe('GET /api/tags', () => {

    it('should return the correct number of tags', () => {
      return Promise.all([
        Tag.find({ userId: user.id }),
        chai.request(app)
          .get('/api/tags')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then( ([data, res]) => {
          // data is an array of all tags from all users
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    it('should return a list sorted by name with the correct fields and values', () => {
      return Promise.all([
        Tag.find({ userId: user.id }).sort('name'),
        chai.request(app)
          .get('/api/tags')
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

      //everytime we're making the tag schema, we're giving it a name transform and then just throw an error
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      return chai.request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          // console.log(res.body);
          expect(res).to.have.status(500);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Internal Server Error');
        });
    });

  });

  describe('GET /api/tags/:id', () => {

    it('should return correct tags', () => {
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .get(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then( res => {
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
        .get('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should respond with a 404 for an id that does not exist', () => {
      // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
      return chai.request(app)
        .get('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      return Tag.findOne({ userId: user.id })
        .then(data => {
          return chai.request(app)
            .get(`/api/tags/${data.id}`)
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

  describe('POST /api/tags', () => {

    it('should create and return a new item when provided valid data', () => {
      const newItem = { name: 'newTag' };
      let body;
      return chai.request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${token}`)
        .send(newItem)
        .then( (res) => {
          body = res.body;
          expect(res).to.have.status(201);
          expect(res).to.have.header('location');
          expect(res).to.be.json;
          expect(body).to.be.a('object');
          expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          return Tag.findOne({ _id: body.id });
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
        .post('/api/tags')
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
        .post('/api/tags')
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
      return Tag.findOne({ userId: user.id })
        .then(data => {
          const newItem = { name: data.name };
          return chai.request(app)
            .post('/api/tags')
            .set('Authorization', `Bearer ${token}`)
            .send(newItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Tag name already exists');
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      const newItem = { name: 'newTag' };
      return chai.request(app)
        .post('/api/tags')
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

  describe('PUT /api/tags/:id', () => {

    it('should update the tag', () => {
      const updateItem = { name: 'Updated Name' };
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then( (res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt', 'userId');
          expect(res.body.id).to.equal(data.id);
          expect(res.body.name).to.equal(updateItem.name);
          expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
          // expect item to have been updated
          expect(new Date(res.body.updatedAt)).to.greaterThan(data.updatedAt);
        });
    });

    it('should respond with a 400 for an invalid id', () => {
      const updateItem = { name: 'Blah' };
      return chai.request(app)
        .put('/api/tags/NOT-A-VALID-ID')
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
      return chai.request(app)
        .put('/api/tags/DOESNOTEXIST')
        .set('Authorization', `Bearer ${token}`)
        .send(updateItem)
        .then(res => {
          expect(res).to.have.status(404);
        });
    });

    it('should return an error when missing "name" field', () => {
      const updateItem = {};
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when "name" field is empty string', () => {
      const updateItem = { name: '' };
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(updateItem);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Missing `name` in request body');
        });
    });

    it('should return an error when given a duplicate name', () => {
      return Tag.find({ userId: user.id }).limit(2)
        .then(results => {
          const [item1, item2] = results;
          item1.name = item2.name;
          return chai.request(app)
            .put(`/api/tags/${item1.id}`)
            .set('Authorization', `Bearer ${token}`)
            .send(item1);
        })
        .then(res => {
          expect(res).to.have.status(400);
          expect(res).to.be.json;
          expect(res.body).to.be.a('object');
          expect(res.body.message).to.equal('Tag name already exists');
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(Tag.schema.options.toJSON, 'transform').throws('FakeError');

      const updateItem = { name: 'Updated Name' };
      return Tag.findOne({ userId: user.id })
        .then(data => {
          return chai.request(app)
            .put(`/api/tags/${data.id}`)
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

  describe('DELETE /api/tags/:id', () => {

    it('should delete an existing tag and respond with 204', () => {
      let data;
      return Tag.findOne({ userId: user.id })
        .then(_data => {
          data = _data;
          return chai.request(app)
            .delete(`/api/tags/${data.id}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then( (res) => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Tag.countDocuments({ _id: data.id }); 
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should delete an existing tag and remove tag reference from note', () => {
      let tagId;
      return Note.findOne({ tags: { $exists: true, $ne: [] } })
        .then(data => {
          tagId = data.tags[0];
          return chai.request(app)
            .delete(`/api/tags/${tagId}`)
            .set('Authorization', `Bearer ${token}`);
        })
        .then( (res) => {
          expect(res).to.have.status(204);
          expect(res.body).to.be.empty;
          return Note.countDocuments({ tags: tagId });
        })
        .then(count => {
          expect(count).to.equal(0);
        });
    });

    it('should respond with a 400 for an invalid id', () => {
      return chai.request(app)
        .delete('/api/tags/NOT-A-VALID-ID')
        .set('Authorization', `Bearer ${token}`)
        .then(res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The `id` is not valid');
        });
    });

    it('should catch errors and respond properly', () => {
      sandbox.stub(express.response, 'sendStatus').throws('FakeError');
      return Tag.findOne()
        .then(data => {
          return chai.request(app)
            .delete(`/api/tags/${data.id}`)
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
