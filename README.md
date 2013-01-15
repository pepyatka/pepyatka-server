FF/B
====

FF/B is another attempt to open source FriendFeed social
network/aggregator. At this stage it's just a stupid anonymous (sort
of) image board.

![FF/B screenshot](http://epicmonkey.org/b/ffb_small.png)

Configuration
-------------

- Install redis
- Install graphicsmagick (ensure jpeg and png flags are set)
- Install nodejs
- Make sure to update secret token: cp ./conf/envDefault.js to
  ./conf/envLocal.js.
- Check there are no broken tests: ./node_modules/mocha/bin/mocha
  --recursive (or just run mocha --resursive if you have installed it
  globally)
- Run server: node ./server.js

Database
--------

```
username:<username>:uid
user:<userId> { username, hashedPassword, salt, createdAt, updatedAt }
user:<userId>:timelines [ <timelineId> ] # not implemented yet

post:<postId> { body, createdAt, updatedAt, userId }
post:<postId>:comments [ <commentId> ]
post:<postId>:attachments [ <attachmentId> ]
post:<postId>:timelines [ <timelineId> ] # not implemented yet

comment:<commentId> { body, createdAt, userId, postId }

timeline:<userId> ( <postId>:<timestamp> )

attachment:<attachmentId> { mimeType, filename, extension, path, [thumbnailId] }
```

API
---

- GET /v1/timeline/<username>
- GET /v1/posts/<postId>
- POST /v1/posts
- POST /v1/comments
