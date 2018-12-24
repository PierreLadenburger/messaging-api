var MongoClient = require('mongodb').MongoClient;
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var swaggerUi = require('swagger-ui-express');
var swaggerDocument = require('./swagger.json');

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
        db.collection('chatbot').findOne(query, function(err, result) {
            if (result) {
                res.send(JSON.stringify({"members" : result.members, "conversation" : result.conversation}));

            } else {
                res.send(JSON.stringify({"state": "error"}));
            }
            client.close();
        });
    })
});

app.delete('/conversation/:uid', function (req, res) {
    MongoClient.connect(url, function (err, client) {
        const db = client.db(dbName);
        var query = {
            'conversation.uid': req.params.uid
        };
        db.collection('chatbot').findOneAndDelete(query, function(err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"state": "success"}));

            } else {
                res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));
            }
            client.close();
        });
    });
});

app.post('/conversation', function (req, res) {
    MongoClient.connect(url, function (err, client) {
        const db = client.db(dbName);
        db.collection('chatbot').insertOne(req.body, function (err, result) {
            if (result) {
                res.send(JSON.stringify({"state": "success"}));
            } else {
                res.send(JSON.stringify({"state": "error", "message": "insertion failed"}));
            }
            client.close();
        });
    });
});

app.post('/message', function (req, res) {
    MongoClient.connect(url, function(err, client) {
        const db = client.db(dbName);
        var query = {
            'conversation.uid' : req.body.uid
        };
        var update = {
            $push : { "members" : {$each : "test"}
            }
        };
        res.setHeader('Content-Type', 'application/json; charset=UTF-8');
        db.collection('chatbot').findOneAndUpdate(query, {$push: {"conversation.messages" : req.body.message}}, function(err, result) {
            if (result.value != null) {
                res.send(JSON.stringify({"state": "success"}));

            } else {
                res.send(JSON.stringify({"state" : "error", "message" : "bad uid"}));
            }
            client.close();
        });
    })
});

app.listen(8082);
