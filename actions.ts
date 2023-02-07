import { bmap } from 'bmapjs'
import chalk from 'chalk'
import { getDbo } from './db.js'
let confirmedTxs = []

const { TransformTx } = bmap

const saveTx = async (tx) => {
  let t
  let dbo
  // Transform
  try {
    dbo = await getDbo()
  } catch (e) {
    // await closeDb()
    let txid = tx && tx.tx ? tx.tx.h : undefined
    throw new Error('Failed to get dbo ' + txid + ' : ' + e)
  }
  try {
    t = await TransformTx(tx)
  } catch (e) {
    throw new Error('Failed to transform tx ' + tx)
  }

  if (t) {
    let collection = t.blk ? 'c' : 'u'
    let txId = tx && tx.tx ? tx.tx.h : undefined
    t._id = txId
    try {
      let timestamp = t.timestamp
      delete t.timestamp
      console.log({ tx })

      await dbo.collection(collection).updateOne(
        { _id: t._id },
        {
          $set: t,
          $setOnInsert: {
            timestamp: timestamp || Math.round(new Date().getTime() / 1000),
          },
        },
        {
          upsert: true,
        }
      )

      // if this was a confirmed tx, make sure its not in mempool
      if (t.blk) {
        confirmedTxs.push(t.tx.h)
      }
      return t
    } catch (e) {
      console.log('not inserted', e)
      console.log(
        collection === 'u'
          ? (chalk.green('saved'), chalk.magenta('unconfirmed'))
          : '',
        (chalk.cyan('saved'), chalk.green(t.tx.h))
      )

      throw new Error('Failed to insert tx ' + txId + ' : ' + e)
    }
  } else {
    throw new Error('Invalid tx')
  }
}

const clearConfirmed = (txIds: string[]) => {
  return new Promise<void>(async (res, rej) => {
    let dbo = await getDbo()

    try {
      let collection = 'u'

      await dbo.collection(collection).deleteMany({ _id: { $in: txIds } })
      console.log('txids removed from unconfirmed collection', txIds)
      // ToDo - This can throw errors during sync
      // await dbo.collection('u').drop(async function (err, delOK) {
      //   if (err) {
      //     // await closeDb()
      //     rej(err)
      //     return
      //   }
      //   if (delOK) res()
      // })
      // await closeDb()
      res()
    } catch (e) {
      // await closeDb()
      rej(e)
    }
  })
}

const clearUnconfirmed = () => {
  return new Promise<void>(async (res, rej) => {
    let dbo = await getDbo()
    dbo
      .listCollections({ name: 'u' })
      .toArray(async function (err, collections) {
        if (
          collections
            .map((c) => {
              return c.name
            })
            .indexOf('u') !== -1
        ) {
          try {
            // ToDo - This can throw errors during sync
            await dbo.collection('u').drop(async function (err, delOK) {
              if (err) {
                // await closeDb()
                rej(err)
                return
              }
              if (delOK) res()
            })
            // await closeDb()
            res()
          } catch (e) {
            // await closeDb()
            rej(e)
          }
        }
      })
  })
}

export { saveTx, clearUnconfirmed, clearConfirmed }

const bapApiUrl = `https://bap-api.com/v1`
const getBAPIdByAddress = async function (address, block, timestamp) {
  if (bapApiUrl) {
    const result = await fetch(`${bapApiUrl}/identity/validByAddress`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address,
        block,
        timestamp,
      }),
    })
    const data = await result.json()

    if (data && data.status === 'OK' && data.result) {
      return data.result
    }
  }

  return false
}
