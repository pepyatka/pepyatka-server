FF/B
====

Database
--------

> username:<username>:uid
> user:<user_id> { username: <username> }
> user:<user_id>:timelines [ <timeline_id>, <timeline_id> ] # not implemented yet

> post:<post_id> { body: <body>, created_at: <timestamp>, user_id: <user_id> }
> post:<post_id>:comments [ <comment_id>, <comment_id> ]
> post:<post_id>:attachments [ <attachment_id>, <attachment_id> ]

> comment:<comment_id> { body: <body>, created_at: <timestamp>, user_id: <user_id>, post_id: <post_id> }

> timeline:<timeline_id> ( <post_id>:<timestamp> <post_id>:<timestamp> ) # not implemented yet - TBD

> attachment:<attachment_id> { filename, extension, path }

API
---

GET /v1/timeline/<userId>
GET /v1/posts/<postId>
POST /v1/posts
POST /v1/comments
