define([
    'require',
    'backbone',
    'jquery',
    'underscore',
    './models',
    './utils',
    'hbs!./templates/Drawer',
    'hbs!./templates/Errors',
    'hbs!./templates/Form',
    'hbs!./templates/Fieldset',
    'hbs!./templates/Form_Fields_Button',
    'hbs!./templates/Form_Fields_CheckboxInput',
    'hbs!./templates/Form_Fields_DateInput',
    'hbs!./templates/Form_Fields_FileInput',
    'hbs!./templates/Form_Fields_HiddenInput',
    'hbs!./templates/Form_Fields_ImageInput',
    'hbs!./templates/Form_Fields_PasswordInput',
    'hbs!./templates/Form_Fields_RadioSelect',
    'hbs!./templates/Form_Fields_Select',
    'hbs!./templates/Form_Fields_TextInput',
    'hbs!./templates/Form_Fields_Textarea',
    'hbs!./templates/Overlay',
    'hbs!./templates/ThirdPartySignin'
], function (
    require,
    Backbone,
    $,
    _,
    models,
    utils,
    Drawer,
    Errors,
    Form,
    Fieldset
) {
    "use strict";
    var forms = {};
    forms.Model = models.Base.extend({
        initialize: function (options) {
            models.Base.prototype.initialize.call(this, options);
            options = options || {};
            this.name = options.name;
            this.title = options.title;
            this.parent = options.parent;
            this.action = options.action || options.parent;
            this.base_url = this.parent.base_url + 'form/';
            this.allow_buttons = options.allow_buttons;
            this.params = options.params || {};

            this.included_fields = options.included_fields || [];
            this.excluded_fields = options.excluded_fields || [];

            if (this.allow_buttons !== false) {
                this.allow_buttons = true;
            }

            this.buttons = options.buttons || [];
        },

        url: function () {
            // NOTE: Make sure that all URLs (before query string ends with backslash)
            if (!this.parent) {
                return '';
            }

            var url = this.base_url;

            if (this.name) {
                url += this.name + '/';
            }

            if (this.params) {
                url += '?params=' + JSON.stringify(this.params);
            }

            return url;
        },

        transform: function () {
            this.attributes.title = this.title || '';
            var fields = this.attributes.fields;

            for (var field_name in fields) {
                var field = fields[field_name];

                field.widget = field.widget || {};

                // Remove fields not included
                if (this.included_fields.length) {
                    if (_.indexOf(this.included_fields, field_name) < 0) {
                        this.attributes.ordered_fields = _.without(this.attributes.ordered_fields, field_name);
                        delete fields[field_name];
                        continue;
                    }
                }

                // Remove fields that are exlcuded
                if (this.excluded_fields.length) {
                    if (_.indexOf(this.included_fields, field_name) >= 0) {
                        this.attributes.ordered_fields = _.without(this.attributes.ordered_fields, field_name);
                        delete fields[field_name];
                        continue;
                    }
                }

                // Load field name
                if (!field.name) {
                    field.name = field_name;
                }

                // Load field labels if not present
                if (!field.label) {
                    var field_name_components = field_name.split('_');
                    var normalized_field_name_components = [];
                    $.each(field_name_components, function (index, field_name_component) {
                        normalized_field_name_components.push(
                            utils.Strings.capitalize(field_name_component)
                        );
                    });

                    field.label = normalized_field_name_components.join(' ');
                }

                // Override fields maximum length with widgets maximum length if present
                if (field.widget && field.widget.attrs && field.widget.attrs.max_length) {
                    field.max_length = field.widget.attrs.max_length;
                }

                // Set field renderer
                if (field.widget) {
                    field.renderer = require('hbs!./templates/Form_Fields_' + field.widget.title);
                } else {
                    field.renderer = null;
                }

                // Determine if field is readonly
                if (field.widget.attrs && field.widget.attrs.readonly) {
                    field.editable = false;
                } else {
                    field.editable = true;
                }
            }

            var index, fieldset, fieldset_name;
            this.fieldsets = {};
            if (this.attributes.fieldsets) {
                for (index = 0; index < this.attributes.fieldsets.length; index += 1) {
                    fieldset = this.attributes.fieldsets[index];
                    if(fieldset && fieldset[0]) {
                        fieldset_name = fieldset[0].toLowerCase().replace(/[^-a-zA-Z0-9,&\s]+/ig, '').replace(/[-\s]/gi, "_");
                    } else {
                        fieldset_name = "fieldset-" + index;
                    }
                    this.fieldsets[fieldset_name] = {
                        'title': fieldset[0],
                        'fields': fieldset[1]
                    };
                }
            }

            if (this.allow_buttons && this.buttons.length === 0) {
                this.attributes.buttons = [];
                this.attributes.buttons.push({
                    'class': 'submit',
                    'name': 'submit',
                    'display_text': 'Submit'
                });
            }

            models.Base.prototype.transform.call(this);
        },

        map_errors: function () {
            if (this.action.errors && this.action.errors.form) {
                this.attributes.errors = this.action.errors.form['__all__'] || [];

                for (var field_name in this.attributes.fields) {
                    this.attributes.fields[field_name].errors = this.action.errors.form[field_name] || [];
                }
            }
        }
    });


    // Form form view
    forms.View = Backbone.View.extend({
        className: 'wiser-form-container',

        events: {
            'click input.submit': 'submit',
            'change input': 'update_field_display',
            'change select': 'update_field_display',
            'change textarea': 'update_field_display',
            'focusin label': 'update_field_display',
            'focusout label': 'update_field_display',
            'keypress input': 'submit_on_enter'
        },

        initialize: function (options) {
            Backbone.View.prototype.initialize.call(this, options);
            _.bindAll(
                this,
                'hide_inputs',
                'load_values',
                'post_save',
                'render',
                'render_errors',
                'restore_values',
                'save',
                'submit',
                'submit_on_enter',
                'throb',
                'update_field_display',
                'validate',
                'validate_all'
            );

            options = options || {};

            this.is_valid = false;

            this.messages = options.messages || [];

            // Use this options to tell form view to load data from model.action
            this.prefill = options.prefill || false;

            // Use this options to make the form hidden on sumission, effectively allowing the user
            // to submit only once
            this.hide_on_submit = options.hide_on_submit || false;

            // Allow external pre submit validation checks.
            this.pre_submit_validation = _.bind(
              options.pre_submit_validation || function() { return true; },
              this
            );

            // Use this options to reload the page on form submission
            this.reload_on_save = options.reload_on_save || false;

            // Use this option to redirect users to a particular URL upon save
            this.redirect_url = options.redirect_url;

            // Use this option to effectively make the form readonly
            this.editable = options.editable;
            if (this.editable !== true && this.editable !== false) {
                this.editable = true;
            }

            // Use this option to enable/disable the display of form labels.
            this.display_labels = options.display_labels;
            if (this.display_labels !== true && this.display_labels !== false) {
                this.display_labels = true;
            }

            // Use this option to enable/disable the display of form help text.
            this.display_help_text = options.display_help_text;
            if (this.display_help_text !== true && this.display_help_text !== false) {
                this.display_help_text = true;
            }

            // Use this option to enable/disable fieldsets.
            this.enable_fieldsets = options.enable_fieldsets;
            if (this.enable_fieldsets !== true && this.enable_fieldsets !== false) {
                this.enable_fieldsets = true;
            }

            this.spotcheck = options.spotcheck || false;
            this.spotcheck_fields = [];

            this.readonly_fields = [];

            // Use this option to disable spotcheck entirely or within code scope
            this.force_disable_spotcheck = false;

            if (!this.model.action.attributes.meta) {
                this.model.action.attributes.meta = {};
            }

            // Place a throbber in #wiser-drawer's .content div
            this.throbber = null;
            this.bind('attached', this.throb);
            this.model.track('ready', this.render);
        },

        throb: function () {
            // TODO: Re-architect throbber so that views are agnostic of it
            var throbber_container = this.$el.closest('.content').first();
            this.throbber = new utils.Throbber({
                container: throbber_container,
                opacity: 0.5
            });
        },

        render: function (options) {
            options = options || {};
            var messages = options.messages || this.messages;
            var field_name, field, fieldset, fieldset_name, map_errors, index;
            this.readonly_fields = [];

            // Destroy the throbber or unbind the action
            if (this.throbber) {
                this.throbber.destroy();
            } else {
                this.unbind('attached', this.throb);
            }

            $(this.el).html(Form({
                form: this.model.attributes,
                messages: messages
            }));

            // Render field
            this.$('.fieldsets').empty();

            if (_.keys(this.model.fieldsets).length > 0 && this.enable_fieldsets) {
                // Remove global form title
                this.$('h4').remove();

                for (fieldset_name in this.model.fieldsets) {
                    fieldset = this.model.fieldsets[fieldset_name];
                    if (fieldset.fields.length) {
                        this.$('.fieldsets').append(Fieldset({
                            class_name: fieldset_name,
                            title: fieldset.title
                        }));

                        for (index = 0; index < fieldset.fields.length; index += 1) {
                            field_name = fieldset.fields[index];
                            field = this.model.attributes.fields[field_name];
                            map_errors = _.indexOf(this.spotcheck_fields, field_name) >= 0;
                            this.$('.fieldsets .' + fieldset_name).append(field.renderer({
                                field: field,
                                map_errors: map_errors,
                                display_labels: this.display_labels,
                                display_help_text: this.display_help_text
                            }));

                            if (!this.editable || !field.editable) {
                                this.readonly_fields.push(field_name);
                            }
                        }
                    }
                }
            } else {
                for (index = 0; index < this.model.attributes.ordered_fields.length; index += 1) {
                    field_name = this.model.attributes.ordered_fields[index];
                    field = this.model.attributes.fields[field_name];
                    map_errors = _.indexOf(this.spotcheck_fields, field_name) >= 0;

                    this.$('.fieldsets').append(field.renderer({
                        field: field,
                        map_errors: map_errors,
                        display_labels: this.display_labels,
                        display_help_text: this.display_help_text
                    }));


                    if (!this.editable || !field.editable) {
                        this.readonly_fields.push(field_name);
                    }
                }
            }

            // Unescape messages, labels, help texts
            this.$('ul.info li, p.label-text, p.help').each(function (index, el) {
                el.innerHTML = $(el).text();
            });

            if (this.prefill) {
                this.restore_values({prefill: true});
            }

            this.delegateEvents();

            // Construct readonly fields selector and make them immutable
            var readonly_fields_selector, readonly_fields_selector_param = '';

            for (index = 0; index < this.readonly_fields.length; index += 1) {
                field_name = this.readonly_fields[index];
                readonly_fields_selector_param += '[for=' + field_name + ']';

                if (index < this.readonly_fields.length - 1) {
                    readonly_fields_selector_param += ', ';
                }
            }

            if (this.readonly_fields.length) {
                readonly_fields_selector = this.$(readonly_fields_selector_param).find('input, select, textarea');
                readonly_fields_selector.off();
                readonly_fields_selector.on('blur click dblclick focus focusin focusout mouseup mousedown mouseenter select', function (event) {
                    event.preventDefault(event);
                    event.stopPropagation(event);
                    return false;
                });
                readonly_fields_selector.fadeTo('fast', 0.5);
            }

            return this;
        },

        update_field_display: function (event) {
            if (this.force_disable_spotcheck || !this.editable) {
                return;
            }

            var field, field_name, field_value, form, node_name;
            var event_element = $(event.currentTarget);
            if (event.type === 'focusin') {
                event_element.addClass('is-active');
            } else if (event.type === 'focusout') {
                event_element.removeClass('is-active');
                if (this.spotcheck) {
                    field_name = event_element.attr('for');
                    this.spotcheck_fields = _.union(this.spotcheck_fields, field_name);

                    this.load_values();
                    this.model.action.attributes.meta.validate = true;
                    form = this;
                    form.model.action.save({success: function (model, resp) {
                        form.validate();
                    }});
                }
            } else if (event.type === 'change') {
                if (this.spotcheck) {
                    field_name = event_element.parents('[for]').attr('for');

                    // We have to make sure we are dealing with the actual
                    // field name, but because radio buttons share this across
                    // all related input elements, we have to double check for
                    // this because the field_name pulled from the label is
                    // being derived from the input element's "id" attribute,
                    // which is unique.  We use a "|" character to separate the
                    // two values in the ID, so we can easily split it here and
                    // not worry about splitting on a character that might be
                    // used in the field name itself (like a "-" or "_" might
                    // be).
                    field_name = field_name.split('|')[0];

                    field = this.model.attributes.fields[field_name];
                    if (_.indexOf(['checkbox', 'date', 'radio', 'select'], field.widget.input_type) >= 0) {
                        this.spotcheck_fields = _.union(this.spotcheck_fields, field_name);

                        this.load_values();
                        this.model.action.attributes.meta.validate = true;
                        form = this;
                        form.model.action.save({success: function (model, resp) {
                            form.validate();
                        }});
                    }
                }
            }
        },

        get_field_value: function (field_name) {
            var field = this.model.attributes.fields[field_name];
            if (field === undefined) {
                return undefined;
            }

            var field_value = '';
            if (field.widget.input_type === 'text' || field.widget.input_type === 'password' || field.widget.input_type === 'hidden') {
                field_value = this.$('input[name=' + field_name + ']').val();
            } else if (field.widget.input_type === 'select' || field.widget.input_type === 'selectmultiple') {
                field_value = this.$('select[name=' + field_name + ']').val();
            } else if (field.widget.input_type === 'date') {
                field_value = this.$('select[name=year]').val();
                field_value += '-' + this.$('select[name=month]').val();
                field_value += '-' + this.$('select[name=day]').val();
            } else if (field.widget.input_type === 'textarea') {
                field_value = this.$('textarea[name=' + field_name + ']').val();
            } else if (field.widget.input_type === 'radio') {
                field_value = this.$('input[name=' + field_name + ']:checked').val();
            } else if (field.widget.input_type === 'checkbox') {
                field_value = this.$('input[name=' + field_name + ']').is(':checked');
            }

            return field_value;
        },

        load_values: function () {
            for (var field_name in this.model.attributes.fields) {
                // Don't allow readonly fields to be loaded
                if (_.indexOf(this.readonly_fields, field_name) >= 0) {
                    continue;
                }

                var field_value = this.get_field_value(field_name);

                if (field_value !== undefined) {
                    this.model.action.attributes[field_name] = field_value;
                }
            }
        },

        set_field_value: function (field_name, field_value) {
            var field = this.model.attributes.fields[field_name];
            if (field === undefined) {
                return undefined;
            }

            if (field.widget.input_type === 'text' || field.widget.input_type === 'password' || field.widget.input_type === 'hidden') {
                this.$('input[name=' + field_name + ']').val(field_value);
            } else if (field.widget.input_type === 'select' || field.widget.input_type === 'selectmultiple') {
                this.$('select[name=' + field_name + ']').val(field_value);
            } else if (field.widget.input_type === 'date') {
                var date_components = field_value.split('-');
                if (date_components.length !== 3) {
                    return undefined;
                }

                var year = date_components[0];
                var month = date_components[1];
                if (month.length === 2 && month[0] === '0') {
                    month = month[1];
                }

                var day = date_components[2];
                if (day.length === 2 && day[0] === '0') {
                    day = day[1];
                }

                this.$('select[name=year]').val(year);
                this.$('select[name=month]').val(month);
                this.$('select[name=day]').val(day);
            } else if (field.widget.input_type === 'textarea') {
                this.$('textarea[name=' + field_name + ']').val(field_value);
            } else if (field.widget.input_type === 'radio') {
                this.$('input[name=' + field_name + '][value=' + field_value + ']').trigger('click');
            } else if (field.widget.input_type === 'checkbox') {
                this.$('input[name=' + field_name + ']').attr('checked', field_value);
            }
        },

        restore_values: function (options) {
            options = options ? _.clone(options): {};

            var prefill = options.prefill || false;

            this.force_disable_spotcheck = true;
            var field_name, saved_value;

            if (prefill && this.model.attributes.data) {
                // If any attribute isn't present, load it from initial data
                for (field_name in this.model.attributes.data) {
                    if (this.model.action.attributes[field_name] === undefined && this.model.attributes.data[field_name] !== null) {
                        this.model.action.attributes[field_name] = this.model.attributes.data[field_name];
                    }
                }
            }

            for (field_name in this.model.action.attributes) {
                saved_value = this.model.action.attributes[field_name];

                if (!saved_value) {
                    continue;
                }
                this.set_field_value(field_name, saved_value);
            }
            this.force_disable_spotcheck = false;
        },

        validate: function () {
            this.is_valid = this.model.action.is_successfully_synced();
            if (!this.valid) {
                this.render_errors();
            }
        },

        validate_all: function () {
            if (this.model.action.errors.form) {
                this.spotcheck_fields = _.keys(this.model.action.errors.form);
            }
            this.validate();
        },

        render_errors: function () {
            // Loop through form errors and insert error message under each field
            // this.model.map_errors();
            var field, field_name, field_container, input_selector;
            var input_tag_types = ['text', 'password', 'radio', 'checkbox'];
            var select_tag_types = ['select', 'date'];

            if (this.model.action.errors && this.model.action.errors.form) {
                var non_field_errors = this.model.action.errors.form.__all__ || [];
                if (non_field_errors.length) {
                    this.$('.non-field-error-container').html(Errors({
                        errors: non_field_errors
                    }));
                } else {
                    this.$('.non-field-error-container').empty();
                }
            } else {
                this.$('.non-field-error-container').empty();
            }

            for (field_name in this.model.attributes.fields) {
                field = this.model.attributes.fields[field_name];
                var spotchecked = _.indexOf(this.spotcheck_fields, field_name) >= 0;

                if (spotchecked) {
                    var field_errors = [];
                    if (this.model.action.errors) {
                        if (this.model.action.errors.form) {
                            if (this.model.action.errors.form[field_name]) {
                                field_errors = this.model.action.errors.form[field_name];
                            }
                        }
                    }

                    field_container = this.$('[for=' + field_name + ']');
                    if(field_errors.length) {
                        field_container.find('div.error-container').html(Errors({errors: field_errors}));
                    } else {
                        field_container.find('div.error-container').empty();
                    }

                    if (_.indexOf(input_tag_types, field.widget.input_type) >= 0) {
                        input_selector = field_container.find('input');
                    } else if (_.indexOf(select_tag_types, field.widget.input_type) >= 0) {
                        input_selector = field_container.find('select');
                    } else if (field.widget.input_type === 'textarea') {
                        input_selector = field_container.find('textarea');
                    }

                    if (field_errors.length) {
                        input_selector.removeClass('valid');
                    } else {
                        input_selector.addClass('valid');
                    }
                }
            }
        },

        submit: function (event) {
            // Clear existing messages
            this.$('ul.info').remove();

            if(!this.pre_submit_validation()) {
              return;
            }

            // Suspend spotchecks when form has been submitted and we are waiting for response
            this.force_disable_spotcheck = true;

            this.throbber = new utils.Throbber({
                container: this.$el.closest('.content'),
                opacity: 0.5
            });

            this.load_values();
            var form = this;
            this.model.action.attributes.meta.validate = false;

            form.model.action.save({success: function (model, resp) {
                // Validate all fields on submission
                form.validate_all();
                form.save();
                if (form.is_valid) {
                    //form.save();
                } else {
                    form.throbber.destroy();
                    form.force_disable_spotcheck = false;
                }
            }});

            if (this.hide_on_submit) {
                this.hide_inputs();
            }
        },

        submit_on_enter: function (event) {
            if (event.keyCode !== 13) {
                return;
            }

            event.preventDefault();
            this.submit(event);
        },

        hide_inputs: function () {
            this.$('.fieldsets').hide();
            this.$('.buttons-container').hide();
        },

        save: function () {
            var submit_buttons = _.filter(this.model.buttons, function (button) {
                return button['class'] === 'submit';
            });

            if (submit_buttons.length) {
                var submit_button = submit_buttons[0];
                if (submit_button.message) {
                    this.messages = [submit_button.message];
                    this.render();
                    this.restore_values();
                }
            }

            this.trigger('saved');
            this.post_save();

            if (this.redirect_url) {
                window.location.replace(this.redirect_url);
                window.location.reload(true);
            } else if (this.reload_on_save) {
                window.location.replace(window.location.href.split('#')[0]);
            } else {
                this.force_disable_spotcheck = false;
                // Refresh the form to remove any fields that shouldn't be editable
                // If form is to be hidden on submit then don't re-render it
                if (!this.hide_on_submit) {
                    this.model.fetch();
                }
            }
        },

        post_save: function () {}
    });

    return forms;
});
