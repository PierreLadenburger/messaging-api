[1mdiff --git a/chatbot-msg.js b/chatbot-msg.js[m
[1mindex 7999a81..588e4e5 100644[m
[1m--- a/chatbot-msg.js[m
[1m+++ b/chatbot-msg.js[m
[36m@@ -22,11 +22,12 @@[m [mapp.get('/conversation/:uid', function (req, res) {[m
         var query = {[m
             'conversation.uid' : req.params.uid[m
         };[m
[31m-        db.collection('chatbot').findOne(query, function(err, result) {[m
[31m-            if (result) {[m
[31m-                res.send(JSON.stringify({"members" : result.members, "conversation" : result.conversation}));[m
[32m+[m[32m        db.collection('chatbot').findOneAndUpdate(query, {$set: { "conversation.messages.$[].read" : true}} ,{returnOriginal:false}, function(err, result) {[m
[32m+[m[32m            if (result.value != null) {[m
[32m+[m[32m                res.send(JSON.stringify({"members" : result.value.members, "conversation" : result.value.conversation}));[m
 [m
             } else {[m
[32m+[m[32m                console.log("là");[m
                 res.send(JSON.stringify({"state": "error"}));[m
             }[m
             client.close();[m
[36m@@ -35,6 +36,7 @@[m [mapp.get('/conversation/:uid', function (req, res) {[m
 });[m
 [m
 app.delete('/conversation/', function (req, res) {[m
[32m+[m[32m    console.log(req);[m
     MongoClient.connect(url, function (err, client) {[m
         const db = client.db(dbName);[m
         var query = {[m
[36m@@ -98,28 +100,80 @@[m [mapp.post('/conversation', function (req, res) {[m
 });[m
 [m
 app.post('/message', function (req, res) {[m
[32m+[m[32m    if (ObjectId.isValid(req.body.message.member) !== true) {[m
[32m+[m[32m        res.send(JSON.stringify({"state": "error"}));[m
[32m+[m[32m    } else {[m
[32m+[m[32m        MongoClient.connect(url, function(err, client) {[m
[32m+[m[32m            const db = client.db(dbName);[m
[32m+[m[32m            var query = {[m
[32m+[m[32m                'conversation.uid' : req.body.uid[m
[32m+[m[32m            };[m
[32m+[m[32m            res.setHeader('Content-Type', 'application/json; charset=UTF-8');[m
[32m+[m[32m            var message = {[m
[32m+[m[32m                "type" : req.body.message.type,[m
[32m+[m[32m                "member" : ObjectId(req.body.message.member),[m
[32m+[m[32m                "text" : req.body.message.text,[m
[32m+[m[32m                "date" : req.body.message.date,[m
[32m+[m[32m                "read" : req.body.message.read[m
[32m+[m[32m            };[m
[32m+[m[32m            db.collection('chatbot').findOneAndUpdate(query, {$push: {"conversation.messages" : message}}, function(err, result) {[m
[32m+[m[32m                if (result.value != null) {[m
[32m+[m[32m                    res.send(JSON.stringify({"state": "success"}));[m
[32m+[m
[32m+[m[32m                } else {[m
[32m+[m[32m                    res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));[m
[32m+[m[32m                }[m
[32m+[m[32m                client.close();[m
[32m+[m[32m            });[m
[32m+[m[32m        })[m
[32m+[m[32m    }[m
[32m+[m[32m});[m
[32m+[m
[32m+[m[32mapp.post('/retrieveMessages', function (req, res) {[m
     MongoClient.connect(url, function(err, client) {[m
         const db = client.db(dbName);[m
[32m+[m[32m        res.setHeader('Content-Type', 'application/json; charset=UTF-8');[m
         var query = {[m
[31m-            'conversation.uid' : req.body.uid[m
[32m+[m[32m            'conversation.uid' : req.body.uid,[m
         };[m
[32m+[m[32m        db.collection('chatbot').findOne(query, function(err, result) {[m
[32m+[m[32m            if (result) {[m
[32m+[m[32m                var messages = [];[m
[32m+[m
[32m+[m
[32m+[m[32m                for (var i = 0; i < result.conversation.messages.length; i++) {[m
[32m+[m[32m                    if (result.conversation.messages[i].read === false && result.conversation.messages[i].member.toString() !== req.body.member) {[m
[32m+[m[32m                        messages.push(result.conversation.messages[i]);[m
[32m+[m[32m                    }[m
[32m+[m[32m                }[m
[32m+[m[32m                res.send(JSON.stringify({"members" : result.members, "conversation" : {"uid" : req.params.uid, "messages" : messages}}));[m
[32m+[m
[32m+[m[32m            } else {[m
[32m+[m[32m                res.send(JSON.stringify({"state": "error"}));[m
[32m+[m[32m            }[m
[32m+[m[32m            client.close();[m
[32m+[m[32m        });[m
[32m+[m[32m    })[m
[32m+[m[32m});[m
[32m+[m
[32m+[m[32mapp.post('/updateMessages', function (req, res) {[m
[32m+[m[32m    MongoClient.connect(url, function(err, client) {[m
[32m+[m[32m        const db = client.db(dbName);[m
         res.setHeader('Content-Type', 'application/json; charset=UTF-8');[m
[31m-        var message = {[m
[31m-              "type" : req.body.message.type,[m
[31m-              "member" : ObjectId(req.body.message.member),[m
[31m-              "text" : req.body.message.text,[m
[31m-              "date" : req.body.message.date[m
[32m+[m[32m        var query = {[m
[32m+[m[32m            'conversation.uid' : req.body.uid,[m
         };[m
[31m-        db.collection('chatbot').findOneAndUpdate(query, {$push: {"conversation.messages" : message}}, function(err, result) {[m
[31m-            if (result.value != null) {[m
[31m-                res.send(JSON.stringify({"state": "success"}));[m
[32m+[m[32m        db.collection('chatbot').updateOne(query, {$set: { "conversation.messages.$[message].read" : true}}, { arrayFilters: [{ "message.member" : {$ne : ObjectId(req.body.member)}}]}, function(err, result) {[m
[32m+[m[32m            if (result) {[m
[32m+[m[32m                res.send(JSON.stringify({"state" : "success"}));[m
 [m
             } else {[m
[31m-                res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));[m
[32m+[m[32m                res.send(JSON.stringify({"state": "error"}));[m
             }[m
             client.close();[m
         });[m
     })[m
 });[m
 [m
[32m+[m
 app.listen(8082);[m
[1mdiff --git a/swagger.json b/swagger.json[m
[1mindex dc4a3d1..0a575df 100644[m
[1m--- a/swagger.json[m
[1m+++ b/swagger.json[m
[36m@@ -12,7 +12,7 @@[m
        "post": {[m
          "x-swagger-router-controller": "bar",[m
          "operationId": "1",[m
[31m-         "description": "[Login 123](https://www.google.com)",[m
[32m+[m[32m         "description": "Créer une conversation",[m
          "parameters": [{[m
            "name": "body",[m
            "in": "body",[m
[36m@@ -31,7 +31,7 @@[m
        "delete": {[m
          "x-swagger-router-controller": "bar",[m
          "operationId": "3",[m
[31m-         "description": "[Login 123](https://www.google.com)",[m
[32m+[m[32m         "description": "Supprimer une conversation",[m
          "parameters": [{[m
            "name": "body",[m
            "in": "body",[m
[36m@@ -52,7 +52,7 @@[m
        "get": {[m
          "x-swagger-router-controller": "bar",[m
          "operationId": "2",[m
[31m-         "description": "[Login 123](https://www.google.com)",[m
[32m+[m[32m         "description": "Récupérer une conversation",[m
          "parameters": [{[m
            "name": "uid",[m
            "type" : "string",[m
[36m@@ -71,7 +71,7 @@[m
 		"post": {[m
 		  "x-swagger-router-controller": "bar",[m
 		  "operationId": "4",[m
[31m-		  "description": "",[m
[32m+[m		[32m  "description": "Envoyer un message",[m
 		  "responses": {},[m
 		  "parameters": [{[m
             "in": "body",[m
[36m@@ -83,7 +83,41 @@[m
           }[m
           ][m
 		}[m
[31m-	  }[m
[32m+[m	[32m  },[m
[32m+[m[32m      "/retrieveMessages": {[m
[32m+[m[32m        "post": {[m
[32m+[m[32m          "x-swagger-router-controller": "bar",[m
[32m+[m[32m          "operationId": "5",[m
[32m+[m[32m          "description": "Récupérer les messages non lus d'une conversation",[m
[32m+[m[32m          "responses": {},[m
[32m+[m[32m          "parameters": [{[m
[32m+[m[32m            "in": "body",[m
[32m+[m[32m            "required": true,[m
[32m+[m[32m            "schema": {[m
[32m+[m[32m              "$ref": "#/definitions/retrieveMessages"[m
[32m+[m[32m            },[m
[32m+[m[32m            "name": "body"[m
[32m+[m[32m          }[m
[32m+[m[32m          ][m
[32m+[m[32m        }[m
[32m+[m[32m      },[m
[32m+[m[32m      "/updateMessages": {[m
[32m+[m[32m        "post": {[m
[32m+[m[32m          "x-swagger-router-controller": "bar",[m
[32m+[m[32m          "operationId": "6",[m
[32m+[m[32m          "description": "Mettre à jour les messages non lus d'une conversation",[m
[32m+[m[32m          "responses": {},[m
[32m+[m[32m          "parameters": [{[m
[32m+[m[32m            "in": "body",[m
[32m+[m[32m            "required": true,[m
[32m+[m[32m            "schema": {[m
[32m+[m[32m              "$ref": "#/definitions/updateMessages"[m
[32m+[m[32m            },[m
[32m+[m[32m            "name": "body"[m
[32m+[m[32m          }[m
[32m+[m[32m          ][m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
    },[m
   "definitions": {[m
     "conversation" : {[m
[36m@@ -132,6 +166,26 @@[m
         }[m
       }[m
     },[m
[32m+[m[32m    "retrieveMessages" : {[m
[32m+[m[32m      "properties" : {[m
[32m+[m[32m        "uid" : {[m
[32m+[m[32m          "type" : "string"[m
[32m+[m[32m        },[m
[32m+[m[32m        "member" : {[m
[32m+[m[32m          "type" : "string"[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
[32m+[m[32m    "updateMessages" : {[m
[32m+[m[32m      "properties" : {[m
[32m+[m[32m        "uid" : {[m
[32m+[m[32m          "type" : "string"[m
[32m+[m[32m        },[m
[32m+[m[32m        "member" : {[m
[32m+[m[32m          "type" : "string"[m
[32m+[m[32m        }[m
[32m+[m[32m      }[m
[32m+[m[32m    },[m
     "conversationObj": {[m
       "type": "object",[m
       "required": [[m
