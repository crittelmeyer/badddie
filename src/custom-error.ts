import type { ErrorTypeName } from './types'

const ERROR_TYPES = {
  NotFound: {
    statusCode: 404,
    title: 'Not found'
  },
  BadRequest: { statusCode: 400, title: 'Bad Request' },
  Unauthorized: { statusCode: 401, title: 'Unauthorized' },
  Forbidden: { statusCode: 403, title: 'Forbidden' },
  InternalServerError: { statusCode: 500, title: 'Internal Server Error' },
  Conflict: { statusCode: 409, title: 'Conflict' },
  TooManyRequests: { statusCode: 429, title: 'Too Many Requests' },
  NotImplemented: { statusCode: 501, title: 'Not Implemented' },
  ServiceUnavailable: { statusCode: 503, title: 'Service Unavailable' },
  GatewayTimeout: { statusCode: 504, title: 'Gateway Timeout' },
  UnknownErrorType: { statusCode: -1, title: 'Unknown Error Type' }
}

export class CustomError extends Error {
  type: ErrorTypeName
  statusCode: number
  title: string
  instance: string
  isCustomError: boolean

  constructor(detail: string, type?: ErrorTypeName, title?: string, instance = '', statusCode?: number) {
    super(detail)

    this.type = type || 'UnknownErrorType'
    this.title = title || ERROR_TYPES[this.type].title
    this.instance = instance
    this.statusCode = statusCode || ERROR_TYPES[this.type].statusCode
    this.isCustomError = true

    Object.setPrototypeOf(this, CustomError.prototype)
  }
}
