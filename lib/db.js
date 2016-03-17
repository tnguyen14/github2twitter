'use strict';

module.exports = require('level')('./data', {valueEncoding: 'json'});
