(function(window) {
  'use strict';

  var require = window.require,
    define = window.define;

  require(['./config'], function(config) {
    require.config(config);
    require(['./main'], function() {});
  });
}(this));
