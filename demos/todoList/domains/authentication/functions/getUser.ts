import { UserEntity } from '../entities/UserEntity'

import type { DataSource } from 'typeorm'
import type { Logger } from 'winston'

export const getUser = async (logger: Logger, dataSource: DataSource, payload: { userId: string }) => {
  logger.info(`Fetching user with id: ${payload.userId}`)

  // Fetch user
  const user = await dataSource.getRepository(UserEntity).findOneBy({ id: payload.userId })

  if (!user) {
    throw new Error('User not found')
  }

  logger.info(`User with id: ${payload.userId} was successfully fetched`)

  // Prepare the event
  const event = {
    type: 'UserFetched',
    data: user
  }

  // Return the user and event
  return { response: user, events: [event] }
}
