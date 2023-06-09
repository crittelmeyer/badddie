import type { DataSource } from 'typeorm'
import type { Logger } from 'winston'

export type Func = {
  function: (logger: Logger, dataSource: DataSource, payload: any, services: any) => { response: any; events?: Event[] }
  apiUrl?: string
  eventsEmitted?: string[]
  services?: (...args: any[]) => any
}

export type Command = Func
export type Query = Func

export type Domain = {
  name: string
  commands: Command[]
  queries: Query[]
}
