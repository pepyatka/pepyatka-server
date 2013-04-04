var models = require('./../app/models')
  , db = require('../db').connect()
  , async = require('async')

var createPublicTimeline = function() {
  db.keys('timeline:*:posts', function(err, timelines) {
    var timelineId = 'everyone'
    var timeline = 'timeline:' + timelineId + ':posts'

    timelines = timelines.filter(function(timeline) {
      return timeline.indexOf('undefined') === -1
    })

    var length = timelines.length

    db.zunionstore([timeline, length]
                   .concat(timelines
                           .concat(["AGGREGATE", "MAX"]))
                   , function(err, res) {
                     console.log("Merged " + res + " posts.")

                     db.zrevrange(timeline, 0, -1, function(err, postsIds) {
                         async.forEach(postsIds, function(postId, callback) {
                           db.sadd('post:' + postId + ':timelines', timelineId, function(err, res) {
                             callback(err)
                           })
                         }, function(err) {
                           console.log('Done.')
                         })
                     })
                   })
  });
}

exports.startSynchronization = function() { createPublicTimeline(); }
