define([
  'jquery',
  'underscore',
  'backbone',
  'console-shim',
  './utils'
], function (
    $,
    _,
    Backbone,
    console,
    Utils
) {
  var models = {};
  models.Base = Backbone.Model.extend({
    initialize: function (options) {
            // Setup event tracking
      Backbone.Model.prototype.initialize.call(this, options);
      _.bindAll(this, 'is_successfully_synced', 'track', 'transform');

      options = options || {};
      options.tracked_events = options.tracked_events || {};
      options.tracked_events.change = true;
      options.tracked_events.fetching = true;
      options.tracked_events.fetched = true;
      options.tracked_events.ready = true;

            // Setup event store
      this._fired_events = {};
      _.each(_.keys(options.tracked_events), function (ev) {
        this.bind(ev, function () {
          this._fired_events[ev] = true;
        }, this);
      }, this);

      this.status = null;
      this.errors = {};
      this.is_synced = false;
      this.bind('fetched', this.transform);
    },

        // Force trigger update of view without fetching new data
    refresh: function (attributes) {
      this.id = attributes.id;
      this.attributes = attributes;
      this.trigger('change');
    },

    parse: function (resp) {
      if (resp.meta !== undefined) {
        this.status = resp.meta.status;
        this.errors = resp.meta.errors;
      }

      if (resp.data !== undefined) {
        return resp.data;
      } else {
        return resp;
      }
    },

    track: function (ev, func, context) {
      context = context || this;
      var bound_func = _.bind(func, context);
      this.bind(ev, bound_func);
      if (this._fired_events[ev]) {
        bound_func();
      }
      return this;
    },

    fetch: function (options) {
      this.trigger('fetching');
      options = options || {};
      options.data = options.data || {};
      options.data._api_token = Utils.API.getToken();

      var success = options.success;
      options.success = function(model, resp) {
        model.trigger('fetched');
        if (success) {
          success(model, resp);
        }
      };

      Backbone.Model.prototype.fetch.call(this, options);
    },

    save: function (options) {
      var is_validation = this.attributes.meta &&
                this.attributes.meta.validate;

      this.attributes._api_token = Utils.API.getToken();

            // We only want the most recent validation save request to be
            // processing at once for this model object, so lets cancel any
            // previous attempts. We want to allow non-validation requests to
            // overlap.
      if (this.validation_xhr && this.validation_xhr.readyState != 4) {
        console.log('Cancelling unfinished validation xhr attempt');
        this.validation_xhr.abort();
      }

            // For backbone save, seconds parameter is considered options if
            // first parameter is null
      var xhr = Backbone.Model.prototype.save.call(this, null, options);

            // We want to allow cancellation of validation save calls.
      if (is_validation) {
        this.validation_xhr = xhr;
      }

      return xhr;
    },

    destroy: function (options) {
      options = options || {};
      options.data = options.data || {};
      options.data._api_token = Utils.API.getToken();

      Backbone.Model.prototype.destroy.call(this, options);
    },

    is_successfully_synced: function () {
      if (!this.status) {
        return false;
      } else if (this.status >= 400) {
        return false;
      } else {
        return true;
      }
    },

    transform: function (options) {
      options = options || {};
      options.disable_trigger = options.disable_trigger || false;

      if (!options.disable_trigger) {
        this.trigger('ready');
      }

      this.is_synced = true;
    }
  });
  return models;
});
