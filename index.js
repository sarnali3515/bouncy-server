const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const port = process.env.PORT || 5000;

const corsOptions = {
    origin: 'http://localhost:5173',
};

// middleware
app.use(cors(corsOptions));
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
        // await client.connect();

        const db = client.db('bouncyDB');
        const usersCollection = db.collection('users');


        //jwt api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h'
            })
            res.send({ token })
        })

        //middlewares
        const verifyToken = (req, res, next) => {
            console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access ' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // register
        app.post('/register', async (req, res) => {
            const { name, email, phoneNumber, pin } = req.body;

            if (!name || !email || !phoneNumber || !pin) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check user existence
            const existingUser = await usersCollection.findOne({ email });
            if (existingUser) {
                return res.status(409).json({ message: 'User exists' });
            }

            // Hashed PIN
            const hashedPin = await bcrypt.hash(pin, 10);

            const newUser = {
                name,
                email,
                phoneNumber,
                pin: hashedPin,
                status: 'pending',
                role: "user",
                balance: 40,
            };

            const result = await usersCollection.insertOne(newUser);

            // JWT token
            const token = jwt.sign({ userId: result.insertedId, email }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h',
            });

            res.status(201).json({ token, message: 'Registered successfully! wait for admin approval' });
        });

        // Login endpoint
        app.post('/login', async (req, res) => {
            const { emailOrPhone, pin } = req.body;

            if (!emailOrPhone || !pin) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Find user by email or phone number
            const user = await usersCollection.findOne({
                $or: [{ email: emailOrPhone }, { phoneNumber: emailOrPhone }]
            });

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Compare the provided pin with the stored hashed pin
            const isMatch = await bcrypt.compare(pin, user.pin);

            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            // Generate JWT token
            const token = jwt.sign({ userId: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1h',
            });

            // Send user information along with the token
            res.status(200).json({
                token,
                user,
                message: 'Login successful'
            });
        });


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('bouncy is running')
})

app.listen(port, () => {
    console.log(`Bouncy is running on port ${port}`);
})