// task.ts
export interface TaskDto {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "scheduled" | "completed";
}