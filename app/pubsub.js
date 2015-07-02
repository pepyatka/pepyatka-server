import models from './models'

exports.init = function(database) {
  "use strict";

  class pubSub {
    static async newPost(postId) {
      var post = await models.Post.findById(postId)
      var timelineIds = await post.getSubscribedTimelineIds()

      var promises = timelineIds.map(async function(timelineId) {
        let jsonedPost = JSON.stringify({ postId: postId, timelineId: timelineId })
        await database.publishAsync('post:new', jsonedPost)
      })

      await* promises
    }

    static async destroyPost(postId) {
      var post = await models.Post.findById(postId)
      var timelineIds = await post.getSubscribedTimelineIds()

      var promises = timelineIds.map(async function(timelineId) {
        let jsonedPost = JSON.stringify({ postId: postId, timelineId: timelineId })
        await database.publishAsync('post:destroy', jsonedPost)
      })

      await* promises
    }

    static async updatePost(postId) {
      var post = await models.Post.findById(postId)
      var timelineIds = await post.getSubscribedTimelineIds()

      var promises = timelineIds.map(async function(timelineId) {
        let jsonedPost = JSON.stringify({ postId: postId, timelineId: timelineId })
        await database.publishAsync('post:update', jsonedPost)
      })

      await* promises
    }

    static async newComment(commentId) {
      var comment = await models.Comment.findById(commentId)
      var post = await comment.getPost()
      var timelines = await post.getCommentsFriendOfFriendTimelines(comment.userId)

      var promises = timelines.map(async function(timeline) {
        let isBanned = await post.isBannedFor(timeline.userId)
        let isHidden = await post.isHiddenIn(timeline.id)

        if (!isHidden && !isBanned) {
          let payload = JSON.stringify({ timelineId: timeline.id, commentId: commentId })
          await database.publishAsync('comment:new', payload)
        }
      })

      await* promises

      let payload = JSON.stringify({ postId: post.id, commentId: commentId })
      await database.publishAsync('comment:new', payload)
    }

    static async destroyComment(commentId) {
      var comment = await models.Comment.findById(commentId)
      var post = await comment.getPost()

      let payload = JSON.stringify({ postId: post.id, commentId: commentId })
      await database.publishAsync('comment:destroy', payload)
    }

    static async updateComment(commentId) {
      var comment = await models.Comment.findById(commentId)
      var post = await comment.getPost()

      let payload = JSON.stringify({ postId: post.id, commentId: commentId })
      await database.publishAsync('comment:update', payload)

      var timelineIds = await post.getSubscribedTimelineIds()
      var promises = timelineIds.map(async function(timelineId) {
        let payload = JSON.stringify({ timelineId: timelineId, commentId: commentId })
        await database.publishAsync('comment:update', payload)
      })

      await* promises
    }

    static async newLike(postId, userId) {
      var post = await models.Post.findById(postId)
      var timelines = await post.getLikesFriendOfFriendTimelines(userId)

      var promises = timelines.map(async function(timeline) {
        var isBanned = await post.isBannedFor(timeline.userId)
        var isHidden = await post.isHiddenIn(timeline.id)

        if (!isHidden && !isBanned) {
          let payload = JSON.stringify({ timelineId: timeline.id, userId: userId, postId: postId })
          await database.publishAsync('like:new', payload)
        }
      })

      await* promises

      let payload = JSON.stringify({ userId: userId, postId: postId })
      await database.publishAsync('like:new', payload)
    }

    static async removeLike(postId, userId) {
      var post = await models.Post.findById(postId)
      var timelineIds = await post.getSubscribedTimelineIds()

      var promises = timelineIds.map(async function(timelineId) {
        let payload = JSON.stringify({ timelineId: timelineId, userId: userId, postId: postId })
        await database.publishAsync('like:remove', payload)
      })

      await* promises

      let payload = JSON.stringify({ userId: userId, postId: postId })
      await database.publishAsync('like:remove', payload)
    }

    static async hidePost(userId, postId) {
      var user = await models.User.findById(userId)
      var riverOfNewsId = await user.getRiverOfNewsTimelineId()

      var payload = JSON.stringify({ timelineId: riverOfNewsId, postId: postId })
      await database.publishAsync('post:hide', payload)
    }

    static async unhidePost(userId, postId) {
      var user = await models.User.findById(userId)
      var riverOfNewsId = await user.getRiverOfNewsTimelineId()

      var payload = JSON.stringify({ timelineId: riverOfNewsId, postId: postId })
      await database.publishAsync('post:unhide', payload)
    }
  }

  return pubSub
}
