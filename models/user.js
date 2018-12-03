'use strict';

const mongoose = require('mongoose');

/* Define UserSchema and User model */
const UserSchema = new mongoose.Schema({
  //we can use virtualize a firstname and lastname for fullname, but we're lazy so:
  fullname : { type : String, default: ''},
  username : { 
    type : String, 
    required: true, 
    unique: true 
  },
  password : { 
    type : String, 
    required : true 
  }
});

/* use mongoose transform instead of serialize, set it toJSON */
UserSchema.set('toJSON', {
  virtuals: true, 
  transform: (doc, result) => {
    delete result._id;
    delete result.__v;
    delete result.password; //delete plaintext password so it doesn't come back in the response
  }
});

// Not needed below b/c of transform above
/* serialize to hide sensitive info from the database, note you can't use ES6 fat arrow due to this.something */
// UserSchema.methods.serialize = function () {
//   return {
//     id: this._id,
//     username: this.username, 
//     fullname: this.fullname
//   };
// };

//define .validatePassword as a static fn
UserSchema.methods.validatePassword = function (incomingPassword) {
  const user = this; 
  return incomingPassword === user.password; 
};


// const User = mongoose.model('User', UserSchema);
// module.exports = { User };  //if you use this, make sure that you the require on server.js is also an object

module.exports = mongoose.model('User', UserSchema);