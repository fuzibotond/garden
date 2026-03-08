// job.ts
export interface JobDto {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
  taskIds: string[];
}