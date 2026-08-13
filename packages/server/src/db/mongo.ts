import { MongoClient, type Db } from "mongodb";

let client: MongoClient | undefined;

export async function getDb(): Promise<Db> {
  if (!client) {
    const url = process.env.MONGO_URL;
    if (!url) {
      throw new Error("MONGO_URL is not set");
    }
    client = new MongoClient(url);
    await client.connect();
  }
  return client.db();
}

export async function closeMongo(): Promise<void> {
  if (client) {
    await client.close();
    client = undefined;
  }
}
