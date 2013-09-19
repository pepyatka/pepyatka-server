define(["app/app",
        "text!templates/leaderboardTemplate.handlebars"], function(App, tpl) {
  App.LeaderboardView = Ember.View.extend({
    templateName: 'leaderboard',
    template: Ember.Handlebars.compile(tpl)
  });
});
