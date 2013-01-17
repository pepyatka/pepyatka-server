FF/B
====

FF/B is another attempt to open source FriendFeed social
network/aggregator. At this stage it's a semi-anonymous imageboard.

For the improved timelines including likes functionality please look
into "timelines" branch.

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

user:<userId>:timelines { RiverOfNews, Posts, DirectMessages, [name*] }
timeline:<timelineId> { name, userId }
timeline:<timelineId>:posts ( <postId>:<timestamp> )
# note: River of news, Posts, DirectMessages, Likes and Comments timelines have no users
timeline:<timelineId>:users [ <userId> ]

post:<postId> { body, createdAt, updatedAt, userId }
post:<postId>:comments [ <commentId> ]
post:<postId>:attachments [ <attachmentId> ]
post:<postId>:timelines [ <timelineId> ]
post:<postId>:likes [ <userId> ] # not implemented yet

comment:<commentId> { body, createdAt, userId, postId }

attachment:<attachmentId> { mimeType, filename, extension, path, createdAt, updatedAt, thumbnailId* }
```

API
---

- GET /v1/timeline/<username>
- GET /v1/posts/<postId>
- GET /v1/posts/<postId>/comments # not implemented yet
- POST /v1/posts
- POST /v1/comments
