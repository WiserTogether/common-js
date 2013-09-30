define([
    'jquery',
    'underscore',
    'backbone',
    'hbs!./templates/Drawer',
    'hbs!./templates/Errors',
    'hbs!./templates/Form',
    'hbs!./templates/Form_Fields_Button',
    'hbs!./templates/Form_Fields_CheckboxInput',
    'hbs!./templates/Form_Fields_DateInput',
    'hbs!./templates/Form_Fields_FileInput',
    'hbs!./templates/Form_Fields_HiddenInput',
    'hbs!./templates/Form_Fields_ImageInput',
    'hbs!./templates/Form_Fields_PasswordInput',
    'hbs!./templates/Form_Fields_RadioSelect',
    'hbs!./templates/Form_Fields_Select',
    'hbs!./templates/Form_Fields_SelectMultiple',
    'hbs!./templates/Form_Fields_TextInput',
    'hbs!./templates/Form_Fields_Textarea',
    'hbs!./templates/Overlay',
    'hbs!./templates/ThirdPartySignin',
    './utils',
    './janrain',
    'jquery.overlay',
    'jquery.expose'
],  function (
    $,
    _,
    Backbone,
    Drawer,
    Errors,
    Form,
    Form_Fields_Button,
    Form_Fields_CheckboxInput,
    Form_Fields_DateInput,
    Form_Fields_FileInput,
    Form_Fields_HiddenInput,
    Form_Fields_ImageInput,
    Form_Fields_PasswordInput,
    Form_Fields_RadioSelect,
    Form_Fields_Select,
    Form_Fields_SelectMultiple,
    Form_Fields_TextInput,
    Form_Fields_Textarea,
    Overlay,
    ThirdPartySignin,
    wiser_utils
) {
    var views = {};
    views.Overlay = Backbone.View.extend({
        /*
        Create this view elsewhere, pass a content view
        If content view has model then call fetch from where it was created
        If content view can be rendered immediately then call render from where it was created
        */
        tagName: 'div',
        className: 'wiser-overlay-container',

        initialize: function (options) {
            Backbone.View.prototype.initialize.call(this, options);
            _.bindAll(
                this,
                'add_overlay_event',
                'close',
                'get_overlay_events',
                'remove_overlay_event',
                'is_opened',
                'render',
                'update',
                'load_third_party_signin'
            );

            options = options || {};
            this.mode = 'overlay';
            this.title = options.title || '';
            this.message = options.message || '';
            this.overlay_events_bucket = options.overlay_events_bucket || {};
            this.enable_third_party_signin = options.enable_third_party_signin || false;

            this.overlay = null;
            this.content_views = options.content_views || [];

            // Define render mode flag
            this.is_overlay = true;
        },

        render: function (options) {
            options = options || {};

            // Since enforcing overlay doesn't apply to all overlays, it's a render time option rather
            // than stable overlay attribute
            options.enforced = options.enforced || false;
            options.message = options.message || this.message;
            options.disable_throbber = options.disable_throbber || false;
            options.extra_configurations = options.extra_configurations || {};

            var index, content_view;

            if (!this.is_opened()) {
                $(this.el).html(Overlay({title: this.title, message: options.message}));
                $('body').append(this.el);
            } else {
                this.$('.title').text(this.title);
                this.$('.overlay-message p').text(options.message);
            }

            if (this.content_views.length) {
                this.$('.overlay-content').empty();
                for (index = 0; index < this.content_views.length; index += 1) {
                    content_view = this.content_views[index];
                    this.$('.overlay-content').append(content_view.el);
                    if (!options.disable_throbber) {
                        content_view.trigger('attached');
                    }
                }
            }

            // Unescape help text
            this.$('.overlay-message p').each(function (index, el) {
                el.innerHTML = $(el).text();
            });

            var overlay_configuration = $.extend({}, {
                api: true,
                mask: {
                    color: "#fff",
                    opacity: 0.6
                },
                closeOnClick: false,
                closeOnEsc: false,
                fixed: false,
                load: false
            });

            // Load events
            $.extend(overlay_configuration, this.get_overlay_events());

            this.overlay = $('#wiser-overlay').overlay(overlay_configuration);

            if (!this.overlay.isOpened()) {
                this.overlay.load();
            }

            // Explicitly bind event
            this.$('.third-party-signin').bind('click', this.load_third_party_signin);

            if (options.enforced) {
                this.$('.close').hide();
            }

            this.delegateEvents();

            return this;
        },

        close: function () {
            this.$('.close').trigger('click');
        },

        is_opened: function () {
            return $('#wiser-overlay').length > 0;
        },

        get_overlay_events: function () {
            var overlay_events = {};
            _.each(this.overlay_events_bucket, function (callbacks, type) {
                overlay_events[type] = function () {
                    _.each(callbacks, function (callback) {
                        callback();
                    });
                };
            });
            return overlay_events;
        },

        add_overlay_event: function (type, callback) {
            this.overlay_events_bucket[type] = this.overlay_events_bucket[type] || [];

            if (_.indexOf(this.overlay_events_bucket[type], callback) < 0) {
                this.overlay_events_bucket[type].push(callback);
            }
        },

        remove_overlay_event: function (type, callback) {
            if (!callback) {
                this.overlay_events_bucket[type] = [];
            } else {
                if (_.indexOf(this.overlay_events_bucket[type], callback) >= 0) {
                    this.overlay_events_bucket[type] = _.without(this.overlay_events_bucket[type], callback);
                }
            }
        },

        update: function (data, options) {
            for (var key in data) {
                this[key] = data[key];
            }
            this.render(options);
        },

        load_third_party_signin: function (event) {
            event.preventDefault();
            this.close();

            if (this.enable_third_party_signin) {
                try {
                    janrain.engage.signin.modal.init();

                    // Update modals z-index
                    $('#janrainModal').css('z-index', '7999');

                    // Update janrain's mask index
                    $('#janrainModal').prev().css({
                        'z-index': '7998',
                        'height': document.height + 'px'
                    });

                    $('#janrainModal >img').bind('click', function () {
                        document.location.hash = '#login';
                    });
                } catch (e) {
                    // console.log('Failed to open janrain modal');
                }
            }
            document.location.hash = '#';
        }
    });


    views.Drawer = Backbone.View.extend({
        /*
        Create this view elsewhere, pass content views
        If content view has model then call fetch from where it was created
        If content view can be rendered immediately then call render from where it was created
        */
        tagName: 'div',

        className: 'wiser-drawer-container',

        events: {
            'click .third-party-signin': 'load_third_party_signin'
        },

        initialize: function (options) {
            Backbone.View.prototype.initialize.call(this, options);
            _.bindAll(this, 'load_third_party_signin', 'render', 'update');

            options = options || {};
            this.mode = 'drawer';
            this.is_user_authenticated = options.is_user_authenticated || false;
            this.enable_third_party_signin = options.enable_third_party_signin || false;

            this.message = options.message || '';
            this.content_views = options.content_views || [];

            // Define render mode flag
            this.is_drawer = true;
        },

        render: function (options) {
            options = options || {};
            options.enforced = options.enforced || false;
            options.disable_throbber = options.disable_throbber || false;

            var index, content_view;
            var is_new = $('#wiser-drawer').length === 0;

            if (is_new) {
                $(this.el).html(Drawer({
                    message: this.message,
                    is_user_authenticated: this.is_user_authenticated
                }));

                if (this.enable_third_party_signin) {
                    this.$('.drawer-content').after(ThirdPartySignin());
                }

                $('nav').after(this.el);
            } else {
                this.$('.drawer-message p').text(this.message);

                var is_third_party_signin_loaded = this.$('.third-party-signin').length !== 0;

                if (this.enable_third_party_signin && !is_third_party_signin_loaded) {
                    this.$('.drawer-content').after(ThirdPartySignin());
                } else if (!this.enable_third_party_signin && is_third_party_signin_loaded) {
                    this.$('.third-party-signin').remove();
                }
            }

            if (this.content_views.length) {
                this.$('.drawer-content').empty();
                for (index = 0; index < this.content_views.length; index += 1) {
                    content_view = this.content_views[index];
                    this.$('.drawer-content').append(content_view.el);
                    if (!options.disable_throbber) {
                        content_view.trigger('attached');
                    }
                }
            }

            // Make the basic elements appear conditionally
            if ((this.message !== '' && this.message !== undefined && this.message !== null) || this.content_views.length) {
                if (this.message) {
                    this.$('.drawer-message').show();
                } else {
                    this.$('.drawer-message').hide();
                }

                if (this.content_views.length) {
                    this.$('.drawer-content').show();
                } else {
                    this.$('.drawer-content').hide();
                }
                this.$('.content').show();
            } else {
                this.$('.content').hide();
            }

            if (options.enforced) {
                $('.ribbon.original').expose({
                    color: "#fff",
                    opacity: 0.6,
                    closeOnEsc: false,
                    closeOnClick: false,
                    zIndex: 6998
                });
            }

            this.delegateEvents();
            return this;
        },

        load_third_party_signin: function (event) {
            // TODO: Janrain still loads in it's unpredictable async way. This module should be
            // dependent on janrain
            event.preventDefault();
            if (this.enable_third_party_signin) {
                try {
                    janrain.engage.signin.modal.init();

                    // Update modals z-index
                    $('#janrainModal').css('z-index', '7999');

                    // Update janrain's mask index
                    $('#janrainModal').prev().css({
                        'z-index': '7998',
                        'height': document.height + 'px'
                    });
                } catch (e) {
                    // console.log('Failed to open janrain modal');
                }
            }

            document.location.hash = '#';
        },

        update: function (data, options) {
            for (var key in data) {
                this[key] = data[key];
            }
            this.render(options);
        }
    });

    return views;
});
