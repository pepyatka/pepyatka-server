import models from './models'

export default class pubSub {
  constructor(database) {
    this.database = database
  }

  async newPost(postId) {
    var post = await models.Post.findById(postId)
    var timelines = await post.getTimelines()

    var promises = timelines.map(async (timeline) => {
      let isBanned = await post.isBannedFor(timeline.userId)

      if (!isBanned) {
        let payload = JSON.stringify({ postId: postId, timelineId: timeline.id })
        await this.database.publishAsync('post:new', payload)
      }
    })

    await* promises
  }

  async destroyPost(postId) {
    var post = await models.Post.findById(postId)
    var timelineIds = await post.getTimelineIds()

    var promises = timelineIds.map(async (timelineId) => {
      let jsonedPost = JSON.stringify({ postId: postId, timelineId: timelineId })
      await this.database.publishAsync('post:destroy', jsonedPost)
    })

    await* promises
  }

  async updatePost(postId) {
    var post = await models.Post.findById(postId)
    var timelineIds = await post.getTimelineIds()

    var promises = timelineIds.map(async (timelineId) => {
      let jsonedPost = JSON.stringify({ postId: postId, timelineId: timelineId })
      await this.database.publishAsync('post:update', jsonedPost)
    })

    await* promises
  }

  async newComment(commentId) {
    var comment = await models.Comment.findById(commentId)
    var post = await comment.getPost()
    var timelines = await post.getTimelines()

    var promises = timelines.map(async (timeline) => {
      let isBanned = await post.isBannedFor(timeline.userId)
      let isHidden = await post.isHiddenIn(timeline.id)

      if (!isHidden && !isBanned) {
        let payload = JSON.stringify({ timelineId: timeline.id, commentId: commentId })
        await this.database.publishAsync('comment:new', payload)
      }
    })

    await* promises

    let payload = JSON.stringify({ postId: post.id, commentId: commentId })
    await this.database.publishAsync('comment:new', payload)
  }

  async destroyComment(commentId) {
    var comment = await models.Comment.findById(commentId)
    var post = await comment.getPost()

    let payload = JSON.stringify({ postId: post.id, commentId: commentId })
    await this.database.publishAsync('comment:destroy', payload)
  }

  async updateComment(commentId) {
    var comment = await models.Comment.findById(commentId)
    var post = await comment.getPost()

    let payload = JSON.stringify({ postId: post.id, commentId: commentId })
    await this.database.publishAsync('comment:update', payload)

    var timelineIds = await post.getTimelineIds()
    var promises = timelineIds.map(async (timelineId) => {
      let payload = JSON.stringify({ timelineId: timelineId, commentId: commentId })
      await this.database.publishAsync('comment:update', payload)
    })

    await* promises
  }

  async newLike(postId, userId) {
    var post = await models.Post.findById(postId)
    var timelines = await post.getTimelines()

    var promises = timelines.map(async (timeline) => {
      var isBanned = await post.isBannedFor(timeline.userId)
      var isHidden = await post.isHiddenIn(timeline.id)

      if (!isHidden && !isBanned) {
        let payload = JSON.stringify({ timelineId: timeline.id, userId: userId, postId: postId })
        await this.database.publishAsync('like:new', payload)
      }
    })

    await* promises

    let payload = JSON.stringify({ userId: userId, postId: postId })
    await this.database.publishAsync('like:new', payload)
  }

  async removeLike(postId, userId) {
    var post = await models.Post.findById(postId)
    var timelineIds = await post.getTimelineIds()

    var promises = timelineIds.map(async (timelineId) => {
      let payload = JSON.stringify({ timelineId: timelineId, userId: userId, postId: postId })
      await this.database.publishAsync('like:remove', payload)
    })

    await* promises

    let payload = JSON.stringify({ userId: userId, postId: postId })
    await this.database.publishAsync('like:remove', payload)
  }

  async hidePost(userId, postId) {
    var user = await models.User.findById(userId)
    var riverOfNewsId = await user.getRiverOfNewsTimelineId()

    var payload = JSON.stringify({ timelineId: riverOfNewsId, postId: postId })
    await this.database.publishAsync('post:hide', payload)
  }

  async unhidePost(userId, postId) {
    var user = await models.User.findById(userId)
    var riverOfNewsId = await user.getRiverOfNewsTimelineId()

    var payload = JSON.stringify({ timelineId: riverOfNewsId, postId: postId })
    await this.database.publishAsync('post:unhide', payload)
  }
}
