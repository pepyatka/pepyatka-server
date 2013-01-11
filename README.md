FF/B
====

FF/B is another attempt to open source FriendFeed social
network/aggregator. At this stage it's just a stupid anonymous (sort
of) image board.

Configuration
-------------

- Install redis
- Install graphicsmagick (ensure jpeg and png flags are set)
- Install nodejs
- Make sure to update secret token: cp ./conf/envDefault.js to
  ./conf/envLocal.js.
- Check there are no broken tests: ./node_modules/mocha/bin/mocha (or
  just mocha if you have it install globally)
- Run server: node ./server.js

Database
--------

```
username:<username>:uid
user:<user_id> { username: <username> }
user:<user_id>:timelines [ <timeline_id>, <timeline_id> ] # not implemented yet

post:<post_id> { body: <body>, created_at: <timestamp>, user_id: <user_id> }
post:<post_id>:comments [ <comment_id>, <comment_id> ]
post:<post_id>:attachments [ <attachment_id>, <attachment_id> ]

comment:<comment_id> { body: <body>, created_at: <timestamp>, user_id: <user_id>, post_id: <post_id> }

timeline:<timeline_id> ( <post_id>:<timestamp> <post_id>:<timestamp> ) # not implemented yet - TBD

attachment:<attachment_id> { mimeType, filename, extension, path, [thumbnail_id] }
```

API
---

- GET /v1/timeline/<username>
- GET /v1/posts/<postId>
- POST /v1/posts
- POST /v1/comments
