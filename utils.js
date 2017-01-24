define([
  'jquery',
  'underscore',
  'backbone',
  'crypto.aes',
  'jquery.cookie'
], function ($, _, Backbone, CryptoJS) {
  var utils = {};
  utils.BaseObject = function (options) {
    this.initialize(options);
  };

    // Shared empty constructor function to aid in prototype-chain creation.
  var ctor = function () {};

    // Helper function to correctly set up the prototype chain, for subclasses.
    // Similar to `goog.inherits`, but uses a hash of prototype properties and
    // class properties to be extended.
  var inherits = function (parent, protoProps, staticProps) {
    var child;

        // The constructor function for the new subclass is either defined by you
        // (the "constructor" property in your `extend` definition), or defaulted
        // by us to simply call `super()`.
    if (protoProps && protoProps.hasOwnProperty('constructor')) {
      child = protoProps.constructor;
    } else {
      child = function () { return parent.apply(this, arguments); };
    }

        // Set the prototype chain to inherit from `parent`, without calling
        // `parent`'s constructor function.
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();

        // Add prototype properties (instance properties) to the subclass,
        // if supplied.
    if (protoProps) {
      _.extend(child.prototype, protoProps);
    }

        // Add static properties to the constructor function, if supplied.
    if (staticProps) {
      _.extend(child, staticProps);
    }

        // Correctly set child's `prototype.constructor`, for `instanceof`.
    child.prototype.constructor = child;

        // Set a convenience property in case the parent's prototype is needed later.
    child.__super__ = parent.prototype;

    return child;
  };
  var extend = function (protoProps, classProps) {
    var child = inherits(this, protoProps, classProps);
    child.extend = extend;
    return child;
  };

  utils.BaseObject.extend = extend;

  utils.API = {};

  utils.API.getToken = function () {
    var api_csrf_token = $.cookie('api_csrf_token');

    if (typeof(api_csrf_token) !== 'string') {
      return '';
    }

    var security_token = 'api_csrf_token=' + api_csrf_token + ';';
    security_token += 'timestamp=' + Math.round(new Date().getTime() / 1000) + ';';

        // Get rid of any optional parameters that might contain arbitrary characters
    security_token += 'uri=' + document.URL.split('?')[0] + ';';

    var encrypted_token = CryptoJS.AES.encrypt(
            security_token,
            CryptoJS.enc.Utf8.parse(api_csrf_token), {
              iv: CryptoJS.enc.Utf8.parse(api_csrf_token.substring(0, 16))
            }
        );

    return encodeURIComponent(encrypted_token.ciphertext.toString(CryptoJS.enc.Base64));
  };

  utils.Strings = {};

  utils.Strings.capitalize = function (input_string) {
    return input_string.charAt(0).toUpperCase() + input_string.slice(1);
  };

    // Create a fancy throbber with a loading graphic inside as a placeholder
    // for loading or ajax calls. Can either be passed a container, which it
    // will fill 100% of using position: absolute, or a width and a height so
    // you can place and remove it manually.
    //
  utils.Throbber = Backbone.View.extend({
    tagName: 'div',
    className: 'throbber',

    initialize: function(options) {
      Backbone.View.prototype.initialize.call(this, options);

            // By default, animate in the throbber
            // Set this to false if the throbber is the initial placeholder for
            // loading elements
      if (typeof options.animate === 'undefined') {
                // Note: the idiomatic var myvar = myvar || default does not
                // work if you want to pass in false (as in our case) or null
        options.animate = true;
      }

            // Set the opacity of the throbber - for submit actions you'll
            // probably want it to be semi-opaque so the user can still see
            // form elements
      options.opacity = options.opacity || 1;

            // If a container for the throbber is not specified, use height and
            // width to set an explicit size for the throbber.
      if (!options.container) {
        this.height = options.height || '100';
        this.width = options.width || 'auto';

        this.$el
                    .height(this.height)
                    .width(this.width);

                // If you don't pass in a container, remember to append the
                // throbber where you want it.

      } else {
                // If a container is specified, we want the throbber to cover
                // the entire container. To do this, it cannot have position:
                // static. Warning! This could be the cause of unanticipated
                // style consequences.
        if (options.container.css('position') === 'static') {
                    // Set the container to position: relative
          options.container.css('position', 'relative');
        }

        this.$el.css({
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        });

        options.container.append(this.$el);

        if (options.animate) {
          this.$el.css('opacity', 0);
          this.$el.animate({
            opacity: options.opacity
          }, {
            duration: 'slow'
          });
        }
      }
    },

    destroy: function (animate, callback) {
            // By default, use an animation to close the throbber
      animate = animate || true;

      this.selfDestruct = function (callback) {
        this.$el.remove();
        if (callback && typeof callback === 'function') {
          callback();
        }
      };

      if (animate) {
        this.$el.animate({
          opacity: 0
        }, {
          duration: 'slow',
          complete: $.proxy(function () {
            this.selfDestruct();
          }, this)
        });
      } else {
        this.selfDestruct();
      }
    }
  });

  return utils;
});
