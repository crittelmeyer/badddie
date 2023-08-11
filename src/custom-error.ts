import { ErrorType } from 'types'

export class CustomError extends Error {
  statusCode: number
  type: string
  detail: string
  isCustomError: boolean

  constructor(message: string, type?: ErrorType, statusCode = 400, detail?: string) {
    super(message)
    this.type = type || 'DefaultErrorType'
    this.statusCode = statusCode
    this.detail = detail || message
    this.isCustomError = true
    Object.setPrototypeOf(this, CustomError.prototype)
  }
}
