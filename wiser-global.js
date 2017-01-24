define(function () {
  "use strict";
  var Wiser = window.Wiser || {};

  if (!Wiser.base_url) {
    Wiser.base_url = '';
  }
  if (!Wiser.analytics_base_url) {
    Wiser.analytics_base_url = Wiser.base_url;
  }
  if (!Wiser.data_base_url) {
    Wiser.data_base_url = Wiser.base_url;
  }
  if (!Wiser.profile_base_url) {
    Wiser.profile_base_url = Wiser.base_url;
  }
  if (!Wiser.survey_base_url) {
    Wiser.survey_base_url = Wiser.base_url + '/services/survey';
  }
  if (!Wiser.published_survey_url) {
    Wiser.published_survey_url = Wiser.base_url;
  }

  window.Wiser = Wiser;
  return Wiser;
});
