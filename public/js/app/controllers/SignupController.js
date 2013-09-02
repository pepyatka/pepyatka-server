define(["app/app"], function(App) {
  App.SignupController = Ember.ObjectController.extend({
    resourceUrl: '/v1/signup',
    username: '',
    password: '',

    actions: {
      signup: function() {
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
              App.properties.set('userId', response.user.id)
              App.properties.set('screenName', response.user.info.screenName)
              this.transitionToRoute('home')
              break
            case 'fail':
              this.transitionToRoute('signup')
              break
            }
          }
        })
        return this
      }
    }
  })
});
