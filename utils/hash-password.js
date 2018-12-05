'use strict';

const bcrypt = require('bcryptjs');
const password = 'dogsareREALLYcute';

bcrypt.hash(password, 10)
  .then( digest => {
    console.log('digest =', digest);
    return digest;
  })
  .catch( err => {
    console.error('error', err);
  });

/* hash pw works: 
  node ./utils/hash-password.js
  digest = $2a$10$H4CL2sJJnME5LThmgIgCB.tcgUr1TDthCOPMFRb7jGjxD52fGSK.6 
*/