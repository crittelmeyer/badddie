import type { ErrorType } from './types'

export class CustomError extends Error {
  type: ErrorType
  statusCode: number
  title: string
  instance: string
  isCustomError: boolean

  constructor(detail: string, type?: ErrorType, statusCode = 400, title?: string, instance = '') {
    super(detail)

    this.type = type || 'UnknownErrorType'
    this.statusCode = statusCode
    this.title = title || detail
    this.instance = instance
    this.isCustomError = true

    Object.setPrototypeOf(this, CustomError.prototype)
  }
}
