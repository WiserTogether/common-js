define([
  'jquery',
  'underscore',
  'backbone',
  './utils'
], function (
    $,
    _,
    Backbone,
    Utils
) {
  var collections = {};

  collections.Base = Backbone.Collection.extend({
    initialize: function (options) {
      options = options || {};
      options.tracked_events = options.tracked_events || {};
      options.tracked_events.refresh = true;
      options.tracked_events.fetching = true;
      options.tracked_events.fetched = true;
      Backbone.Collection.prototype.initialize.call(this, options);
      this._fired_events = {};
      this.status = '';
      this.errors = [];
      this.offset = 0;
      this.limit = 0;
      this.total_count = 0;

      _.each(_.keys(options.tracked_events), function (ev) {
        this.bind(ev, function () {
          this._fired_events[ev] = true;
        }, this);
      }, this);
    },

    fetch: function (options) {
      options = options || {};
      this.trigger('fetching');

      var self = this;
      var success = options.success;

      options.success = function (resp) {
        self.trigger('fetched');

        if (success) {
          success(self, resp);
        }
      };

      options.data = options.data || {};
      options.data._api_token = Utils.API.getToken();

      Backbone.Collection.prototype.fetch.call(this, options);
    },

    next: function(options) {
      options = options || {};
      this.trigger('fetching');

      var self = this;
      var success = options.success;

      options.success = function (resp) {
        self.trigger('fetched');

        if (success) {
          success(self, resp);
        }
      };

      options.data = options.data || {};
      options.data._api_token = Utils.API.getToken();

      if (this.limit + this.offset < this.total_count) {
        options.data.limit = this.limit;
        options.data.offset = this.offset + this.limit;
      }

      Backbone.Collection.prototype.fetch.call(this, options);
    },

    previous: function(options) {
      options = options || {};
      this.trigger('fetching');

      var self = this;
      var success = options.success;

      options.success = function (resp) {
        self.trigger('fetched');

        if (success) {
          success(self, resp);
        }
      };

      options.data = options.data || {};
      options.data._api_token = Utils.API.getToken();

      if (this.offset - this.limit >= 0) {
        options.data.limit = this.limit;
        options.data.offset = this.offset - this.limit;
      }

      Backbone.Collection.prototype.fetch.call(this, options);
    },

    parse: function (resp) {
      if (resp.meta !== undefined) {
        this.status = resp.meta.status;
        this.errors = resp.meta.errors;

                // Retrieve any pagination info that exists.
        if (resp.meta.pagination !== undefined) {
          this.offset = resp.meta.pagination.offset;
          this.limit = resp.meta.pagination.limit;
          this.total_count = resp.meta.pagination.total_count;
        }
      }

      return resp.data;
    },

        // Track returns the model immediately if data has already been fetched
    track: function (ev, func, context) {
      context = context || this;

      var bound_func = _.bind(func, context);

      this.bind(ev, bound_func);

      if (this._fired_events[ev]) {
        bound_func();
      }

      return this;
    },

        // NOTE: It's always preferable to have bulk model retrieval and not
        //       use this.
    get_or_add: function (id) {
      var model = this.get(id);

      if (!model) {
        model = new this.model({id: id});
        model.fetch();
        this.add(model);
      }

      return model;
    }
  });
  return collections;
});
