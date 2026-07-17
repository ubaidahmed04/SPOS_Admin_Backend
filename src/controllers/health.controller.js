'use strict';

function health(req, res) {
  return res.success({ status: 'up', time: new Date().toISOString() }, 'OK');
}

module.exports = { health };
