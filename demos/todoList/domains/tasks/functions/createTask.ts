import { getRepository } from 'typeorm'

import { TaskEntity } from '../entities/TaskEntity'

import type { UserEntity } from '../../authentication/entities/UserEntity'

interface TaskDetails {
  title: string
  user: UserEntity
}

export const createTask = async (taskDetails: TaskDetails): Promise<TaskEntity> => {
  const taskRepository = getRepository(TaskEntity)

  // create a new task
  const newTask = new TaskEntity()

  newTask.title = taskDetails.title
  newTask.user = taskDetails.user
  newTask.isDone = false

  // save the task
  return await taskRepository.save(newTask)
}
