type BlockHeader = {
  hash: string
  confirmations: number
  version: number
  versionHex: string
  bits: string
  merkleroot: '995f99a739f101036937812d1c3564310184d7a530d23eb918059807f24113f7'
  height: number
  time: number
  mediantime: number
  nonce: number
  difficulty: number
  nTx: number
  num_tx: number
  chainwork: string
  previousblockhash: string
  nextblockhash: string
}

export const fetchBlocklHeaders = async (): Promise<BlockHeader[]> => {
  try {
    const headersResponse = await fetch(
      `https://api.whatsonchain.com/v1/bsv/main/block/headers`
    )
    const headers = await headersResponse.json()
    return headers as BlockHeader[]
  } catch (e) {
    throw e
  }
}
