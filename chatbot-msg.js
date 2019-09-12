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

var  PushNotifications = require('node-pushnotifications');

const settings = {
     apn: {
        token: {
            key: './certs/AuthKey_8QTXRZ565P.p8', // optionally: fs.readFileSync('./certs/AuthKey_8QTXRZ565P.p8')
            keyId: '8QTXRZ565P',
            teamId: 'VHVJHEFMDW',
        },
        production: false // true for APN production environment, false for APN sandbox environment,
    },
    isAlwaysUseFCM: false, // true all messages will be sent through node-gcm (which actually uses FCM)
};
const push = new PushNotifications(settings);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));


// A AMELIORER POTENTIELLEMENT AVEC READ = true uniquement pour les messages d'un utilisateur
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

app.post('/conversation/all/user', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'token': req.body.token
        };
        var arr = [];
        db.collection('users_token').findOne(query, function (err, result) {

             if (result) {
                 var user = {
                     _id : ObjectId(result.user_id)
                 };
                 db.collection('users').findOne(user, function (err, result) {
                     if (result != null) {
                         for (let i = 0; i < result.conversations.length; i++) {
                             arr.push({ "conversation.uid" : result.conversations[i] }) ;
                         }

                         db.collection('chatbot').aggregate([{
                             $project: {
                                 "_id" : 0,
                                 "conversation.messages": [{
                                     $arrayElemAt: [ "$conversation.messages", -1 ]
                                 }],
                                 "members" : 1,
                                 'conversation.uid': 1,
                                 'conversation.unread' : { $size : {$filter : {"input" : "$conversation.messages", "cond" : { "$and" : [{ "$eq" :  [ "$$this.read", false ]},{ "$ne" :  [ "$$this.member", result._id ]}]}}}}
                             }
                         },            {
                             $match: {
                                 $or: arr
                             } }
                         ]).toArray(function(err, result) {
                             res.send(JSON.stringify({"state" : "success", "lastMessages" : result}));
                             client.close();
                         });
                     }
                 });
             } else {
                 res.send(JSON.stringify({"state": "error", "message": "bad token"}));
             }
         });

    });
});

app.post('/conversation/all/doctor', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'token': req.body.token
        };
        var arr = [];
        db.collection('doctors').findOne(query, function (err, result) {
            console.log(result);
            if (result != null) {

                for (let i = 0; i < result.conversations.length; i++) {
                    arr.push({"conversation.uid": result.conversations[i]});
                }
                db.collection('chatbot').aggregate([{
                    $project: {
                        "_id": 0,
                        "conversation.messages": [{
                            $arrayElemAt: ["$conversation.messages", -1]
                        }],
                        "members": 1,
                        'conversation.uid': 1,
                        'conversation.unread' : { $size : {$filter : {"input" : "$conversation.messages", "cond" : { "$and" : [{ "$eq" :  [ "$$this.read", false ]},{ "$ne" :  [ "$$this.member", result._id ]}]}}}}
                    }
                }, {
                    $match: {
                        $or: arr
                    }
                }
                ]).toArray(function (err, result) {
                    res.send(JSON.stringify({"state": "success", "lastMessages": result}));
                });
            } else {
                res.send(JSON.stringify({"state" : "error", "message" : "bad token"}));
            }
            client.close();
        })
    });
});

