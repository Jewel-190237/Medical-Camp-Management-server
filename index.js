const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const PORT = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


//MiddleWire

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kwtddbl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster`;

// console.log(uri)
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
        // Connect the client to the server	(optional starting in v4.7).
        // await client.connect();
        // Send a ping to confirm a successful connection.

        const userCollections = client.db("MedicalCamp").collection('users');
        const campCollections = client.db("MedicalCamp").collection('camps');
        const registeredUserCollections = client.db("MedicalCamp").collection('registeredUser');

        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '4h'
            });
            res.send(token);
        })


        //middleWire
        const verifyToken = (req, res, next) => {
            // console.log('inside token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized Access_1' })
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized Access_2' })
                }
                req.decoded = decoded;
                next();
            })

        }

        //use verify admin after verifyToken
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollections.findOne(query);

            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next();
        }
        // store registeredUser
        app.post('/registeredUserCamp', async (req, res) => {
            const registeredUserCamp = req.body;
            const result = await registeredUserCollections.insertOne(registeredUserCamp);
            res.send(result);
        })

        // get registered camp for Manage Registered Camp
        app.get('/registeredCamp', async (req, res) => {
            const result = await registeredUserCollections.find().toArray();
            res.send(result);
        })

        //get registered camp for participant of registered camp page
        app.get('/registeredCampParticipant/:id', async (req, res) => {
            const id = req.params.id;
            const result = await registeredUserCollections.find({email: id}).toArray();
            res.send(result);
            // const result = await userCollections.find({ email: id }).toArray();
        })
        // Alternate way to get registered camp for participant of registered camp page
        app.get('/registeredCampParticipantN', verifyToken, async(req, res) => {
            console.log(req.query.email);
            
            let query = {};
            if(req.query?.email){
                query =  {email: req.query.email}
            }
            const result = await registeredUserCollections.find(query).toArray();
            res.send(result);

        })
        //create Camp
        app.post('/camps', verifyToken, verifyAdmin, async (req, res) => {
            const camp = req.body;
            const result = await campCollections.insertOne(camp);
            res.send(result);
        })
        //get camp for showing
        app.get('/camps', async (req, res) => {
            const camp = await campCollections.find().toArray();
            res.send(camp);
        })

        //update camp for update camp page
        app.get('/updateCamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await campCollections.findOne(query);
            res.send(result);
        })

        //delete a camp for manage camp page
        app.delete('/deleteCamp/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await campCollections.deleteOne(query);
            res.send(result)
        })

        //single camp details
        app.get('/singleCamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await campCollections.findOne(query);
            res.send(result);
        })

        //join camp details
        app.get('/joinCamp/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await campCollections.findOne(query);
            res.send(result);
        })

        //update camp for updateCamp page
        app.put('/updateCamp/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateCamp = req.body;
            const updateDocs = {
                $set: {
                    campName: updateCamp.campName,
                    participantCount: updateCamp.participantCount,
                    healthCarePName: updateCamp.healthCarePName,
                    campFees: updateCamp.campFees,
                    photo_url: updateCamp.photo_url,
                    time: updateCamp.time,
                    description: updateCamp.description,
                    location: updateCamp.location
                }
            }
            const result = await campCollections.updateOne(filter, updateDocs, options);
            res.send(result)
        })

        // create User
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollections.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' });
            }
            const result = await userCollections.insertOne(user);
            res.send(result);
        })

        //user Related Apis
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollections.find().toArray();
            res.send(result);
        })

        // get current user using email
        app.get('/joinUser/:id', async (req, res) => {
            const id = req.params.id;
            const result = await userCollections.find({ email: id }).toArray();
            res.send(result);
        })
        //get current user for update profile page
        app.get('/updateProfile/:id', async (req, res) => {
            const id = req.params.id;
            const result = await userCollections.find({ email: id }).toArray();
            res.send(result);
        })

        //update profile
        app.put('/updateProfile/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { email: new ObjectId(id) };
            console.log(filter);
            const options = { upsert: true };
            const updateUser = req.body;
            const updateDocs = {
                $set: {
                    name: updateUser.name,
                    email: updateUser.email,
                    photo: updateUser.photo,
                }
            }
            const result = await userCollections.updateOne(filter, updateDocs, options);
            console.log(result);
            res.send(result);

        })

        //Make Admin
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollections.updateOne(filter, updateDoc);
            res.send(result);
        })

        // check isAdmin
        app.get('/users/admin/:email', verifyToken, async (req, res) => {

            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            const query = { email: email }
            const user = await userCollections.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        //delete a user
        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollections.deleteOne(query);
            res.send(result);
        })



        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('assignment 12 is running');
})

app.listen(PORT, () => {
    console.log(`assignment 12 is running on ${PORT}`)
})