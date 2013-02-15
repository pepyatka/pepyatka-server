Pepyatka
========

Pepyatka is another attempt to open source FriendFeed social
network/aggregator. At this stage it's a semi-anonymous imageboard.

![Pepyatka screenshot](http://epicmonkey.org/b/ffb_small.png)

Configuration
-------------

- Install redis
- Install graphicsmagick (ensure jpeg and png flags are set)
- Install nodejs
- Download elasticsearch
- Make sure to update secret token: cp ./conf/envDefault.js to
  ./conf/envLocal.js.
- Install dependencies: npm install
- Check there are no broken tests: ./node_modules/mocha/bin/mocha
  --recursive (or just run mocha --resursive if you have installed it
  globally)
- Run elasticsearch (elasticsearh_download_folder/bin/elasticsearch.bat)
- Run server: node ./server.js
- Run search demon (run_search_demon.cmd)

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

attachment:<attachmentId> { mimeType, filename, extension, path, createdAt, updatedAt, postId, thumbnailId* }
```

API
---

- GET /v1/timeline/:username - returns all posts from user <username>
- GET /v1/timeline - returns river of news for auth user
- POST /v1/timeline/:timelineId/subscribe
- POST /v1/timeline/:timelineId/unsubscribe
- GET /v1/posts/:postId
- GET /v1/posts/:postId/comments # not implemented yet
- GET /v1/posts/:postId/likes # not implemented yet
- POST /v1/posts
- POST /v1/posts/:postId/like
- POST /v1/posts/:postId/unlike
- POST /v1/comments
- GET /v1/users/:userId
