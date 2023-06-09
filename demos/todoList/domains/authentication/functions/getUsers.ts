import { UserEntity } from '../entities/UserEntity'

import type { DataSource } from 'typeorm'
import type { Logger } from 'winston'

export const getUsers = async (logger: Logger, dataSource: DataSource) => {
  logger.info('Fetching all users')

  // Fetch all users
  const users = await dataSource.getRepository(UserEntity).find()

  console.log('ABCDEF!!!!!', users)
  logger.info(`Fetched ${users.length} users`)

  // Prepare the event
  const event = {
    type: 'UsersFetched',
    data: {
      count: users.length,
      users: users
    }
  }

  // Return the users and event
  return { response: users, events: [event] }
}
