define([
    'require',
    './collections',
    './forms',
    './models',
    './views',
    './utils'
], function (
    require,
    collections,
    forms,
    models,
    views,
    utils
) {
    window.CoreApp = window.CoreApp || {
        init: function () {},
        Models: models,
        Utils: utils,
        Forms: forms,
        Collections: collections,
        Views: views
    };
    return window.CoreApp;
});
