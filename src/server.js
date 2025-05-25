import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import mongoose from 'mongoose';
import socketio from 'socket.io';
import http from 'http';
import * as Notes from './controllers/note_controller';

// DB Setup
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost/notes';
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

// set mongoose promises to es6 default
mongoose.Promise = global.Promise;

// initialize
// add server and io initialization after app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*', // allows requests all incoming connections
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable json message body for posting data to API
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // To parse the incoming requests with JSON payloads

// additional init stuff should go before hitting the routing

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
async function startServer() {
  try {
    const port = process.env.PORT || 9090;
    // change app.listen to server.listen
    server.listen(port);

    // at the bottom of server.js
    // lets register a connection listener
    io.on('connection', (socket) => {
      // on first connection emit notes
      Notes.getNotes().then((result) => {
        socket.emit('notes', result);
      });

      // pushes notes to everybody
      const pushNotes = () => {
        Notes.getNotes().then((result) => {
        // broadcasts to all sockets including ourselves
          io.sockets.emit('notes', result);
        });
      };

      // creates notes and
      socket.on('createNote', (fields) => {
        Notes.createNote(fields).then((result) => {
          pushNotes();
        }).catch((error) => {
          console.log(error);
          socket.emit('error', 'create failed');
        });
      });

      // on update note do what is needful
      socket.on('updateNote', (id, fields) => {
        Notes.updateNote(id, fields).then(() => {
          pushNotes();
        });
      });

      // on deleteNote do what is needful
      socket.on('deleteNote', (id) => {
        // you can do it
        Notes.deleteNote(id).then(() => {
          pushNotes();
        });
      });
    });

    console.log(`Listening on port ${port}`);
  } catch (error) {
    console.error(error);
  }
}

startServer();
