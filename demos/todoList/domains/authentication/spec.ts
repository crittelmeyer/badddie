import { calculateAge } from './services/calculateAge'
import { createUser, getUser, getUsers, updateUser } from './functions'

export default {
  name: 'user',
  commands: [
    {
      function: createUser,
      apiUrl: '/users/create',
      eventsEmitted: ['UserCreated'],
      services: { calculateAge }
    },
    {
      function: updateUser,
      apiUrl: '/users/update',
      eventsEmitted: ['UserUpdated'],
      services: { calculateAge }
    }
  ],
  queries: [
    {
      function: getUsers,
      apiUrl: '/users'
    },
    {
      function: getUser,
      apiUrl: '/users/:id'
    }
  ]
}
