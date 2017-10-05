const fs = require('fs');
const http = require('http');
const socketio = require('socket.io');

const port = process.env.PORT || process.env.NODE_PORT || 3000;

const onRequest = (request, response) => {
  fs.readFile(`${__dirname}/../client/index.html`, (err, data) => {
    if (err) throw err;
    response.writeHead(200);
    response.end(data);
  });
};

const app = http.createServer(onRequest);

app.listen(port);

console.log(`listening on 127.0.0.1: ${port}`);

const io = socketio(app);

const clientObjs = {};

let socketID;

io.sockets.on('connection', (sock) => {
  const socket = sock;

  socket.join('room1');

  socket.on('join', () => {
    const keys = Object.keys(clientObjs);
    if (keys.length > 0) {
      socketID = socket.id;
      socket.broadcast.emit('getCanvasImage', clientObjs[keys[0]]);
    }
  });

  socket.on('sendCanvasImage', (data) => {
    // need to keep track of person who sent the request for the canvas snapshot
    io.sockets.connected[socketID].emit('joined', data);
  });

  socket.on('updateOnServer', (data) => {
    // if new client connected, add them to the client objects with their respective coords
    // else if they exist and they send new data, update it.
    if (!clientObjs[data.user]) {
      clientObjs[data.user] = data.coords;
      clientObjs[data.user].user = data.user;
    } else if (clientObjs[data.user].lastUpdate < data.coords.lastUpdate) {
      clientObjs[data.user].coords = data.coords;
    }

    io.sockets.in('room1').emit('updateOnClient', { user: data.user, coords: data.coords });
  });

  socket.on('msgToServer', (data) => {
    io.sockets.in('room1').emit('msgToClient', { user: data.user, msg: data.msg });
  });

  socket.on('disconnect', () => {
    socket.leave('room1');
  });
});
