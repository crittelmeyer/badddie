import { JSONCodec } from 'nats'
import { DataSource } from 'typeorm'

import { CustomError } from './custom-error'

import type { Express, Request, Response } from 'express'
import type { JetStreamManager, NatsConnection, Subscription } from 'nats'
import type { Logger } from 'winston'
import type { Command, ErrorTypeName, Func, PublishedEvent, Query } from './types'

export { CustomError } from './custom-error'

type Method = 'post' | 'get'

type ProblemDetailsError = {
  type: ErrorTypeName
  title: string
  status: number
  detail: string
  instance: string
}

let dataSource: DataSource

export const getDataSource = () => dataSource

const jc = JSONCodec()

const formatError = (error: any): ProblemDetailsError => {
  // See https://codeopinion.com/problem-details-for-better-rest-http-api-errors/

  if (error instanceof CustomError || error.isCustomError) {
    return {
      type: error.type,
      title: error.title,
      status: error.statusCode,
      detail: error.message,
      instance: error.instance
    }
  }

  return {
    type: 'InternalServerError',
    status: 500,
    title: 'An unknown error occurred',
    detail: error.toString().trim(),
    instance: error.toString().trim()
  }
}

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
      const payload = {
        ...req.body,
        ...req.params
      }

      let response
      let events: any
      let status = 200

      try {
        const result = await fn.function(logger, dataSource, payload, fn.services)

        response = result.response
        events = result.events

        // publish events to nats
        if (natsConnection) {
          // create a jetstream client:
          const js = natsConnection.jetstream()

          let hasAllDeclaredEvents = true

          fn.eventsEmitted?.forEach(async (eventEmitted: string) => {
            if (!events?.map((evt: any) => evt.type).includes(eventEmitted)) {
              hasAllDeclaredEvents = false
            }
          })

          if (!hasAllDeclaredEvents) {
            logger.info(
              `There are events declared in the spec file for the ${fn.apiUrl} endpoint that are not being returned by the function. This won't necessarily break anything, but spec files are meant to be an at-a-glance location for understanding a domain at a high level, and side effects are an important part of this understanding.`
            )
          }

          events?.forEach(async (evt: PublishedEvent) => {
            // publish message
            await js.publish(`${channelPrefix}.${evt.type}`, jc.encode(evt.data))

            logger.info(`Published to ${channelPrefix}.${evt.type}: ${JSON.stringify(evt.data)}`)
          })
        }
      } catch (err: any) {
        response = formatError(err)
        status = response.status
      }

      res.status(status).json(response)
    })
  }

  // register side effects
  if (fn.triggers && natsConnection) {
    fn.triggers.forEach((trigger: string) => {
      logger.info(`Registering side effect: ${trigger}`)

      const subscription = natsConnection.subscribe(`${channelPrefix}.${trigger}`)

      const executeSideEffect = async (sub: Subscription) => {
        for await (const message of sub) {
          logger.info(`Triggering side effect: ${message.subject}`)
          fn.function(logger, dataSource, jc.decode(message.data), fn.services)
        }
      }

      executeSideEffect(subscription)
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
  console.log(`TODO: do something with this: ${JSON.stringify(authInfo)}`)

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
      logger.info('Data source has been initialized')
    })
    .catch((err: any) => {
      console.error('Error during data source initialization:', err)
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
