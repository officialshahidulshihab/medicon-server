import 'dotenv/config';
import express, { type Express, type Request, type Response } from 'express';
import { MongoClient, ServerApiVersion, type Db } from 'mongodb';

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 5000;
const MONGO_URI: string = process.env.MONGODB_URI || 'medicon_atlas_uri_here';


const client = new MongoClient(MONGO_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let db: Db;


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.get('/', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Medicon API is running' });
});

// Example: Get all users
app.get('/users', async (req: Request, res: Response) => {
  const users = await db.collection('users').find({}).toArray();
  res.json(users);
});


app.post('/users', async (req: Request, res: Response) => {
  const newUser = req.body;
  const result = await db.collection('users').insertOne(newUser);
  res.json({ success: true, insertedId: result.insertedId });
});


const startServer = async (): Promise<void> => {
  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    console.log('✅ Connected to MongoDB Atlas');

    db = client.db('medicon');

    app.listen(PORT, () => {
      console.log(` Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error(' MongoDB connection failed:', error);
    await client.close();
    process.exit(1);
  }
};

startServer();