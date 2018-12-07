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
        // console.log('array of users', users);
        const user = users[0];
        console.log('this is user1: ', user);
        token =  jwt.sign( { user }, JWT_SECRET, {
          subject: user.username,
          expiresIn: JWT_EXPIRY
        });
        // console.log('this is token:', token);
      });
  });

  afterEach(() => {
    //since we're using sandbox to change the tags schema, restore it from previous state after each tests
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

    it.only('should return the correct number of tags', () => {
      return Promise.all([
        Tag.find({ userId: '000000000000000000000001'}),
        chai.request(app)
          .get('/api/tags')
          .set('Authorization', `Bearer ${token}`)
      ])
        .then( ([data, res]) => {
          // data is an array of all tags from all users
          // const res = _res[0];
          console.log('data', data);
          console.log('res.body', res.body);
          expect(res).to.have.status(200);
          expect(res).to.be.json;
          expect(res.body).to.be.a('array');
          expect(res.body).to.have.length(data.length);
        });
    });

    //   it('should return a list sorted by name with the correct fields and values', () => {
    //     return Promise.all([
    //       Tag.find().sort('name'),
    //       chai.request(app).get('/api/tags')
    //     ])
    //       .then(([data, res]) => {
    //         expect(res).to.have.status(200);
    //         expect(res).to.be.json;
    //         expect(res.body).to.be.a('array');
    //         expect(res.body).to.have.length(data.length);
    //         res.body.forEach(function (item, i) {
    //           expect(item).to.be.a('object');
    //           expect(item).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
    //           expect(item.id).to.equal(data[i].id);
    //           expect(item.name).to.equal(data[i].name);
    //           expect(new Date(item.createdAt)).to.eql(data[i].createdAt);
    //           expect(new Date(item.updatedAt)).to.eql(data[i].updatedAt);
    //         });
    //       });
    //   });

    //   it('should catch errors and respond properly', () => {
    //     sandbox.stub(Tag.schema.options.toObject, 'transform').throws('FakeError');

    //     return chai.request(app).get('/api/tags')
    //       .then(res => {
    //         expect(res).to.have.status(500);
    //         expect(res).to.be.json;
    //         expect(res.body).to.be.a('object');
    //         expect(res.body.message).to.equal('Internal Server Error');
    //       });
    //   });

  });

  // describe('GET /api/tags/:id', () => {

  //   it('should return correct tags', () => {
  //     let data;
  //     return Tag.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .get(`/api/tags/${data.id}`);
  //       })
  //       .then((res) => {
  //         expect(res).to.have.status(200);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.an('object');
  //         expect(res.body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
  //         expect(res.body.id).to.equal(data.id);
  //         expect(res.body.name).to.equal(data.name);
  //         expect(new Date(res.body.createdAt)).to.eql(data.createdAt);
  //         expect(new Date(res.body.updatedAt)).to.eql(data.updatedAt);
  //       });
  //   });

  //   it('should respond with a 400 for an invalid id', () => {
  //     return chai.request(app)
  //       .get('/api/tags/NOT-A-VALID-ID')
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should respond with a 404 for an id that does not exist', () => {
  //     // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
  //     return chai.request(app)
  //       .get('/api/tags/DOESNOTEXIST')
  //       .then(res => {
  //         expect(res).to.have.status(404);
  //       });
  //   });

  //   it('should catch errors and respond properly', () => {
  //     sandbox.stub(Tag.schema.options.toObject, 'transform').throws('FakeError');

  //     return Tag.findOne()
  //       .then(data => {
  //         return chai.request(app).get(`/api/tags/${data.id}`);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('POST /api/tags', () => {

  //   it('should create and return a new item when provided valid data', () => {
  //     const newItem = { name: 'newTag' };
  //     let body;
  //     return chai.request(app)
  //       .post('/api/tags')
  //       .send(newItem)
  //       .then(function (res) {
  //         body = res.body;
  //         expect(res).to.have.status(201);
  //         expect(res).to.have.header('location');
  //         expect(res).to.be.json;
  //         expect(body).to.be.a('object');
  //         expect(body).to.have.all.keys('id', 'name', 'createdAt', 'updatedAt');
  //         return Tag.findOne({ _id: body.id });
  //       })
  //       .then(data => {
  //         expect(body.id).to.equal(data.id);
  //         expect(body.name).to.equal(data.name);
  //         expect(new Date(body.createdAt)).to.eql(data.createdAt);
  //         expect(new Date(body.updatedAt)).to.eql(data.updatedAt);
  //       });
  //   });

  //   it('should return an error when missing "name" field', () => {
  //     const newItem = {};
  //     return chai.request(app)
  //       .post('/api/tags')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when "name" field is empty string', () => {
  //     const newItem = { name: '' };
  //     return chai.request(app)
  //       .post('/api/tags')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when given a duplicate name', () => {
  //     return Tag.findOne()
  //       .then(data => {
  //         const newItem = { name: data.name };
  //         return chai.req
  // =>           .post('/api/tags')
  //           .send(newItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Tag name already exists');
  //       });
  //   });

  //   it('should catch errors and respond properly', () => {
  //     sandbox.stub(Tag.schema.options.toObject, 'transform').throws('FakeError');

  //     const newItem = { name: 'newTag' };
  //     return chai.request(app)
  //       .post('/api/tags')
  //       .send(newItem)
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('PUT /api/tags/:id', () => {

  //   it('should update the tag', () => {
  //     const updateItem = { name: 'Updated Name' };
  //     let data;
  //     return Tag.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .put(`/api/tags/${data.id}`)
  //           .send(updateItem);
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

  //   it('should respond with a 400 for an invalid id', () => {
  //     const updateItem = { name: 'Blah' };
  //     return chai.request(app)
  //       .put('/api/tags/NOT-A-VALID-ID')
  //       .send(updateItem)
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should respond with a 404 for an id that does not exist', () => {
  //     const updateItem = { name: 'Blah' };
  //     // The string "DOESNOTEXIST" is 12 bytes which is a valid Mongo ObjectId
  //     return chai.request(app)
  //       .put('/api/tags/DOESNOTEXIST')
  //       .send(updateItem)
  //       .then(res => {
  //         expect(res).to.have.status(404);
  //       });
  //   });

  //   it('should return an error when missing "name" field', () => {
  //     const updateItem = {};
  //     let data;
  //     return Tag.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .put(`/api/tags/${data.id}`)
  //           .send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when "name" field is empty string', () => {
  //     const updateItem = { name: '' };
  //     let data;
  //     return Tag.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .put(`/api/tags/${data.id}`)
  //           .send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Missing `name` in request body');
  //       });
  //   });

  //   it('should return an error when given a duplicate name', () => {
  //     return Tag.find().limit(2)
  //       .then(results => {
  //         const [item1, item2] = results;
  //         item1.name = item2.name;
  //         return chai.request(app)
  //           .put(`/api/tags/${item1.id}`)
  //           .send(item1);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Tag name already exists');
  //       });
  //   });

  //   it('should catch errors and respond properly', () => {
  //     sandbox.stub(Tag.schema.options.toObject, 'transform').throws('FakeError');

  //     const updateItem = { name: 'Updated Name' };
  //     return Tag.findOne()
  //       .then(data => {
  //         return chai.request(app)
  //           .put(`/api/tags/${data.id}`)
  //           .send(updateItem);
  //       })
  //       .then(res => {
  //         expect(res).to.have.status(500);
  //         expect(res).to.be.json;
  //         expect(res.body).to.be.a('object');
  //         expect(res.body.message).to.equal('Internal Server Error');
  //       });
  //   });

  // });

  // describe('DELETE /api/tags/:id', () => {

  //   it('should delete an existing tag and respond with 204', () => {
  //     let data;
  //     return Tag.findOne()
  //       .then(_data => {
  //         data = _data;
  //         return chai.request(app)
  //           .delete(`/api/tags/${data.id}`);
  //       })
  //       .then(function (res) {
  //         expect(res).to.have.status(204);
  //         expect(res.body).to.be.empty;
  //         return Tag.count({ _id: data.id });
  //       })
  //       .then(count => {
  //         expect(count).to.equal(0);
  //       });
  //   });

  //   it('should delete an existing tag and remove tag reference from note', () => {
  //     let tagId;
  //     return Note.findOne({ tags: { $exists: true, $ne: [] } })
  //       .then(data => {
  //         tagId = data.tags[0];

  //         return chai.request(app)
  //           .delete(`/api/tags/${tagId}`);
  //       })
  //       .then(function (res) {
  //         expect(res).to.have.status(204);
  //         expect(res.body).to.be.empty;
  //         return Note.count({ tags: tagId });
  //       })
  //       .then(count => {
  //         expect(count).to.equal(0);
  //       });
  //   });

  //   it('should respond with a 400 for an invalid id', () => {
  //     return chai.request(app)
  //       .delete('/api/tags/NOT-A-VALID-ID')
  //       .then(res => {
  //         expect(res).to.have.status(400);
  //         expect(res.body.message).to.equal('The `id` is not valid');
  //       });
  //   });

  //   it('should catch errors and respond properly', () => {
  //     sandbox.stub(express.response, 'sendStatus').throws('FakeError');
  //     return Tag.findOne()
  //       .then(data => {
  //         return chai.request(app).delete(`/api/tags/${data.id}`);
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

// 'use strict';

// const chai = require('chai');
// const chaiHttp = require('chai-http');
// const mongoose = require('mongoose');
// const express = require('express');
// const sinon = require('sinon');
// const jwt = require('jsonwebtoken');
// const app = require('../server');
// const Tag = require('../models/tag');
// const Note = require('../models/note');
// const Folder = require('../models/folder');
// const User = require('../models/user');
// const { folders, notes, tags, users } = require('../db/data');
// const { TEST_MONGODB_URI, JWT_SECRET } = require('../config');

// chai.use(chaiHttp);
// const expect = chai.expect;
// const sandbox = sinon.createSandbox();

// describe.only('Noteful API - Tags', function () {

//   before(function () {
//     return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true })
//       .then(() => Promise.all([
//         User.deleteMany({}),
//         Note.deleteMany({}),
//         Folder.deleteMany({}),
//         Tag.deleteMany({})
//       ]));
//   });
//   let user;
//   let token;
//   beforeEach(function () {
//     return Promise.all([
//       User.insertMany(users),
//       Note.insertMany(notes),
//       Folder.insertMany(folders),
//       Tag.insertMany(tags),
//       Tag.createIndexes(),
//       Folder.createIndexes()  
//     ])
//       .then(([users]) => {
//         user = users[0];
//         token = jwt.sign({ user }, JWT_SECRET, { subject: user.username });
//       });
//   });

//   afterEach(function () {
//     sandbox.restore();
//     return Promise.all([
//       User.deleteMany({}),
//       Note.deleteMany({}),
//       Folder.deleteMany({}),
//       Tag.deleteMany({})
//     ]);
//   });

//   after(function () {
//     return mongoose.disconnect();
//   });

//   describe('GET /api/tags', function () {

//     it('should return the correct number of tags', function () {
//       return Promise.all([
//         Tag.find({ userId: user.id }),
//         chai.request(app).get('/api/tags')
//           .set('Authorization', `Bearer ${token}`)
//       ])
//         .then(([data, res]) => {
//           expect(res).to.have.status(200);
//           expect(res).to.be.json;
//           expect(res.body).to.be.a('array');
//           expect(res.body).to.have.length(data.length);
//         });
//     });

//   });
// });