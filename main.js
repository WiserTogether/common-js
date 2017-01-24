/*global define*/
define(function(require) {
  var Backbone = require('backbone'),
    Wiser = window.Wiser || {},
    AnalyticsApp = require('analytics'),
    SurveyApp = require('application');

  require('jquery.cors');

  Wiser.Analytics = Wiser.Analytics || {};
  Wiser.Analytics.DEFAULT_MODULE_NAME = 'survey';
  AnalyticsApp.init();
  SurveyApp.init();
  Backbone.history.start();
});
