/**
* Created with IntelliJ IDEA by Nick Chervyakov.
* User: Nikolay Chervyakov
* Date: 05.05.2015
* Time: 18:19
*/

var context = require('rabbit.js').createContext('amqp://localhost');
var io = require('socket.io')(4397);
var usersTokens = {},
    tokenCounts = {};


context.on('ready', function () {
    var sub = context.socket('PULL', {routing: 'direct'});
    sub.setsockopt('persistent', true);
    sub.setEncoding('utf8');

    console.log('ready');

    sub.on('data',function(msg) {
        if (msg !== null) {
            var content;
            try {
                content = JSON.parse(msg);
            } catch (e) {
                content = msg.content.toString();
            }

            usersTokens[content.token] = content.user_id;
        }
    });
    sub.connect('user_info');
});

io.on('connection', function (socket) {
    var token = '',
        user_id = null,
        initialized = false,
        sub = context.socket('SUB', {routing: 'direct'});
        //pub = context.socket('PUB'),

    sub.setsockopt('persistent', false);
    sub.setEncoding('utf8');

    //socket.on('message', function () { });
    socket.on('disconnect', function () {
        sub.close();
        if (tokenCounts[token]) {
            tokenCounts[token]--;
            if (tokenCounts[token] == 0) {
                delete usersTokens[token];
            }
        }
    });

    socket.on('register_token', function (tok) {
        if (tok) {
            token = tok;
            user_id = usersTokens[token];
            bindHandlers();
        }
    });

    var bindHandlers = function () {
        if (initialized || !token || !user_id) {
            return;
        }

        //var room = 'user.' + token;
        //socket.join(room);

        sub.on('data',function(msg) {
            if (msg !== null) {
                var content;
                try {
                    content = JSON.parse(msg.toString());
                } catch (e) {
                    content = msg.content.toString();
                }

                if (content.type) {
                    io.to(socket.id).emit(content.type, content.data);
                } else {
                    io.to(socket.id).emit('message', content);
                }
            }
        });

        sub.connect('notifications', 'user.' + user_id);

        if (!tokenCounts[token]) {
            tokenCounts[token] = 0;
        }

        tokenCounts[token]++;

        io.to(socket.id).emit('bound', true);
        initialized = true;
    };
});
