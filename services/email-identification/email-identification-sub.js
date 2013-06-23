var models = require('./../../app/models')
  , redis = require('redis')
  , async = require('async')
  , configLocal = require('./../../conf/envLocal.js')
  , fs = require("fs")
  , ejs = require("ejs")
  , mailer = require('./email-identification-mailer.js');

exports.listen = function() {
  var conf = configLocal.getAppConfig();

  fs.readFile('app/scripts/views/mailer/index.ejs', 'utf8', function (err, template) {
    if (err)
      return console.log(err);

    var htmlTemplate = template
    var sub = redis.createClient();

    sub.subscribe('newPost', 'newComment', 'newLike')

    sub.on('message', function(channel, msg) {
      switch(channel) {
      case 'newPost':
        var data = JSON.parse(msg);
        models.Post.findById(data.postId, function(err, post) {
          if (!post)
            return

          models.Timeline.findById(data.timelineId, {}, function(err, timeline) {
            if (!timeline || timeline.name !== 'River of news')
              return

            models.User.findById(timeline.userId, function(err, user) {
              if (!user || user.type === 'group' ||
                  !user.info || user.info.receiveEmails !== 'In real time' ||
                  !user.info.email || user.id === post.userId) return

              html = ejs.render(htmlTemplate, {
                screenName: user.info.screenName,
                username: user.info.screenName,
                post: post.body,
                likes: [],
                comments: []
              })

              var messageToSend = {
                to: user.info.screenName + ' <' + user.info.email + '>',
                subject: post.body,
                html: html
              };
              mailer.sendMailToUser(conf, messageToSend)
            })
          })
        })
        break

      case 'newComment':
        var data = JSON.parse(msg);
        if (data.inRiverOfNews !== 0 || !data.timelineId) return

        models.Post.findById(data.postId, function(err, post) {
          if (!post) return

          models.Timeline.findById(data.timelineId, {}, function(err, timeline) {
            if (!timeline || !timeline.userId ||
                timeline.name !== 'River of news') return

            models.User.findById(timeline.userId, function(err, user) {
              if (!user || user.id === post.userId ||
                  user.type === 'group' ||
                  user.info === null || user.info.receiveEmails !== 'In real time' ||
                  !user.info.email) return

              html = ejs.render(htmlTemplate, {
                username: user.info.screenName,
                post: post.body,
                likes: post.likes,
                comments: post.comments
              })

              var messageToSend = {
                to: user.info.screenName + ' <' + user.info.email + '>',
                subject: post.body,
                html: html
              };
              mailer.sendMailToUser(conf, messageToSend)
            })
          })
        })

        break

      case 'newLike':
        var data = JSON.parse(msg);
        if (data.inRiverOfNews !== 0 || !data.timelineId)
          return

        models.Post.findById(data.postId, function(err, post) {
          if (!post) return

          models.Timeline.findById(data.timelineId, {}, function(err, timeline) {
            if (!timeline || !timeline.userId || timeline.name !== 'River of news')
              return

            models.User.findById(timeline.userId, function(err, user) {
              if (!user || user.id === post.userId || user.type === 'group' ||
                  !user.info || user.info.receiveEmails !== 'In real time') return

              html = ejs.render(htmlTemplate, {
                username: user.info.screenName,
                post: post.body,
                likes: post.likes,
                comments: post.comments
              })

              var messageToSend = {
                to: user.info.screenName + ' <' + user.info.email + '>',
                subject: 'Post has liked by user',
                html: htmlTemplate
              };
              mailer.sendMailToUser(conf, messageToSend)
            })
          })
        })
        break
      }
    })
  });
}
