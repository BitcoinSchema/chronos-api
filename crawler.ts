import {
  ControlMessageStatusCode,
  Transaction,
} from '@gorillapool/js-junglebus'
import BPU from 'bpu'
import chalk from 'chalk'
import { clearConfirmed, saveTx } from './actions.js'
import { getDbo } from './db.js'

let currentBlock = 778119
let synced = false

const bobFromRawTx = async (rawtx) => {
  return await BPU.parse({
    tx: { r: rawtx },
    split: [
      {
        token: { op: 106 },
        include: 'l',
      },
      {
        token: { op: 0 },
        include: 'l',
      },
      {
        token: { s: '|' },
      },
    ],
  })
}

const crawl = (height, jungleBusClient) => {
  return new Promise(async (resolve, reject) => {
    // only block indexes greater than given height

    let confirmedTxs = []
    // create subscriptions in the dashboard of the JungleBus website
    const subId =
      'fe2f534c4d01b3e2c03ec261033ebf9e24e876ef46d35f13da5b146079b8e980'
    await jungleBusClient.Subscribe(
      subId,
      currentBlock || height,
      async function onPublish(ctx) {
        console.log('BLOCK TRANSACTION', ctx.id)
        confirmedTxs.push(ctx.id)

        if (confirmedTxs.length > 100) {
          return await clearConfirmed(confirmedTxs)
        } else {
          return
        }
      },
      function onStatus(cMsg) {
        if (cMsg.statusCode === ControlMessageStatusCode.BLOCK_DONE) {
          // TODO: Clear all txs in the block from db

          // add your own code here
          setCurrentBlock(cMsg.block)
          console.log(
            chalk.blue('####  '),
            chalk.magenta('NEW BLOCK '),
            chalk.green(currentBlock),
            cMsg.transactions > 0
              ? chalk.bgCyan(cMsg.transactions)
              : chalk.bgGray('No transactions this block')
          )
        } else if (cMsg.statusCode === ControlMessageStatusCode.WAITING) {
          console.log(
            chalk.blue('####  '),
            chalk.yellow('WAITING ON NEW BLOCK ')
          )
        } else if (cMsg.statusCode === ControlMessageStatusCode.REORG) {
          console.log(
            chalk.blue('####  '),
            chalk.red('REORG TRIGGERED ', cMsg.block)
          )
        } else {
          chalk.red(cMsg)
        }
      },
      function onError(cErr) {
        console.error(cErr)
        reject(cErr)
      },
      async function onMempool(ctx) {
        console.log('MEMPOOL TRANSACTION', ctx.id)

        return await processTransaction(ctx)
      }
    )
  })
}

export async function processTransaction(ctx: Partial<Transaction>) {
  let result: any
  try {
    result = await bobFromRawTx(ctx.transaction)
    if (result.blk) {
      result.blk = {
        i: ctx.block_height || 0,
        t: ctx.block_time || Math.round(new Date().getTime() / 1000),
        m: ctx.merkle_proof || '',
        h: ctx.block_hash || '',
      }
    }

    // TODO: it is possible it doesn't have a timestamp at all if we missed it from mempool
    if (!ctx.block_hash) {
      result.timestamp = ctx.block_time
    }
  } catch (e) {
    console.error('Failed to bob tx', e)
    return null
  }

  try {
    return await saveTx(result)
  } catch (e) {
    console.error('Failed to save tx', e)
    return null
  }
}

const crawler = async (jungleBusClient) => {
  await getDbo() // warm up db connection

  await crawl(currentBlock, jungleBusClient).catch((e) => {
    // do something with error
    console.log('ERROR', e)
  })
}

const setCurrentBlock = (num) => {
  currentBlock = num
}

export { setCurrentBlock, synced, crawler }
