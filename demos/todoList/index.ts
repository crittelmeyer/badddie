import express from 'express'
import { connect } from 'nats'

import initBadddie from '../../src/index'

import userSpec from './domains/authentication/spec'
import { loggerFactory } from './utils'

const logger = loggerFactory.child({ label: 'TodoList Service' })

const authInfo = {
  strategy: 'JWT',
  options: {
    secret: 'your_jwt_secret',
    expiresIn: '1h'
  }
}
const persistenceInfo = {
  type: 'postgres',
  options: {
    host: process.env.TYPEORM_HOST,
    port: process.env.TYPEORM_PORT,
    username: process.env.TYPEORM_USERNAME,
    password: process.env.TYPEORM_PASSWORD,
    database: process.env.TYPEORM_DATABASE,
    entities: [`${__dirname}/domains/**/entities/*.*`]
  }
}

async function bootstrap() {
  logger.info('Starting TodoList')

  const app = express()
  // app.use(cors())

  app.use(express.json())

  const nats = await connect({
    servers: process.env.NATS_HOST,
    user: process.env.NATS_USER_NAME,
    pass: process.env.NATS_PASSWORD
  })

  const badddie = await initBadddie(logger, app, nats, authInfo, persistenceInfo)

  // badddie.setupPrometheus(app)

  logger.info('Initialize TodoList with Badddie')
  badddie.loadDomain(userSpec)

  const port = process.env.API_PORT ?? 8080

  app.listen(port, () => {
    logger.info(`TodoList started and initialized, listening on port ${port}`, { port })
  })
}

bootstrap()
