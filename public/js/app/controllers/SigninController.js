define(["app/app"], function(App) {
  App.SigninController = Ember.ObjectController.extend({
    resourceUrl: '/v1/session',
    username: '',
    password: '',

    actions: {
      signin: function() {
        $.ajax({
          url: this.resourceUrl,
          data: { username: this.get('username'),
                  password: this.get('password'),
                  '_csrf': csrf_token },
          dataType: 'jsonp',
          type: 'post',
          context: this,
          success: function(response) {
            switch (response.status) {
            case 'success':
              App.properties.set('isAuthorized', true)
              App.properties.set('username', response.user.username)
              App.properties.set('screenName', response.user.info.screenName)
              App.properties.set('userId', response.user.id)
              this.transitionToRoute('home')
              break
            case 'fail':
              this.transitionToRoute('signin')
              break
            }
          }
        })
        return this
      }
    }
  })
});
