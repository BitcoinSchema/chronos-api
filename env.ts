import chalk from 'chalk'
import prompt from 'prompt-async'

const ensureEnvVars = () => {
  return new Promise<void>(async (resolve, reject) => {
    if (!process.env.CHRONOS_MONGO_URL) {
      prompt.start()
      try {
        chalk.red(
          'Enter MongoDB connection URL: (mongodb://127.0.0.1:27017/chronos)'
        )

        const { CHRONOS_MONGO_URL } = await prompt.get(['CHRONOS_MONGO_URL'])

        process.env.CHRONOS_MONGO_URL = CHRONOS_MONGO_URL.length
          ? CHRONOS_MONGO_URL
          : `mongodb://127.0.0.1:27017/chronos`
      } catch (e) {
        reject('failed to get mongo url')
        return
      }
    }

    resolve()
  })
}

export { ensureEnvVars }
