import { DataSource } from 'typeorm'

export const datasource = new DataSource({
  type: 'postgres',
  host: process.env.TYPEORM_HOST,
  port: +process.env.TYPEORM_PORT!,
  username: process.env.TYPEORM_USERNAME,
  password: process.env.TYPEORM_PASSWORD,
  database: process.env.TYPEORM_DATABASE,
  schema: process.env.TYPEORM_SCHEMA,
  entities: ['dist/src/**/entities/**/*.js'],
  migrations: ['dist/migrations/**/*.js']
})
