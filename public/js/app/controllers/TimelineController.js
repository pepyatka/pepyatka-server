define(["app/app"], function(App) {
  App.TimelineController = Ember.ObjectController.extend(App.PaginationHelper, {
    resourceUrl: '/v1/posts',

    isLoaded: true,
    isProgressBarHidden: 'hidden',

    subscribeTo: function() {
      var controller = this;

      App.Timeline.subscribeTo(this.get("id"), {
        success: function(response) {
          if (response.status == 'success') {
            controller.transitionToRoute('home');
          }
        }
      });
    },

    unsubscribeTo: function() {
      var controller = this;

      App.Timeline.unsubscribeTo(this.get("id"), {
        success: function(response) {
          if (response.status == 'success') {
            controller.transitionToRoute('home');
          }
        }
      });
    },

    submitPost: function(attrs) {
      var that = this

      var data = new FormData();

      $.each($('input[type="file"]')[0].files, function(i, file) {
        // TODO: can do this just once outside of the loop
        // that.set('isProgressBarHidden', 'visible')
        data.append('file-'+i, file);
      });

      var view = attrs.get('_parentView.sendTo')
      if (view) {
        var timelinesIds = view.$("#sendToSelect").select2("val")
        for(var i = 0; i < timelinesIds.length; i++) {
          data.append('timelinesIds', timelinesIds[i])
        }
      } else if (this.get('content.name') !== 'River of news') {
        data.append('timelinesIds', this.get('content.id'))
      }

      data.append('body', attrs.value)

      callbacks = {
        progress: function() {
          //var percentComplete = Math.round(evt.loaded * 100 / evt.total);
          //that.set('progress', percentComplete)
        },

        load: function() {
          // Clear file field
          //var control = $('input[type="file"]')
          //control.replaceWith( control.val('').clone( true ) );
          //$('.file-input-name').html('')

          // var obj = $.parseJSON(evt.target.responseText);
          // TODO: bind properties
          //that.set('progress', '100')
          //that.set('isProgressBarHidden', 'hidden')
        },

        error: function() {
          //that.set('isProgressBarHidden', 'hidden')
        },

        cancel: function() {
          //that.set('isProgressBarHidden', 'hidden')
        }
      }

      App.Post.submit(data, callbacks)
    },

    didRequestRange: function(options) {
      this.set('content', App.Timeline.find(this.get('content.timelineId'),
                                            { offset: options.offset || 0 }))
    }
  })
});
