import { UserEntity } from '../entities/UserEntity'

import type { DataSource } from 'typeorm'
import type { Logger } from 'winston'

export const createUser = async (
  logger: Logger,
  dataSource: DataSource,
  payload: { displayName: string; googleId: string; email: string; birthDate: string },
  services: any
) => {
  logger.info(`Creating a new user with email: ${payload.email}`)

  const { displayName, googleId, email, birthDate } = payload

  // Check if user already exists
  const existingUser = await dataSource.getRepository(UserEntity).findOne({ where: { email } })

  if (existingUser) {
    throw new Error('User already exists')
  }

  // Use calculateAge service to determine age from birthdate
  const age = services.calculateAge(birthDate)

  // Create new user entity
  const user = new UserEntity()

  user.displayName = displayName
  user.googleId = googleId
  user.email = email
  user.age = age

  // Save user to database
  await user.save()

  logger.info(`User with email: ${email} was successfully created`)

  // Return the new user and events
  return { response: user, events: [{ type: 'UserCreated', data: user }] }
}
