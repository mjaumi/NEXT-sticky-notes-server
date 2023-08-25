const express = require('express');
const socketIo = require('socket.io');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const server = require('http').Server(app);
const io = socketIo(server, {
    cors: ['http://localhost:3000'],
});
const port = process.env.PORT || 9000;

// middlewires
app.use(cors());
app.use(express.json());

// mongodb connection here
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ueracwd.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        const notesCollection = client.db('sticky-notes').collection('notes');

        console.log('Pinged your deployment. You successfully connected to MongoDB!');

        // GET API to get all the notes from the database
        app.get('/notes', async (req, res) => {
            const cursor = notesCollection.find({});
            const notesData = await cursor.toArray();
            res.send(notesData);
        });

        // POST API to a new note to the database
        app.post('/note', async (req, res) => {
            const newNote = req.body;
            const addNoteResult = await notesCollection.insertOne(newNote);

            if (addNoteResult.acknowledged) {
                res.send({
                    status: 'success',
                    body: {
                        _id: addNoteResult.insertedId,
                        ...req.body,
                    },
                });
            } else {
                res.send({
                    status: 'error',
                    body: null
                });
            }
        });

        // PATCH API to update a single note to the database
        app.patch('/note/:noteId', async (req, res) => {
            const id = req.params.noteId;
            const updatedNote = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDocument = {
                $set: {
                    noteText: updatedNote.noteText,
                    isStared: updatedNote.isStared,
                    category: updatedNote.category,
                },
            };

            const updateResult = await notesCollection.updateOne(filter, updateDocument, options);

            if (updateResult.modifiedCount) {
                res.send({
                    status: 'success',
                    body: req.body,
                });
            } else {
                res.send({
                    status: 'error',
                    body: null
                });
            }
        });

        // PATCH API to delete a single note to the database
        app.delete('/note/:noteId', async (req, res) => {
            const id = req.params.noteId;
            const query = { _id: new ObjectId(id) };
            const deleteResult = await notesCollection.deleteOne(query);

            if (deleteResult.deletedCount) {
                res.send({
                    status: 'success',
                    body: { _id: id },
                });
            } else {
                res.send({
                    status: 'error',
                    body: null
                });
            }
        });
    } finally {

    }
}
run().catch(console.dir);

// base API
app.get('/', (req, res) => {
    res.send('Server Running!!');
});

// listening API
server.listen(port, () => {
    console.log('Listening to PORT', port);
});

// creating socket io connection here
io.on('connection', socket => {

    socket.on('note-added', isAdded => {
        isAdded && socket.broadcast.emit('receive-added-note');
    });

    socket.on('note-updated', isUpdated => {
        isUpdated && socket.broadcast.emit('receive-updated-note');
    });

    socket.on('note-deleted', isDeleted => {
        isDeleted && socket.broadcast.emit('receive-deleted-note');
    });
});