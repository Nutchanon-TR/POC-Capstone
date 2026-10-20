import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTaskDto {
  // Required task title.
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  // Optional task detail.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
