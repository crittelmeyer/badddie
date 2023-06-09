import Winston from 'winston'

const { combine, timestamp } = Winston.format

export const logFormat = combine(timestamp(), Winston.format.json())

export const logTransports = [new Winston.transports.Console()]

export const loggerFactory = Winston.createLogger({
  format: logFormat,
  transports: logTransports,
  exitOnError: false
})
