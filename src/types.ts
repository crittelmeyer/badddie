import type { DataSource } from 'typeorm'
import type { Logger } from 'winston'

export type PublishedEvent = {
  type: string
  data: any
}

export type Func = {
  function: (
    logger: Logger,
    dataSource: DataSource,
    payload: any,
    services: any
  ) => { response: any; events?: PublishedEvent[] }
  apiUrl?: string
  eventsEmitted?: string[]
  services?: (...args: any[]) => any
  triggers: string[]
}

export type Command = Func
export type Query = Func

export type Domain = {
  name: string
  commands: Command[]
  queries: Query[]
}

export type ErrorTypeName =
  | 'NotFound'
  | 'BadRequest'
  | 'Unauthorized'
  | 'Forbidden'
  | 'InternalServerError'
  | 'Conflict'
  | 'TooManyRequests'
  | 'NotImplemented'
  | 'ServiceUnavailable'
  | 'GatewayTimeout'
  | 'UnknownErrorType'

export type ErrorType = Record<
  ErrorTypeName,
  {
    statusCode: number
    title: string
  }
>
