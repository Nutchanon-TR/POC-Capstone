import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';

const taskColumns = `
  id,
  title,
  description,
  is_completed AS "isCompleted",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

@Injectable()
export class TasksRepository {
  constructor(private readonly database: DatabaseService) {}

  async create(dto: CreateTaskDto): Promise<Task> {
    // Insert a row with parameterized values.
    const result = await this.database.query<Task>(
      `INSERT INTO tasks (title, description)
       VALUES ($1, $2)
       RETURNING ${taskColumns}`,
      [dto.title, dto.description ?? null],
    );

    return result.rows[0];
  }

  async findAll(): Promise<Task[]> {
    // Return newest tasks first.
    const result = await this.database.query<Task>(
      `SELECT ${taskColumns} FROM tasks ORDER BY id DESC`,
    );

    return result.rows;
  }

  async findById(id: number): Promise<Task | null> {
    const result = await this.database.query<Task>(
      `SELECT ${taskColumns} FROM tasks WHERE id = $1`,
      [id],
    );

    return result.rows[0] ?? null;
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task | null> {
    // Build only known column names; values stay parameterized.
    const updates: string[] = [];
    const values: unknown[] = [];

    if (dto.title !== undefined) {
      values.push(dto.title);
      updates.push(`title = $${values.length}`);
    }

    if (dto.description !== undefined) {
      values.push(dto.description);
      updates.push(`description = $${values.length}`);
    }

    if (dto.isCompleted !== undefined) {
      values.push(dto.isCompleted);
      updates.push(`is_completed = $${values.length}`);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await this.database.query<Task>(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${values.length}
       RETURNING ${taskColumns}`,
      values,
    );

    return result.rows[0] ?? null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.database.query(
      'DELETE FROM tasks WHERE id = $1',
      [id],
    );

    return (result.rowCount ?? 0) > 0;
  }
}
