// Make sure Wiser and _gaq are in global scope so optimizely can do its
// thing when it loads.
var Wiser = window.Wiser || {};
var _gaq = window._gaq || [];

define(function (require) {
    "use strict";
    var $ = require('jquery'),
        _ = require('underscore'),
        console = require('console-shim'),
        CryptoJS = require('crypto.aes'),
        Wiser = require('./wiser-global');
    require('jquery.cookie');
    require('./common');

    Wiser.Analytics = Wiser.Analytics || {};

    // Define constants
    Wiser.Analytics.ANONYMOUS_USER = 'anonymous';
    Wiser.Analytics.ANONYMOUS_COMPANY = 'Public';
    Wiser.Analytics.EMPTY_HEALTH_PLAN = '';
    Wiser.Analytics.DEFAULT_MODULE_NAME = 'health';
    Wiser.Analytics.DEFAULT_ISSUE_NAME = 'landing';
    Wiser.Analytics.DEFAULT_PAGE_TYPE = 'Landing';
    Wiser.Analytics.GA_UA_CODE = '';
    Wiser.Analytics.EVENTS = {
        'CLICK': 'CLICK',
        'REGISTRATION': 'registration',
        'LOGIN': 'login'
    };

    Wiser.Analytics.base_data = Wiser.Analytics.base_data || {};
    Wiser.Analytics.urls = {
        'config': Wiser.analytics_base_url + '/services/analytics/api/v1/configuration/'
    };

    Wiser.Analytics.load_configuration = function () {
        $.ajax({
            url: Wiser.Analytics.urls.config,
            type: 'GET',
            contentType: 'application/json',
            dataType: 'json',
            success: Wiser.Analytics.post_init,
            error: function () {
                console.log('Could not retrieve WT analytics client configuration');
            }
        });
    };

    Wiser.Analytics.load_base_data = function (data) {
        $.extend(true, Wiser.Analytics.base_data, data);
    };

    Wiser.Analytics.setup_google_event_capturing = function () {
        var ga_is_configured = _.find(_gaq, function (gaq_entry) {
            return gaq_entry.length > 0 && gaq_entry[0] === '_setAccount';
        });

        if (!ga_is_configured) {
            // Set up GA
            _gaq.push(['_setAccount', Wiser.Analytics.GA_UA_CODE]);
            _gaq.push(['_setDomainName', Wiser.Analytics.base_data.domain]);
            _gaq.push(['_setCustomVar', 1, 'company', Wiser.Analytics.base_data.company, 2]);
            if (Wiser.Analytics.base_data.username && Wiser.Analytics.base_data.username !== 'anonymous') {
                _gaq.push(['_setCustomVar', 5, 'username', Wiser.Analytics.base_data.username, 2]);
            }
        }

        // GA queue needs to be global
        window._gaq = _gaq;

        // Load GA since initial GA queue has been defined in page visit record
        // Do not move to main since loading GA requires initial
        require(['google-analytics'], function () {}, function () {
            console.log('Google analytics module failed to load.');
        });
    };

    Wiser.Analytics.setup_internal_event_capturing = function () {
        // Fire events for every click
        $('a').click(function (ev) {
            var anchor_url = $(this).attr('href');
            var anchor_target = $(this).attr('target') || null;

            if (!ev.isDefaultPrevented() && anchor_url && anchor_url.charAt(0) === '/') {
                ev.preventDefault();
            } else {
                anchor_url = null;
            }

            var element = this.outerHTML;
            if (element) {
                element = element.replace(/\n?/g, '');
                element = element.replace(/\s{2,}?/g, '');
            } else {
                element = '';
            }

            Wiser.Analytics.record_page_event(
                Wiser.Analytics.EVENTS.CLICK,
                this.outerHTML,
                anchor_url,
                anchor_target
            );
        });
    };

    Wiser.Analytics.submit_internal_data = function (url, data, redirect_url, redirect_target) {
        $.ajax({
            url: url,
            type: 'POST',
            contentType: 'application/json',
            dataType: 'json',
            data: JSON.stringify(data),
            success: function () {
                if (redirect_url) {
                    if (redirect_target === '_blank') {
                        window.open(redirect_url, 'wiser_new_window');
                    } else if (redirect_target === '_top' || redirect_target === '_parent' || redirect_target === '_self') {
                        // Check for these special target attribute values
                        // explicitly and mimic their behavior, with a slight
                        // exception of the _self value in the case of frame
                        // sets, which we do not use on our site.
                        window.location.href = redirect_url;
                    } else if (redirect_target !== null) {
                        window.open(redirect_url, redirect_target);
                    } else {
                        window.location.href = redirect_url;
                    }
                }
            },
            error: function () {
                console.log('Error submitting internal analytics event');
            },
            statusCode: {
                201: function () {}
            }
        });
    };

    Wiser.Analytics.record_page_visit = function () {
        var _gaq = window._gaq || [];
        _gaq.push(['_trackPageview']);
        Wiser.Analytics.submit_internal_data(
            Wiser.Analytics.urls.page_visit,
            Wiser.Analytics.base_data
        );
    };

    Wiser.Analytics.record_inter_page_visit = function() {
        var _gaq = window._gaq || [];
        var base_data = _(_(Wiser.Analytics.base_data).clone()).extend({
            query_string: window.location.search,
            request_uri: window.location.pathname +
                window.location.search +
                window.location.hash
        });
        _gaq.push(['_trackPageview', base_data.request_uri]);

        Wiser.Analytics.submit_internal_data(
            Wiser.Analytics.urls.page_visit,
            base_data
        );
    };

    Wiser.Analytics.record_page_event = function (category, action, redirect_url, redirect_target) {
        var is_ga_eligible, internal_data;

        if (!action) {
            // console.log('Invalid analytics event');
            return;
        }

        is_ga_eligible = true;
        if (category === Wiser.Analytics.EVENTS.CLICK) {
            // Don't send click events to Google
            is_ga_eligible = false;
        }

        // Send event data to GA
        if (is_ga_eligible) {
            var _gaq = window._gaq || [];
            _gaq.push(['_trackEvent', category, action]);
        }

        // Events data is different than the regular data, so we must construct
        // a separate object and send that instead.
        internal_data = {
            'company': Wiser.Analytics.base_data.company,
            'username': Wiser.Analytics.base_data.username,
            'requested_path': Wiser.Analytics.base_data.request_uri,
            'element': action,
            'event': category
        };

        Wiser.Analytics.submit_internal_data(
            Wiser.Analytics.urls.page_event,
            internal_data,
            redirect_url,
            redirect_target
        );
    };

    Wiser.Analytics.get_user_data = function () {
        var cookie_value,
            decoded_value,
            json_value,
            string_value,
            user_data = {};

        if (typeof($.cookie('dsatok')) === 'string') {
            // The dsatok cookie is comprised of two encoded strings with a
            // period separating them, we want the first part.
            cookie_value = $.cookie('dsatok').replace('"', '').split(':')[0];

            // Next, we need to Base64 decode the string.
            decoded_value = CryptoJS.enc.Base64.parse(cookie_value);

            // Finally, we need to turn the decoded value into a UTF-8 string
            // so that we can turn it into JSON.
            string_value = CryptoJS.enc.Utf8.stringify(decoded_value);
            json_value = JSON.parse(string_value);

            // Create the user_data object and parse the extra_params so that
            // we can extract the values that we want for analytics tracking.
            user_data = $.extend(
                {username: json_value.u},
                Wiser.utils.parseQueryString(
                    json_value.extra_params,
                    ['company_name', 'health_plan']
                )
            );
        } else {
            user_data = {
                'company_name': Wiser.Analytics.ANONYMOUS_COMPANY,
                'username': Wiser.Analytics.ANONYMOUS_USER,
                'health_plan': Wiser.Analytics.EMPTY_HEALTH_PLAN
            };
        }

        return user_data;
    };

    Wiser.Analytics.parse_url_path_data = function () {
        // Only match against safe[1] valid characters[2].
        // [1] http://stackoverflow.com/questions/4669692/valid-characters-for-directory-part-of-a-url-for-short-links
        // [2] https://developer.mozilla.org/en-US/docs/JavaScript/Guide/Regular_Expressions
        var path_regex, path_fragments, module_name, issue_name, page_type, path_data;

        path_regex = /^[\w\-]+$/;
        path_fragments = window.location.pathname.split('/');
        module_name = '';
        issue_name = '';
        page_type = '';

        // We only care about the path data if we are on our own site.
        if (window.location.hostname.search(Wiser.BASE_DOMAIN) !== -1) {
            module_name = path_fragments[1] || Wiser.Analytics.DEFAULT_MODULE_NAME;
            issue_name = path_fragments[2] || Wiser.Analytics.DEFAULT_ISSUE_NAME;
            page_type = path_fragments[3] || Wiser.Analytics.DEFAULT_PAGE_TYPE;

            // Verify that the path data we have collected will not cause any
            // problems by verifying the characters found within the strings.
            module_name = path_regex.test(module_name) ? module_name : '';
            issue_name = path_regex.test(issue_name) ? issue_name : '';
            page_type = path_regex.test(page_type) ? page_type : '';

            // The issue name is actually a combination of the module and issue
            // with a "-" between them, but only create that if both values are
            // valid and not empty strings.
            issue_name = (module_name && issue_name) ? module_name + '-' + issue_name : '';
        }

        path_data = {
            module: module_name,
            issue: issue_name,
            page_type: page_type
        };

        return path_data;
    };

    Wiser.Analytics.post_init = function (configuration) {
        var user_data, path_data;

        user_data = Wiser.Analytics.get_user_data();
        path_data = Wiser.Analytics.parse_url_path_data();

        Wiser.Analytics.load_base_data({
            company: user_data.company_name,
            domain: window.location.hostname,
            query_string: window.location.search,
            referer: document.referer,
            request_uri: window.location.pathname,
            requested_host: window.location.hostname,
            user_agent: navigator.userAgent,
            username: user_data.username
        });

        Wiser.Analytics.load_base_data(path_data);

        Wiser.Analytics.GA_UA_CODE = configuration.ga_ua_code;
        Wiser.Analytics.load_base_data({
            'remote_addr': configuration.remote_addr
        });

        $.each(configuration.urls, function(k, v) {
            Wiser.Analytics.urls[k] = Wiser.analytics_base_url + v;
        });

        // Setup GA capturing
        Wiser.Analytics.setup_google_event_capturing();

        // All configuration in place, record page visit.
        Wiser.Analytics.record_page_visit();

        // Setup internal event capturing
        Wiser.Analytics.setup_internal_event_capturing();
    };

    return {
        init: function () {
            // If Optimizely is available then load it before starting analytics
            // If optimizely breaks then proceed with loading analytics
            if (Wiser.OPTIMIZELY_PROJECT_URL) {
                require([Wiser.OPTIMIZELY_PROJECT_URL], function () {
                    Wiser.Analytics.load_configuration();
                }, function () {
                    console.log('Optimizely failed to load');
                    Wiser.Analytics.load_configuration();
                });
            } else {
                console.log('Optimizely URL is not set');
                Wiser.Analytics.load_configuration();
            }
        }
    };
});
