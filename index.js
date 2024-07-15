const express = require('express');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
require('dotenv').config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sgvl42h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const db = client.db('bouncyDB');
        const usersCollection = db.collection('users');

        // Registration route
        app.post('/register', async (req, res) => {
            const { name, pin, mobileNumber, email } = req.body;

            try {
                const hashedPin = await bcrypt.hash(pin, 10);
                const user = {
                    name,
                    pin: hashedPin,
                    mobileNumber,
                    email,
                    status: 'pending',
                    balance: 0,
                };

                const existingUser = await usersCollection.findOne({ $or: [{ email }, { mobileNumber }] });
                if (existingUser) {
                    return res.status(400).json({ message: 'User with this email or mobile number already exists.' });
                }

                await usersCollection.insertOne(user);
                res.status(201).json({ message: 'User registered. Awaiting admin approval.' });
            } catch (error) {
                res.status(500).json({ message: 'Server error.', error: error.message });
            }
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('bouncy is running')
})

app.listen(port, () => {
    console.log(`Bouncy is running on port ${port}`);
})