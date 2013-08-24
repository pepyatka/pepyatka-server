define(["app/app",
        "text!templates/settingsTemplate.handlebars"], function(App, tpl) {
  App.SettingsView = Ember.View.extend({
    templateName: 'settings',
    template: Ember.Handlebars.compile(tpl),

    screenNameBinding: 'controller.content.info.screenName',
    emailBinding: 'controller.content.info.email',
    receiveEmailsBinding: 'controller.content.info.receiveEmails',

    receiveEmailsContent: [
      Ember.Object.create({name: "In real time", id: '0'}),
      Ember.Object.create({name: "Do not send",  id: '1'})
    ],

    save: function() {
      var params = {
        screenName: this.screenName,
        email: this.email,
        receiveEmails: (this.receiveEmails !== undefined) ? this.receiveEmails : null
      }
      this.get('controller').save(params)
    }
  })
});
