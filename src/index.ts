import { DataSource } from 'typeorm'

import type { Express, Request, Response } from 'express'
import type { JetStreamManager, NatsConnection } from 'nats'
import type { Logger } from 'winston'
import type { Command, Func, Query } from './types'

type Method = 'post' | 'get'

let dataSource: DataSource

export const getDataSource = () => dataSource

const registerFunction = (
  logger: Logger,
  app: Express,
  natsConnection: NatsConnection,
  channelPrefix: string,
  fn: Func,
  method: Method
) => {
  // register routes
  if (fn.apiUrl) {
    logger.info(`Registering URL: ${fn.apiUrl}`)
    app[method](fn.apiUrl, async function (req: Request, res: Response) {
      const payload = req.body

      console.log('REMOVE ME: here is the request', payload)

      const { response, events } = await fn.function(logger, dataSource, payload, fn.services)

      // publish events to nats
      if (natsConnection) {
        // create a jetstream client:
        const js = natsConnection.jetstream()

        fn.eventsEmitted?.forEach(async (eventEmitted: string) => {
          // publish message
          const pa = await js.publish(`${channelPrefix}.${eventEmitted}`)

          logger.info(`Published to ${channelPrefix}.${eventEmitted}: ${pa.stream}, ${pa.seq}, ${pa.duplicate}`)
        })
      }
      console.log('REMOVE ME: here are the events', events)

      res.json(response)
    })
  }
}

const badddie = async (
  logger: Logger,
  app: Express,
  natsConnection: NatsConnection,
  authInfo: any,
  persistenceInfo: any
) => {
  console.log(authInfo, persistenceInfo)

  dataSource = new DataSource({
    type: persistenceInfo.type,
    host: persistenceInfo.options.host,
    port: persistenceInfo.options.port,
    username: persistenceInfo.options.username,
    password: persistenceInfo.options.password,
    database: persistenceInfo.options.database,
    entities: persistenceInfo.options.entities,
    logging: false,
    synchronize: true
  })

  // establish database connection
  dataSource
    .initialize()
    .then(() => {
      console.log('Data Source has been initialized!')
    })
    .catch((err: any) => {
      console.error('Error during Data Source initialization:', err)
    })

  let jetStreamManager: JetStreamManager

  if (natsConnection) {
    jetStreamManager = await natsConnection.jetstreamManager()
  }

  return {
    loadDomain: async (domain: any) => {
      if (natsConnection) {
        await jetStreamManager.streams.add({
          name: domain.name,
          subjects: [`${domain.name}.commands.*`, `${domain.name}.queries.*`]
        })
      }

      domain.commands.forEach(async (command: Command) => {
        registerFunction(logger, app, natsConnection, `${domain.name}.commands`, command, 'post')
      })
      domain.queries.forEach(async (query: Query) => {
        registerFunction(logger, app, natsConnection, `${domain.name}.queries`, query, 'get')
      })
    }
  }
}

export default badddie
