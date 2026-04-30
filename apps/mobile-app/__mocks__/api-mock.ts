/**
 * Mock API responses for testing
 */

export const mockProfile = {
  id: 'user-123',
  email: 'test@example.com',
  role: 'Client',
  name: 'Test User',
  companyName: 'Test Company',
};

export const mockLoginResponse = {
  accessToken: 'mock-access-token',
  refreshToken: 'mock-refresh-token',
};

export const mockGardenerProfile = {
  id: 'gardener-123',
  email: 'gardener@example.com',
  role: 'Gardener',
  name: 'Test Gardener',
};

export const mockTaskSchedule = {
  scheduleRequestId: 'schedule-123',
  jobId: 'job-123',
  taskName: 'Plant Garden',
  gardenerName: 'John Gardener',
  clientName: 'Jane Client',
  status: 'Pending' as const,
  proposedTimeUtc: '2026-05-01T10:00:00Z',
  approvedTimeUtc: null,
  createdAtUtc: '2026-04-26T10:00:00Z',
};

export const mockClientCalendarResponse = {
  pageIndex: 1,
  pageSize: 100,
  total: 1,
  scheduledTasks: [mockTaskSchedule],
};

export const mockGardenerCalendarResponse = {
  pageIndex: 1,
  pageSize: 100,
  total: 1,
  scheduledTasks: [
    {
      ...mockTaskSchedule,
      status: 'Approved' as const,
    },
  ],
};

export const mockJobDto = {
  jobId: 'job-123',
  name: 'Spring Garden Maintenance',
  clientId: 'client-123',
  client: {
    id: 'client-123',
    name: 'Jane Client',
    email: 'jane@example.com',
  },
  taskCount: 5,
  finishedTaskCount: 2,
  inProgressTaskCount: 1,
  notStartedTaskCount: 2,
  progressPercent: 40,
  isClosed: false,
  createdAt: '2026-04-01T10:00:00Z',
};

export const mockTaskDto = {
  taskId: 'task-123',
  jobId: 'job-123',
  name: 'Plant flowers',
  description: 'Plant colorful flowers in the front garden',
  taskTypeName: 'Planting',
  taskTypeId: 'type-123',
  estimatedTimeMinutes: 120,
  actualTimeMinutes: 90,
  startedAt: '2026-04-26T09:00:00Z',
  finishedAt: '2026-04-26T10:30:00Z',
  totalMaterialCost: 45.99,
  materials: [
    {
      materialId: 'mat-123',
      name: 'Rose seeds',
      amountType: 'package',
      usedQuantity: 2,
      pricePerAmount: 5.99,
    },
  ],
};

export const mockClientDto = {
  clientId: 'client-123',
  fullName: 'Jane Client',
  email: 'jane@example.com',
  createdAt: '2026-01-01T10:00:00Z',
  invitationStatus: 'Accepted',
};
