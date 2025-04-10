const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mx4ls.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("solo-db");
    const jobsCollection = db.collection("jobs");
    const bidCollection = db.collection("bids");

    app.post("/add-job", async (req, res) => {
      const jobsData = req.body;
      console.log(jobsData);
      const result = await jobsCollection.insertOne(jobsData);
      res.send(result);
    });

    app.get("/jobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.put("/update-job/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateJob = req.body;
      const updateDoc = {
        $set: updateJob,
      };
      const result = await jobsCollection.updateOne(filter, updateDoc, options);
      res.send(result);
    });

    // add bids
    app.post("/add-bids", async (req, res) => {
      // save data in bid collection
      const bidData = req.body;

      // check if the user is already bid on this job
      const query = { email: bidData.email, jobId: bidData.jobId };
      const alreadyExist = await bidCollection.findOne(query);
      if (alreadyExist) {
        return res.status(400).send("You have all ready bid on this job!");
      }

      // add bid in the bid collection
      const result = await bidCollection.insertOne(bidData);
      // increase bids in job collections
      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = {
        $inc: { bid_count: 1 },
      };
      const updateBidCount = await jobsCollection.updateOne(filter, update);
      res.send(result);
    });

    // get the bids of a user
    app.get("/bids/:email", async (req, res) => {
      const isBuyer = req.query.isBuyer;
      const email = req.params.email;
      let query = {};
      if (isBuyer) {
        query.buyer = email;
      } else {
        query.email = email;
      }
      const result = await bidCollection.find(query).toArray();
      res.send(result);
    });

    app.patch("/bid-status-update/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) };
      const update = {
        $set: {
          status: status,
        },
      };
      const result = await bidCollection.updateOne(query, update);
      res.send(result);
    });

    app.get("/all-jobs", async (req, res) => {

      const {filter} = req.query;
      const {search} = req.query;
      const query = {title:{
        $regex : search,
        $options: "i"
      }};

      if(filter){
        query.category = filter;
      }

      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
