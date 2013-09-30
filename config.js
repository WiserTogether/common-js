(function(root, factory) {
  if (typeof exports !== 'undefined') {
    factory(root, exports);
  } else if (typeof define === 'function' && define.amd) {
    define(['exports'], function(exports) {
      factory(root, exports);
    });
  } else {
    factory(root, {});
  }
}(this, function(root, config) {
  function requireModule(name, path, exports, deps) {
    var shim = {},
        maps = [];

    if (typeof(name) === 'object') {
        maps = name.slice(1);
        name = name[0];
    }

    // Allow shorthand for bower
    path = path.replace(/^bower\//, '../components/');

    config.paths[name] = path;

    if (maps.length > 0) {
        for (var i = 0; i < maps.length; i = i + 1) {
            config.map['*'][maps[i]] = name;
        }
    }

    if (exports || deps) {
      config.shim[name] = shim;

      if (deps) {
        shim.deps = deps;
      }

      if (typeof(exports) === 'function') {
        shim.init = exports;
      }
      else {
        shim.exports = exports;
      }
    }
  }

  config.paths = {};
  config.map = {'*': {}};
  config.baseUrl = 'src/js/';
  config.shim = {};

  config.hbs = {
    disableI18n: true,
    disableHelpers: true
  };
  config.pragmasOnSave = {
    excludeHbsParser: true,
    excludeHbs: true,
    excludeAfterBuild: true
  };

  requireModule('console-shim', 'bower/console-shim/console-shim', 'console');
  requireModule('crypto.aes', 'bower/crypto-js/build/rollups/aes', 'CryptoJS');
  requireModule('jquery', 'bower/jquery/jquery');
  requireModule('backbone', 'bower/backbone/backbone', 'Backbone', ['jquery', 'underscore', 'jquery.cors']);
  requireModule('easyxdm', 'bower/easyxdm/easyXDM', 'easyXDM', ['json2']);
  requireModule('google-loader', '//www.google.com/jsapi');
  requireModule('google-analytics', '//www.google-analytics.com/ga');
  requireModule('hbs', 'bower/require-handlebars-plugin/hbs');
  requireModule(['Handlebars', 'handlebars'], 'bower/require-handlebars-plugin/Handlebars');
  requireModule('i18nprecompile', 'bower/require-handlebars-plugin/hbs/i18nprecompile');
  requireModule('json2', 'bower/require-handlebars-plugin/hbs/json2', 'JSON');
  requireModule('underscore', 'bower/underscore/underscore', '_');
  requireModule('portamento', 'bower/portamento/portamento', 'portamento', ['jquery']);
  requireModule('socialite', 'bower/socialite/socialite', 'socialite');
  requireModule('jquery.cookie', 'bower/jquery.cookie/jquery.cookie', '$.cookie', ['jquery']);
  requireModule('jquery.cors', 'bower/jquery.iecors/jquery.iecors');
  requireModule('jquery.hoverintent', 'bower/jquery-hoverIntent/jquery.hoverIntent', '$.fn.hoverIntent', ['jquery']);
  requireModule('jquery.overlay', 'bower/jquery.tools/src/overlay/overlay', '$.tools.overlay', ['jquery']);
  requireModule('jquery.tooltip', 'bower/jquery.tools/src/tooltip/tooltip', '$.tools.tooltip', ['jquery']);
  requireModule('jquery-url-parser', 'bower/purl/purl', 'purl', ['jquery']);
  requireModule('jquery-ui', 'bower/jquery-ui/ui/jquery-ui', '$.ui', ['jquery']);
}));
