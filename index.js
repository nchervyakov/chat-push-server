/**
* Created with IntelliJ IDEA by Nick Chervyakov.
* User: Nikolay Chervyakov
* Date: 05.05.2015
* Time: 18:19
*/

var fs = require('fs');
var extend = require('extend');
var jf = require('jsonfile');
var usersTokens = {};
    //tokenCounts = {};
var dname = require('path').dirname(require.main.filename);

var config = jf.readFileSync(dname + '/config.json.dist');

if (fs.existsSync(dname + '/config.json')) {
    var customConfig = jf.readFileSync(dname + '/config.json');
    if (typeof customConfig == 'object') {
        extend(true, config, customConfig);
    }
}

var context = require('rabbit.js').createContext(config.rabbit.host);
var io = require('socket.io')(config.http.port);
console.log('Socket.IO has started.');

context.on('ready', function () {
    var sub = context.socket('PULL', {routing: 'direct'});
    sub.setsockopt('persistent', true);
    sub.setEncoding('utf8');

    console.log("RabbitMQ connection is ready.");

    sub.on('data',function(msg) {
        if (msg !== null) {
            var content;
            try {
                content = JSON.parse(msg);
            } catch (e) {
                content = msg.content.toString();
            }
            console.log(['User token: ', content.user_id, content.token]);
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
        //if (tokenCounts[token]) {
        //    tokenCounts[token]--;
            //if (tokenCounts[token] == 0) {
            //    delete usersTokens[token];
            //}
        //}
    });

    socket.on('register_token', function (tok) {
        console.log(tok);
        if (tok) {
            token = tok;
            user_id = usersTokens[token];
            if (user_id) {
                console.log([user_id, token]);
                bindHandlers();
            }
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

        //if (!tokenCounts[token]) {
        //    tokenCounts[token] = 0;
        //}
        //
        //tokenCounts[token]++;

        io.to(socket.id).emit('bound', true);
        initialized = true;
    };
});
