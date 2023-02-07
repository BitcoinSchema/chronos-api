import mongo from 'mongodb'

const MongoClient = mongo.MongoClient
let client = null
let db = null

const getDbo = async () => {
  if (db) {
    return db
  } else {
    try {
      console.log('connecting to', process.env.CHRONOS_MONGO_URL)
      client = await MongoClient.connect(process.env.CHRONOS_MONGO_URL, {
        poolSize: 10,
        useUnifiedTopology: true,
        useNewUrlParser: true,
      })
      db = client.db('chronos')
      return db
    } catch (e) {
      throw e
    }
  }
}

const closeDb = async () => {
  if (client !== null) {
    await client.close()
    client = null
  }
}

export { closeDb, getDbo }

// db.c.createIndex({
//   "MAP.app": 1,
//   "MAP.type": 1,
// })

// db.c.createIndex({
//   "MAP.app": 1,
//   "MAP.type": 1,
//   "blk.t": -1,
// })

// db.c.createIndex({
//   "MAP.app": 1,
//   "MAP.type": 1,
//   "blk.i": -1,
// })
