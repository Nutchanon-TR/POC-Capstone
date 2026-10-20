import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTaskDto {
  // Optional replacement title.
  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  // Optional replacement detail.
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // Optional completion state.
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;
}
