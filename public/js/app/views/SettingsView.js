define(["app/app",
        "text!templates/settingsTemplate.handlebars"], function(App, tpl) {
  App.SettingsView = Ember.View.extend({
    templateName: 'settings',
    template: Ember.Handlebars.compile(tpl),

    receiveEmailsContent: [
      Ember.Object.create({name: "In real time", id: '0'}),
      Ember.Object.create({name: "Do not send",  id: '1'})
    ]
  });
});
