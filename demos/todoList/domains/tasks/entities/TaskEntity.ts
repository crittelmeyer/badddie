import { BaseEntity, Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'

import { UserEntity } from '../../authentication/entities/UserEntity'

@Entity('tasks')
export class TaskEntity extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  title: string

  @Column({ type: 'boolean', default: false })
  isDone: boolean

  @CreateDateColumn()
  createdAt: Date

  @ManyToOne(() => UserEntity, (user: any) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: UserEntity
}
