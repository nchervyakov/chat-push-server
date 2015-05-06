/**
* Created with IntelliJ IDEA by Nick Chervyakov.
* User: Nikolay Chervyakov
* Date: 05.05.2015
* Time: 18:19
*/

var q = 'tasks';

var open = require('amqplib').connect('amqp://localhost');

var io = require('socket.io')(4397);

// Publisher
//open.then(function(conn) {
//    var ok = conn.createChannel();
//    ok = ok.then(function(ch) {
//        ch.assertQueue(q);
//        ch.sendToQueue(q, new Buffer('something to do'));
//    });
//    return ok;
//}).then(null, console.warn);

// Consumer
open.then(function(conn) {
    var ok = conn.createChannel();
    ok = ok.then(function(ch) {
        ch.assertQueue(q);

        io.on('connection', function (socket) {
            socket.on('message', function () { });
            socket.on('disconnect', function () { });

            ch.consume(q, function(msg) {
                if (msg !== null) {
                    var content;
                    try {
                        content = JSON.parse(msg.content.toString());
                    } catch (e) {
                        content = msg.content.toString();
                    }
                    console.log(content);
                    io.emit('new_messages', content);
                    ch.ack(msg);
                }
            });
        });


    });
    return ok;
}).then(null, console.warn);

//io.on('connection', function (socket) {
//    socket.on('message', function () { });
//    socket.on('disconnect', function () { });
//});