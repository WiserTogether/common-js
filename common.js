define(function (require) {
    "use strict";
    var $ = require('jquery'),
        Wiser = require('./wiser-global');

    Wiser.utils = Wiser.utils || {};

    if (typeof Wiser.utils === 'object') {
          /* WiserTogether Utility Functions
           *
           */

          /* getProperty: checks a long object property chain for a value and
           * returns undefined if any property along the chain does not exist
           * instead of throwing an error
           */

         Wiser.utils.getProperty = function (object, propertiesString) {
              var i,
                  length,
                  split = propertiesString.split('.');

              for (i = 0, length = split.length; i < length; i += 1) {
                  object = object[split[i]];
                  if (object === undefined) {
                      // Can't proceed
                      break;
                  }
              }
              return object;
         };

          /* throttle: prevents a function from being fired more frequently
           * than a specified amount of time
           *
           * Vital for browser events like scroll that can be fired fast
           * enough to impact performance
           */

          Wiser.utils.throttle = function (fn, delay) {
              var timer = null;
              return function () {
                  var context = this,
                      args = arguments;

                  clearTimeout(timer);
                  timer = setTimeout(function () {
                      fn.apply(context, args);
                  }, delay);
              };

          };

          /* decodeURIComponentPlus: Performs the URL unqouting of the
           * decodeURIComponent builtin of JavaScript, but also replaces '+'
           * characters with spaces.
           */
          Wiser.utils.decodeURIComponentPlus = function (string) {
              var space_regex = /\+/g;

              return decodeURIComponent(string.replace(space_regex, ' '));
          };

          /* parseQueryString: Parses a query string and returns an object
           * with property/value pairs that match how the key/value pairs
           * in the query string.
           *
           * Optionally takes in an array to specify which keys to retrieve.
           */
          Wiser.utils.parseQueryString = function (queryString, filterParams) {
              var match,
                  paramName,
                  paramValue,
                  search = /([^&=]+)=?([^&]*)/g,
                  object = {};

              while ((match = search.exec(queryString)) !== null) {
                  paramName = Wiser.utils.decodeURIComponentPlus(match[1]);
                  paramValue = Wiser.utils.decodeURIComponentPlus(match[2]);

                  // Check to see if we have a filter setup, and if we do,
                  // only include those values in the object we return.
                  if (typeof filterParams === 'undefined' || $.inArray(paramName, filterParams) > -1) {
                      object[paramName] = paramValue;
                  }
              }

              return object;
          };
     }
    return Wiser.utils;
});
