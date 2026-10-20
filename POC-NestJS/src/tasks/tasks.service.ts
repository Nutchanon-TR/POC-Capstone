import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity';
import { TasksRepository } from './tasks.repository';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  create(dto: CreateTaskDto): Promise<Task> {
    return this.tasksRepository.create(dto);
  }

  findAll(): Promise<Task[]> {
    return this.tasksRepository.findAll();
  }

  async findOne(id: number): Promise<Task> {
    const task = await this.tasksRepository.findById(id);

    if (!task) {
      throw new NotFoundException(`Task ${id} was not found.`);
    }

    return task;
  }

  async update(id: number, dto: UpdateTaskDto): Promise<Task> {
    // Reject an empty PATCH request.
    if (Object.keys(dto).length === 0) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    const task = await this.tasksRepository.update(id, dto);

    if (!task) {
      throw new NotFoundException(`Task ${id} was not found.`);
    }

    return task;
  }

  async remove(id: number): Promise<void> {
    const wasDeleted = await this.tasksRepository.delete(id);

    if (!wasDeleted) {
      throw new NotFoundException(`Task ${id} was not found.`);
    }
  }
}
