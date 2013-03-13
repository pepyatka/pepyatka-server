Pepyatka
========

Pepyatka is another attempt to open source FriendFeed social
network/aggregator. At this stage it's a semi-anonymous imageboard.

![Pepyatka screenshot](http://epicmonkey.org/b/2013-03-10_Pepyatka.png)

Configuration
-------------

- Install redis
- Install graphicsmagick (ensure jpeg and png flags are set)
- Install nodejs
- Install elasticsearch (and java as a dependency ;-)
- Install forever: npm install -g forever
- Make sure to update secret token: cp ./conf/envDefault.js to
  ./conf/envLocal.js.
- Install dependencies: npm install
- Update translation file: cp ./public/config/envDefault.js
  ./public/config/envLocal.js
- Check there are no broken tests: ./node_modules/mocha/bin/mocha (or
  just run mocha if you have installed it globally)
- Run elasticsearch
- Run server: node ./server.js
- Run search daemon: ./bin/start-search-daemon

Roadmap
-------

Tasks: https://trello.com/b/uvRkkOTH

Database
--------

```
username:<username>:uid
user:<userId> { username, hashedPassword, salt, createdAt, updatedAt }
user:<userId>:timelines { RiverOfNews, Posts, Likes, Comments, DirectMessages, [name*] }
* DirectMessages not implemented yet
* Custom lists not implemented yet
user:<userId>:subscriptions ( <timelineId>:<timestamp> )

timeline:<timelineId> { name, userId }
timeline:<timelineId>:posts ( <postId>:<timestamp> )
timeline:<timelineId>:subscribers ( <userId>:<timestamp> )

post:<postId> { body, createdAt, updatedAt, userId, timelineId }
post:<postId>:comments [ <commentId> ]
post:<postId>:attachments [ <attachmentId> ]
post:<postId>:timelines ( <timelineId> )
post:<postId>:likes ( <userId> )

comment:<commentId> { body, createdAt, updatedAt, createdBy, postId }

attachment:<attachmentId> { mimeType, filename, extension, path, createdAt, updatedAt, postId, thumbnailId? }

# not implemented yet
stats:<userId> { comments, likes, discussions, subscribers, subscriptions }
stats:comments { <userId>:<comments> }
stats:likes { <userId>:<likes> }
stats:discussions { <userId>:<discussions> }
stats:subscribers { <userId>:<subscribers> }
stats:subscripions { <userId>:<subscriptions> }
```

API
---

- GET /v1/timeline/:username - returns all posts from user <username>
- GET /v1/timeline - returns river of news for auth user
- POST /v1/timeline/:timelineId/subscribe
- POST /v1/timeline/:timelineId/unsubscribe
- GET /v1/timeline/:timelineId/subcribers
- GET /v1/posts/:postId
- DELETE /v1/posts/:postId
- PATCH /v1/posts/:postId
- GET /v1/posts/:postId/comments # not implemented yet
- GET /v1/posts/:postId/likes # not implemented yet
- POST /v1/posts
- POST /v1/posts/:postId/like
- POST /v1/posts/:postId/unlike
- POST /v1/comments
- DELETE /v1/comments/:commentId
- PATCH /v1/comments/:commentId
- GET /v1/users/:userId
- GET /v1/users/:username/subscriptions
- GET /v1/users/:username/subscribers - returns Posts timeline subscribers

SEARCH API
---

- GET /search/:searchQuery - returns all posts witch equal searchQuery.

Search query is string.
Search query can contains keywords.
Keywords:
    intitle:query (search query in post's body)
    incomment:query (search query in comment's body)
    from:username (search by username)
    AND
    OR
    ' ' - It's whitespace

If you write word without keyword, it means that elasticSearch will
search in post's and comment's bodies.

Example: this AND intitle:that OR incomment:blabla from:user

ElasticSearch will return you posts which contain 'that' in post's
body and 'this' in post's or comment's body.

And, it will return posts which contain 'blabla' in comment's body and
written by 'user'.
