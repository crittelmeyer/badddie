import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('users')
export class UserEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text', unique: true, name: 'google_id' })
  googleId: string

  @Column({ type: 'text', name: 'display_name' })
  displayName: string

  @Column({ type: 'text', unique: true, name: 'email' })
  email: string

  @Column({ type: 'int', name: 'age' })
  age: number
}
