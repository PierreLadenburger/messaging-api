var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('./swagger.json');
const {ObjectId} = require('mongodb'); // or ObjectID

app.use(bodyParser.json());
app.use(cors());

const url='mongodb://homedocRW:homedocRW@51.38.234.54:27017/homedoc';
const dbName = 'homedoc';

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/conversation/:uid', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'conversation.uid' : req.params.uid
        };
        db.collection('chatbot').findOneAndUpdate(query, {$set: { "conversation.messages.$[].read" : true}} ,{returnOriginal:false}, function(err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"members" : result.value.members, "conversation" : result.value.conversation}));

            } else {
                console.log("là");
                res.send(JSON.stringify({"state": "error"}));
            }
            client.close();
        });
    })
});

app.delete('/conversation/', function (req, res) {
    console.log(req);
    MongoClient.connect(url, function (err, client) {
        const db = client.db(dbName);
        var query = {
            'conversation.uid': req.body.uid
        };
        db.collection('chatbot').findOneAndDelete(query, function(err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"state": "success"}));

            } else {
                res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));
            }
            client.close();
        });
        var query2 = {
            token: req.body.token
        };
        db.collection('users').findOneAndUpdate(query2, {$pull: {"conversations" : req.body.uid}}, function (err, result) {
            client.close();
        });
        db.collection('doctors').findOneAndUpdate(query2, {$pull: {"conversations" : req.body.uid}}, function (err, result) {
            client.close();
        });
    });
});

function addConversationToUser($user_id) {

}

app.post('/conversation', function (req, res) {
    MongoClient.connect(url, function (err, client) {
        const db = client.db(dbName);
        var checkUid = {
            'conversations' : req.body.conversation.uid,
            token: req.body.token
        };
        db.collection('users').findOne(checkUid, function (err, result) {
            if (result) {
                res.send(JSON.stringify({"state": "error", "message": "uid already used"}));
            } else {
                var members = [
                    ObjectId(req.body.members[0]),
                    ObjectId(req.body.members[1]),
                ];
                var body = {
                    members: members,
                    conversation: req.body.conversation
                };
                db.collection('chatbot').insertOne(body, function (err, result) {
                    if (result) {
                        res.send(JSON.stringify({"state": "success"}));
                    } else {
                        res.send(JSON.stringify({"state": "error", "message": "insertion failed"}));
                    }
                    client.close();
                });
                var queryUser = {
                    token: req.body.token,
                    _id: ObjectId(req.body.members[1])
                };
                db.collection('users').findOneAndUpdate(queryUser, {$push: {"conversations" : req.body.conversation.uid}}, function (err, result) {
                    client.close();
                });
                var queryDoctor = {
                    _id: ObjectId(req.body.members[0])
                };
                db.collection('doctors').findOneAndUpdate(queryDoctor, {$push: {"conversations" : req.body.conversation.uid}}, function (err, result) {
                    client.close();
                });
            }
        });

    });
});

app.post('/message', function (req, res) {
    if (ObjectId.isValid(req.body.message.member) !== true) {
        res.send(JSON.stringify({"state": "error"}));
    } else {
        MongoClient.connect(url, function(err, client) {
            const db = client.db(dbName);
            var query = {
                'conversation.uid' : req.body.uid
            };
            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
            var message = {
                "type" : req.body.message.type,
                "member" : ObjectId(req.body.message.member),
                "text" : req.body.message.text,
                "date" : req.body.message.date,
                "read" : false
            };
            db.collection('chatbot').findOneAndUpdate(query, {$push: {"conversation.messages" : message}}, function(err, result) {
                if (result.value != null) {
                    res.send(JSON.stringify({"state": "success"}));

                } else {
                    res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));
                }
                client.close();
            });
        })
    }
});

app.post('/retrieveMessages', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'conversation.uid' : req.body.uid,
        };
        db.collection('chatbot').findOne(query, function(err, result) {
            if (result) {
                var messages = [];


                for (var i = 0; i < result.conversation.messages.length; i++) {
                    if (result.conversation.messages[i].read === false && result.conversation.messages[i].member.toString() !== req.body.member) {
                        messages.push(result.conversation.messages[i]);
                    }
                }
                res.send(JSON.stringify({"members" : result.members, "conversation" : {"uid" : req.params.uid, "messages" : messages}}));

            } else {
                res.send(JSON.stringify({"state": "error"}));
            }
            client.close();
        });
    })
});

app.post('/updateMessages', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'conversation.uid' : req.body.uid,
        };
        db.collection('chatbot').updateOne(query, {$set: { "conversation.messages.$[message].read" : true}}, { arrayFilters: [{ "message.member" : {$ne : ObjectId(req.body.member)}}]}, function(err, result) {
            if (result) {
                res.send(JSON.stringify({"state" : "success"}));

            } else {
                res.send(JSON.stringify({"state": "error"}));
            }
            client.close();
        });
    })
});


app.listen(8082);
