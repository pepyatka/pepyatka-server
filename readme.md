FF/B
====

Database
--------

> username:<username>:uid
> user:<user_id> { username: <username> }

> post:<post_id> { body: <body>, created_at: <timestamp>, user_id: <user_id> }
> post:<post_id>:comments [ <comment_id>, <comment_id> ]

> comment:<comment_id> { body: <body>, created_at: <timestamp>, user_id: <user_id>, post_id: <post_id> }

> timeline:<user_id> [ <timeline_id>, <timeline_id> ]
> timeline:<user_id>:river ( <post_id>:<timestamp> <post_id>:<timestamp> )
> timeline:<user_id>:<timeline_id> ( <post_id>:<timestamp> <post_id>:<timestamp> )

API
---

/v1/timeline/<userId>
/v1/posts/<postId>
