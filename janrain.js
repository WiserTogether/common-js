var Wiser = window.Wiser || {};

define(function (require) {
    if (typeof window.janrain !== 'object') {
        window.janrain = {};
    }

    if (typeof window.janrain.settings !== 'object') {
        window.janrain.settings = {};
    }

    if (Wiser.config) {
        janrain.settings.tokenUrl = document.location.protocol + "//" + document.domain + Wiser.config.profile.url + 'janrain/login/?next=' + encodeURIComponent(document.URL);
    } else {
        janrain.settings.tokenUrl = '';
    }

    janrain.ready = false;

    return {
        init: function () {
            require (['janrain'], function () {}, function (err) {
                // console.log('Janrain module failed to load');
            });
        }
    };
});
