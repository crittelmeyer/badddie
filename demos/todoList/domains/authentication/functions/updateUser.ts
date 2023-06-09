import { UserEntity } from '../entities/UserEntity'

import type { Logger } from 'winston'

export const updateUser = async (
  logger: Logger,
  payload: { userId: string; displayName: string; birthDate: string },
  services: any
) => {
  const { userId, displayName, birthDate } = payload

  // Fetch the user from the database
  const user = await UserEntity.findOne({ where: { id: userId } })

  if (!user) {
    throw new Error(`User with ID: ${userId} not found`)
  }

  logger.info(`Updating user with ID: ${userId}`)

  // Use calculateAge service to determine age from birthdate
  const age = services.calculateAge(birthDate)

  // Update user entity
  user.displayName = displayName
  user.age = age

  // Save updated user to database
  await user.save()

  logger.info(`User with ID: ${userId} was successfully updated`)

  // Return the updated user and events
  return { response: user, events: [{ type: 'UserUpdated', data: user }] }
}
