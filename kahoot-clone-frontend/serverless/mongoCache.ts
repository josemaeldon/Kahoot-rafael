import { MongoClient, ServerApiVersion } from "mongodb";
let cachedDb: MongoClient | null = null;

export const connectToDatabase = async () => {
  if (cachedDb) {
    return Promise.resolve(cachedDb);
  }

  const uri =
    "mongodb://josemaeldon:b6096adea46c36bf140504a221808930@173.212.245.72:27017/kahoot?authSource=admin&readPreference=primary&ssl=false&directConnection=true";
  const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
  await client.connect();
  cachedDb = client;
  return cachedDb;
};