app.delete('/conversation', function (req, res) {
    console.log(req);
    MongoClient.connect(url, function (err, client) {
        const db = client.db(dbName);
        var query = {
            token: req.body.token
        };
        db.collection('users').findOneAndUpdate(query, {$pull: {"conversations" : req.body.uid}}, function (err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"state": "success"}));
                client.close();
            }
        });
        db.collection('doctors').findOneAndUpdate(query, {$pull: {"conversations" : req.body.uid}}, function (err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"state": "success"}));
                client.close();
            }
        });
    });
});

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
                    conversation: {
                        uid : req.body.conversation.uid,
                        messages: []
                    }
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

            res.setHeader('Content-Type', 'application/json; charset=UTF-8');
            if (req.body.message.member !== "000000000000000000000001") {
                var message = {
                    "type" : req.body.message.type,
                    "member" : ObjectId(req.body.message.member),
                    "text" : req.body.message.text,
                    "date" : req.body.message.date,
                    "read" : false
                };
            } else  {
                var message = {
                    "type" : req.body.message.type,
                    "member" : ObjectId(req.body.message.member),
                    "text" : req.body.message.text,
                    "date" : req.body.message.date,
                    "read" : true
                };
            }

            var query2 = {
                user_id : ObjectId(req.body.message.member)
            };
            db.collection('users_token').find(query2).toArray(function(err, result) {
                if (result) {
                    const data = {
                        title: 'New push notification', // REQUIRED for Android
                        topic: 'topic', // REQUIRED for iOS (apn and gcm)
                        body: 'Powered by AppFeel',
                        custom: {
                            sender: 'AppFeel',
                        },
                        priority: 'high', // gcm, apn. Supported values are 'high' or 'normal' (gcm). Will be translated to 10 and 5 for apn. Defaults to 'high'
                        collapseKey: '', // gcm for android, used as collapseId in apn
                        contentAvailable: true, // gcm, apn. node-apn will translate true to 1 as required by apn.
                        delayWhileIdle: true, // gcm for android
                        restrictedPackageName: '', // gcm for android
                        dryRun: false, // gcm for android
                        icon: '', // gcm for android
                        image: '', // gcm for android
                        style: '', // gcm for android
                        picture: '', // gcm for android
                        tag: '', // gcm for android
                        color: '', // gcm for android
                        clickAction: '', // gcm for android. In ios, category will be used if not supplied
                        locKey: '', // gcm, apn
                        locArgs: '', // gcm, apn
                        titleLocKey: '', // gcm, apn
                        titleLocArgs: '', // gcm, apn
                        retries: 1, // gcm, apn
                        encoding: '', // apn
                        badge: 2, // gcm for ios, apn
                        sound: 'ping.aiff', // gcm, apn
                        android_channel_id: '', // gcm - Android Channel ID
                        alert: { // apn, will take precedence over title and body
                            title: 'title',
                            body: 'body'
                            // details: https://github.com/node-apn/node-apn/blob/master/doc/notification.markdown#convenience-setters
                        },
                        /*
                         * A string is also accepted as a payload for alert
                         * Your notification won't appear on ios if alert is empty object
                         * If alert is an empty string the regular 'title' and 'body' will show in Notification
                         */
                        // alert: '',
                        launchImage: '', // apn and gcm for ios
                        action: '', // apn and gcm for ios
                        category: '', // apn and gcm for ios
                        // mdm: '', // apn and gcm for ios. Use this to send Mobile Device Management commands.
                        // https://developer.apple.com/library/content/documentation/Miscellaneous/Reference/MobileDeviceManagementProtocolRef/3-MDM_Protocol/MDM_Protocol.html
                        urlArgs: '', // apn and gcm for ios
                        truncateAtWordEnd: true, // apn and gcm for ios
                        mutableContent: 0, // apn
                        threadId: '', // apn
                        // if both expiry and timeToLive are given, expiry will take precedence
                        expiry: Math.floor(Date.now() / 1000) + 28 * 86400, // seconds
                        timeToLive: 28 * 86400,
                        headers: [], // wns
                        launch: '', // wns
                        duration: '', // wns
                        consolidationKey: 'my notification', // ADM
                    };
                    const registrationIds = [];
                    for (i = 0; i !== result.length ; i++) {
                        registrationIds.push("42850e679b37b6ab0ad03e30cf9aa551c2a2ff45766d6f1d317daca337c72fae");
                    }
                    push.send(registrationIds, data, (err, result) => {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(result);
                        }
                    });
                }
                client.close();
            });

            var query = {
                'conversation.uid' : req.body.uid
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

// A TESTER ENCORE
/*app.post('/retrieveMessages', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');

        db.collection('chatbot').aggregate([{
            $project: {
                "_id" : 0,
                "conversation.messages": [{
                    $filter: {"input" : "$conversation.messages", "cond" : { "$and" : [{ "$eq" :  [ "$$this.read", false ]},{ "$ne" :  [ "$$this.member", req.body._id ]}]}}
                }],
                "members" : 1,
                'conversation.uid': 1
            }
        },            {
            $match: {
                'conversation.uid' : req.body.uid
            } }
        ]).toArray(function(err, result) {
            res.send(JSON.stringify({"state" : "success", "lastMessages" : result}));
        });
        client.close();
    })
});*/

app.post('/retrieveMessages', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        var query = {
            'conversation.uid' : req.body.uid
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
