/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var _ = require('lodash');
var os = require('os');
var Promise = require('bluebird');

var DNT_ALLOWED_QUERY_PARAMS = [
  'context',
  'entrypoint',
  'migration',
  'service',
];
var NO_DNT_ALLOWED_QUERY_PARAMS = DNT_ALLOWED_QUERY_PARAMS.concat([
  'utm_campaign',
  'utm_content',
  'utm_medium',
  'utm_source',
  'utm_term'
]);
var HOSTNAME = os.hostname();
var MAX_PARAM_LENGTH = 100;
var VERSION = 1;

module.exports = function (event, data, request) {
  var queryParams = _.pick(request.query, isDNT(request) ?
    DNT_ALLOWED_QUERY_PARAMS : NO_DNT_ALLOWED_QUERY_PARAMS);

  var eventData = _.assign({
    event: event,
    hostname: HOSTNAME,
    op: 'activityEvent',
    pid: process.pid,
    userAgent: request.headers['user-agent'],
    v: VERSION
  }, data, _.mapValues(queryParams, limitLength));

  optionallySetFallbackData(eventData, 'service', request.query.client_id);
  optionallySetFallbackData(eventData, 'entrypoint', request.query.entryPoint);

  if (typeof eventData.time === 'number') {
    eventData.time = new Date(eventData.time).toISOString();
  }

  return new Promise(function (resolve) {
    setImmediate(function () {
      // The data pipeline listens on stderr.
      process.stderr.write(JSON.stringify(eventData) + '\n');
      resolve();
    });
  });
};

function isDNT (request) {
  return request.headers.dnt === '1';
}

function limitLength (param) {
  if (param && param.length > MAX_PARAM_LENGTH) {
    return param.substr(0, MAX_PARAM_LENGTH);
  }

  return param;
}

function optionallySetFallbackData (eventData, key, fallback) {
  if (! eventData[key] && fallback) {
    eventData[key] = limitLength(fallback);
  }
}

