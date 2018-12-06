'use strict';

const app = require('../server');
const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');

const { TEST_MONGODB_URI } = require('../config');

const User = require('../models/user');

const expect = chai.expect;

chai.use(chaiHttp);

describe('Noteful API - Users', () => {
  const username = 'exampleUser';
  const password = 'examplePass';
  const fullname = 'Example User';

  before( () => {
    return mongoose.connect(TEST_MONGODB_URI, { useNewUrlParser: true, useCreateIndex : true })
      .then(() => User.deleteMany());
  });

  beforeEach( () => {
    return User.createIndexes();
  });

  afterEach( () => {
    return User.deleteMany();
  });

  after( () => {
    return mongoose.disconnect();
  });

  describe('POST /api/users', () => {

    it('Should create a new user', () => {
      let res;
      return chai
        .request(app)
        .post('/api/users')
        .send({ username, password, fullname })
        .then(_res => {
          res = _res;
          expect(res).to.have.status(201);
          expect(res.body).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
          return User.findOne({ username });
        })
        .then(user => {
          expect(user).to.exist;
          expect(user.id).to.equal(res.body.id);
          expect(user.fullname).to.equal(fullname);
          return user.validatePassword(password);
        })
        .then(isValid => {
          expect(isValid).to.be.true;
        });
    });

    it('Should reject users with missing username', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          password,
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal('Missing \'username\' in request body');

        })
        .catch( err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Missing field');
          expect(res.body.location).to.equal('username');
        });
    });
    it('Should reject users with missing password', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username,
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal('Missing \'password\' in request body');

        })
        .catch( err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Missing field');
          expect(res.body.location).to.equal('password');

        });
    });
  
    it('Should reject users with non-string username', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username: 1234,
          password,
          fullname
        })
        .then( res => {
          expect(res.body.message).to.equal('Incorrect field type: expected string and got string');
        })
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal(
            'Incorrect field type: expected string'
          );
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with non-string password', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username,
          password: 1234,
          fullname
        })
        .then( res =>
          expect(res).to.have.status(422)
        )
        .catch(err => {
          if (err instanceof chai.AssertionError) {
            throw err;
          }

          const res = err.response;
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal(
            'Incorrect field type: expected string'
          );
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with non-trimmed username', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username: ` ${username} `,
          password,
          fullname
        })
        .then( res => {
          //because of the new mocha/chai update, .fail doesn't work anymore
          // expect.fail(` ${username} `, `${username}`, 'Request should not succeed on non-trimmed username')

          expect(res).to.have.status(422);
          expect(res.body.message).to.equal('The field: username cannot start or end with a whitespace');
        });
    });

    it('Should reject users with non-trimmed password', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username,
          password: ` ${password} `,
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.message).to.equal('The field: password cannot start or end with a whitespace');
        });
    });

    it('Should reject users with empty username', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username: '',
          password,
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at least 1 characters long');
          expect(res.body.location).to.equal('username');
        });
    });

    it('Should reject users with password less than 8 characters', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username,
          password: '',
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at least 8 characters long');
          expect(res.body.location).to.equal('password');
        });
    });

    it('Should reject users with password greater than 72 characters', () => {
      return chai
        .request(app)
        .post('/api/users')
        .send({
          username,
          password: 'zpQD5eZeiNjlgGcy27Yj83X6qtG2g82gcZB1w7uF83X6qtG2g82gcZB1w7uFrtghyredtgere85',
          fullname
        })
        .then( res => {
          expect(res).to.have.status(422);
          expect(res.body.reason).to.equal('ValidationError');
          expect(res.body.message).to.equal('Must be at most 72 characters long');
          expect(res.body.location).to.equal('password');
        });
    });
    it('Should reject users with duplicate username', () => {
      return User.create({
        username,
        password,
        fullname
      })
        .then( () => {
          return chai
            .request(app)
            .post('/api/users')
            .send({ username, password, fullname });
        })
        .then( res => {
          expect(res).to.have.status(400);
          expect(res.body.message).to.equal('The username already exists');
        });
    });

    //this test should pass!
    it('Should trim fullname', () => {
      return chai
        .request(app) //if your server is not running, then chai will find a suitable port to listen to
        .post('/api/users')
        .send({
          username,
          password,
          fullname: ` ${fullname} `
        })
        .then( res => {
          expect(res).to.have.status(201);
          expect(res).to.be.an('object');
          expect(res.body).to.have.keys('id', 'username', 'fullname');
          expect(res.body.id).to.exist;
          expect(res.body.username).to.equal(username);
          expect(res.body.fullname).to.equal(fullname);
        });
    });
  
  });
});