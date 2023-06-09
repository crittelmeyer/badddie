import { Table } from "typeorm";

import type { MigrationInterface, QueryRunner} from "typeorm";

export class CreateUsersAndTasksTables1623168620867 implements MigrationInterface {
    
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
        await queryRunner.createTable(new Table({
            name: "users",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "google_id",
                    type: "text",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "display_name",
                    type: "text",
                    isNullable: false
                },
                {
                    name: "email",
                    type: "text",
                    isUnique: true,
                    isNullable: false
                },
                {
                    name: "age",
                    type: "int"
                }
            ]
        }), true);

        await queryRunner.createTable(new Table({
            name: "tasks",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "user_id",
                    type: "uuid",
                    isNullable: false
                },
                {
                    name: "title",
                    type: "text",
                    isNullable: false
                },
                {
                    name: "is_done",
                    type: "boolean",
                    isNullable: false,
                    default: false
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    isNullable: false,
                    default: "now()"
                }
            ],
            foreignKeys: [
                {
                    columnNames: ["user_id"],
                    referencedColumnNames: ["id"],
                    referencedTableName: "users",
                    onDelete: "CASCADE"
                }
            ]
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("tasks");
        await queryRunner.dropTable("users");
    }
}
