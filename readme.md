FF/B
====

Database
--------

> username:<username>:uid
> user:<user_id> { username: <username> }

> post:<post_id> { body: <body>, created_at: <timestamp> }
> post:<post_id>:comments [ <comment_id>, <comment_id> ]

> comment:<comment_id> { body: <body>, created_at: <timestamp> }

> timeline:<user_id> ( <post_id>:<timestamp> <post_id>:<timestamp> )
