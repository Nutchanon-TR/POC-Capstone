export interface Task {
  id: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}
