/* eslint-disable sonarjs/no-identical-functions */
import { PubSub } from '@google-cloud/pubsub'
import { connect, JSONCodec } from 'nats'
import { DataSource } from 'typeorm'

import { CustomError } from './custom-error'

import type { Express, Request, Response } from 'express'
import type { NatsConnection, Subscription } from 'nats'
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

type PubSubType = {
  type: 'nats' | 'google'
  options: any
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

const registerFunctionWithNats = (
  logger: Logger,
  app: Express,
  natsConnection: NatsConnection,
  channelPrefix: string,
  fn: Func,
  method: Method
) => { // eslint-disable-line
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

      const subscription = natsConnection.subscribe(trigger.indexOf('.') > -1 ? trigger : `${channelPrefix}.${trigger}`)

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
const registerFunctionWithGoogle = (
  logger: Logger,
  app: Express,
  pubSub: any,
  channelPrefix: string,
  fn: Func,
  method: Method,
  topics: any
) => { // eslint-disable-line

  // create topics
  fn.eventsEmitted?.forEach(async (eventEmitted: string) => {
    let exists = false

    topics.forEach((topic: any) => {
      if (topic.name === `projects/one-on-one-spot/topics/${channelPrefix}.${eventEmitted}`) {
        exists = true
      }
    })

    if (!exists) {
      const [topic] = await pubSub.createTopic(`${channelPrefix}.${eventEmitted}`)

      console.log(`Topic ${topic.name} created.`)
    }
  })

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

        // publish events to google pubsub
        if (pubSub) {
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

          events?.forEach((evt: PublishedEvent) => {
            // publish message
            const topic = pubSub.topic(`${channelPrefix}.${evt.type}`)

            topic.publishMessage({ data: Buffer.from(JSON.stringify(evt.data)) })

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
  if (fn.triggers && pubSub) {
    fn.triggers.forEach(async (trigger: string) => {
      logger.info(`Registering side effect: ${trigger}`)

      let exists = false
      let topic

      topics.forEach((currentTopic: any) => {
        if (currentTopic.name === `projects/one-on-one-spot/topics/${trigger}`) {
          exists = true
          topic = currentTopic
        }
      })

      if (!exists) {
        topic = pubSub.topic(trigger.indexOf('.') > -1 ? trigger : `${channelPrefix}.${trigger}`)
      }

      const [subscriptions] = await topic.getSubscriptions()

      let subscriptionExists = false
      let subscription

      subscriptions.forEach(async (currentSubscription: any) => {
        if (currentSubscription.name === `projects/one-on-one-spot/subscriptions/${trigger}`) {
          subscriptionExists = true
          subscription = currentSubscription
        }
      })

      if (!subscriptionExists) {
        const newSubscriptions = await topic.createSubscription(trigger)

        subscription = newSubscriptions[0]
      }

      subscription.on('message', (message: any) => {
        logger.info(`Triggering side effect: ${message.subject}`)
        fn.function(logger, dataSource, message.data.toString(), fn.services)
      })
    })
  }
}

const badddie = async (logger: Logger, app: Express, pubSubType: PubSubType, authInfo: any, persistenceInfo: any) => {
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

  if (pubSubType.type === 'nats') {
    const nats = await connect({
      servers: pubSubType.options.server,
      user: pubSubType.options.userName,
      pass: pubSubType.options.password
    })

    const jetStreamManager = await nats.jetstreamManager()

    return {
      loadDomain: async (domain: any) => {
        if (nats) {
          await jetStreamManager.streams.add({
            name: domain.name,
            subjects: [`${domain.name}.commands.*`, `${domain.name}.queries.*`]
          })
        }
        domain.commands.forEach(async (command: Command) => {
          registerFunctionWithNats(logger, app, nats, `${domain.name}.commands`, command, 'post')
        })
        domain.queries.forEach(async (query: Query) => {
          registerFunctionWithNats(logger, app, nats, `${domain.name}.queries`, query, 'get')
        })
      }
    }
  } else if (pubSubType.type === 'google') {
    const pubSub = new PubSub({ projectId: pubSubType.options.projectId })
    const [topics] = await pubSub.getTopics()

    return {
      loadDomain: async (domain: any) => {
        domain.commands.forEach(async (command: Command) => {
          registerFunctionWithGoogle(logger, app, pubSub, `${domain.name}.commands`, command, 'post', topics)
        })
        domain.queries.forEach(async (query: Query) => {
          registerFunctionWithGoogle(logger, app, pubSub, `${domain.name}.queries`, query, 'get', topics)
        })
      }
    }
  } else {
    throw new Error(`Unsupported pub/sub type: ${pubSubType}`)
  }
}

export default badddie
