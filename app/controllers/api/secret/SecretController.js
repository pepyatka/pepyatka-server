'use strict';
 var openpgp = require('openpgp');
 var pg  = require('pg');
 var https = require('https');
 var url = require('url');
 var authSRV = 'https://nanopeppa.freefeed.net/v1/posts/';
 var pgsqlOptions= require('../../../../config/config').load().secret_pg;
 exports.addController = function(app) {
	 var SecretController = function() {
    }
    SecretController.sendPosts = function(req,res){
   	pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
		var urlReq = url.parse(req.url);
   		if(urlReq.query.id) 
   			client.query(
   				'select * from "posts"  where "id" = $1;'
   				,[urlReq.query.id]
   				,function (sqlerr,sqlres){
   					porcessUnauthQuery(res, sqlerr,sqlres,done);
   				}
   			);
   		else{
   			var offset = 0;
   			var limit = 10;
   			if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
   			if(typeof urlReq.query.limit === 'number')
   				limit = urlReq.query.limit<100?urlReq.query.limit:100;
   			client.query(
   				'select * from "posts" order by "createdAt" desc limit $1 offset $2 ;'
   				,[limit, offset] 
   				,function (sqlerr,sqlres){
   					porcessUnauthQuery(res, sqlerr,sqlres,done);
   				}
   			);
   		}
   	});
   	
    }
    SecretController.sendCmts = function(req,res){
   	pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		var offset = 0;
   		var limit = 30;
		var urlReq = url.parse(req.url);
   		if(typeof urlReq.query.offset === 'number')offset = urlReq.query.offset;
   		if(typeof urlReq.query.limit === 'number')
   			limit = urlReq.query.limit<1000?urlReq.query.limit:1000;
   		
   		client.query(
   			'select * from "comments" order by "createdAt" desc limit $1 offset $2 ;'
   			,[limit, offset] 
   			,function (sqlerr,sqlres){
   				porcessUnauthQuery(res, sqlerr,sqlres,done);
   			}
   		);
   		
   	});
   	
    }
    function porcessUnauthQuery (res, sqlerr,sqlres,done){
   	if (sqlerr)  res.writeHead(500);
   	else if(!sqlres.rowCount)
   		res.writeHead(404);
   	else if(typeof sqlres.rows[0] === 'undefined')
   		res.writeHead(500);
   	else{
   		res.writeHead(200, { 'Content-Type': 'text/json' });
   		res.write(JSON.stringify({'posts':sqlres.rows}));
   	}
   	res.end();				
   	done();
    };
    SecretController.sendUserPub = function(req,res){
   	pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		client.query('select  "pub_key" from "keys"  where "Username" = $1;'
   		,[req.params.username]
   		,function (sqlerr,sqlres){
   			if (sqlerr)  res.writeHead(500);
   			else if(!sqlres.rowCount)
   				res.writeHead(404);
   			else if(typeof sqlres.rows[0] === 'undefined')
   				res.writeHead(500);
   			else{
   				res.writeHead(200, { 'Content-Type': 'text/plain' });
   				res.write(sqlres.rows[0].pub_key);
   			}
   			res.end();				
   			done();
   		});
   	});
    
    }
    SecretController.register = function(req,res){
		if (!req.user)
			return res.status(400).jsonp({ err: 'Not found' });
		var key = openpgp.key.readArmored(req.body.d).keys[0];
		var write_token = new Buffer(openpgp.crypto.random.getRandomBytes(16)).toString('base64');
		var values = [req.user.username_,  req.body.d, '', write_token ] ; 
		pg.connect(pgsqlOptions, function(err, client, done){
		if(err) return console.log(err);
			client.query('INSERT INTO "keys" '
			+'("Username","pub_key", "secret_data", "write_token")'
			+'VALUES ($1, $2, $3, $4) ;', values
			,function (sqlerr,sqlres){
				sendEnc(res, key, write_token );
				done();
			});
		});
   	 
    }
    SecretController.sendToken = function(req,res){
   	var username = req.headers['x-authentication-user'];
   	var write_token = new Buffer(openpgp.crypto.random.getRandomBytes(16)).toString('base64');
   	pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		client.query('update "keys" set "write_token"= $1 where "Username" = $2 ;'
   		,[write_token,username]
   		 ,function (sqlerr,sqlres){
   			if (sqlerr)  res.writeHead(500);
   			else if(typeof sqlres === 'undefined'){
   				res.writeHead(400);
   			}else {
   				client.query('select  "pub_key" from "keys"  where "Username" = $1;'
   				,[username]
   				,function (sqlerr,sqlres){
   					done();
   					if (sqlerr)  res.writeHead(500);
   					else if(!sqlres.rowCount)
   						res.writeHead(404);
   					else if(typeof sqlres.rows[0] === 'undefined')
   						res.writeHead(500);
   					else{
   						var key = openpgp.key.readArmored(sqlres.rows[0].pub_key).keys[0];
   						return sendEnc(res, key,write_token);
   					}
   					res.end();
   				});
   				return;
   			}
   			res.end();
   			done();
   		});
   	});
    
    
     }
     function sendEnc (res, key, data ){
    	 res.writeHead(200, { 'Content-Type': 'text/plain' });
   	 openpgp.encryptMessage(key,data).then( function (a){res.write(a); res.end();});
    };
   
    SecretController.update = function(req,res){
   	 var username = req.headers['x-authentication-user'];
   	 var token = req.headers['x-authentication-token'];
   	 pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   	 	var params = [req.body.d, username, token];
   		 client.query('update "keys" set "secret_data" = $1 where "Username" = $2 and "write_token" = $3 returning "secret_data";'
   		 //we can make a 3-way auth by sending salt to the client and comparing hashes
   		 ,params
   		 ,function (sqlerr,sqlres){
   			if (sqlerr)  res.writeHead(500);
   			else if(typeof sqlres === 'undefined') res.writeHead(400);
   			else if (sqlres.rowCount == 0 )res.writeHead(400);
   			else res.writeHead(204);
   			res.end();
   			done();
   		});
   	});
   
    } 
    SecretController.post = function(req,res){
   	 var type = req.headers['x-content-type'];
   	 var token = req.headers['x-content-token']; 
   	 if (type == 'comment')type = 'comments';
   	 else if (type == 'post')type = 'posts';
   	 else {
   		 res.writeHead(400);
   		 res.end();
   	 }
   	 pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		 client.query('insert into '+ type +' ("createdAt", "body", "token" ) values (current_timestamp, $1, $2)'
   		 +'RETURNING "id", "createdAt", "body";'
   		 //we can make a 3-way auth by sending salt to the client and comparing hashes
   		 , [req.body.d, token]
   		 ,function (sqlerr,sqlres){
   			if (sqlerr)  {
   				res.writeHead(500);
   				console.log(sqlerr);
   			}
   			else if(!sqlres.rowCount)
   				res.writeHead(404);
   			else if(typeof sqlres.rows[0] === 'undefined')
   				res.writeHead(500);
   			else{
   				 res.writeHead(200, { 'Content-Type': 'text/json' });
   				 res.write(JSON.stringify({'posts':sqlres.rows[0]}));
   			 }
   			 res.end();
   			 done();
   		 });
   	 });
    } 
    SecretController.deleteP = function(req,res){
   	 var username = req.headers['x-authentication-user'];
   	 var token = req.headers['x-access-token'];
   	 var postid = req.headers['x-content-id'];
   	 var type= req.headers['x-content-type'];
   	 if (type == 'comment')type = 'comments';
   	 else if (type == 'post')type = 'posts';
   	 else {
   		 res.writeHead(400);
   		 res.end('wrong type');
   		 return;
   	 }
   	 if(!token || !postid){
   		 res.writeHead(400);
   		 res.end('parameters missing');
   		 return;
   	 }
   	 pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		 client.query('DELETE from '+type+' where "id" = $1 and "token" = $2;'
   		 //we can make a 3-way auth by sending salt to the client and comparing hashes
   		 , [postid,token]
   		 ,function (sqlerr,sqlres){
   			 if (sqlerr) {
   				res.writeHead(500);
   				console.log(sqlerr);
   			 } else if(typeof sqlres === 'undefined') res.writeHead(400);
   			 else if (!sqlres.rowCount) res.writeHead(400);
   			 else{
   				res.writeHead(204);
   			 }
   			 res.end();
   			 done();
   		 });
   	 });
   
    } 
    SecretController.editP = function(req,res){
   	 var type= req.headers['x-content-type'];
   	 var token = req.headers['x-access-token'];
   	 var newToken = req.headers['x-content-token']; 
   	 var id = req.headers['x-content-id']; 
   	 if (type == 'comment')type = 'comments';
   	 else if (type == 'post')type = 'posts';
   	 else {
   		 res.writeHead(400);
   		 res.end('wrong type');
   		 return;
   	 }
   	 if(!token || !newToken || !id){
   		 res.writeHead(400);
   		 res.end('parameters missing');
   		 return;
   	 }
   	 pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		 client.query('UPDATE '+type+' set "body" = $1, "token" = $2 where "id" = $3 and "token" = $4 '
   		 +'RETURNING "id", "createdAt", "body";'
   		 //we can make a 3-way auth by sending salt to the client and comparing hashes
   		 , [ req.body.d, newToken, id, token ]
   		 ,function (sqlerr,sqlres){
   			if (sqlerr) {
   				res.writeHead(500);
   				console.log(sqlerr);
   			} else if(typeof sqlres === 'undefined') res.writeHead(400);
   			else if (!sqlres.rowCount) res.writeHead(404);
   			else{
   				res.writeHead(200);
   				res.write(JSON.stringify({'posts':sqlres.rows[0]}));
   			}
   			res.end();
   		 	done();
   		 });
   	 });
    } 
    SecretController.sendUserPriv = function(req,res){
   	var username = req.headers['x-authentication-user'];
   	pg.connect(pgsqlOptions, function(err, client, done){
   		if(err) return console.log(err);
   		client.query('SELECT  "secret_data" FROM "keys"  WHERE "Username" = $1;',[username]
   		,function (sqlerr,sqlres){
   			if (sqlerr)  res.writeHead(500);
   			else if(!sqlres.rowCount)
   				res.writeHead(404);
   			else if(typeof sqlres.rows[0] === 'undefined')
   				res.writeHead(500);
   			else{
   				res.writeHead(200, { 'Content-Type': 'text/plain' });
   				res.write(sqlres.rows[0].secret_data);
   			}
   			res.end();				
   			done();
   		});
   	}); 
    }
    return SecretController;
 }
