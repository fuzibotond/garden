using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;

namespace Garden.Modules.Scheduling.Features.Invoice;

public class GetInvoiceHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetInvoiceHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<(byte[] Pdf, string FileName)> Handle(Guid jobId)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
            throw new KeyNotFoundException($"Job {jobId} not found.");

        if (!job.ClosedAtUtc.HasValue || string.IsNullOrEmpty(job.InvoiceNumber))
            throw new InvalidOperationException("Invoice is only available for closed jobs.");

        var isAdmin = _currentUser.Roles.Contains("Admin");
        var isClient = _currentUser.Roles.Contains("Client");
        var currentUserId = _currentUser.UserId.Value;

        if (!isAdmin)
        {
            if (isClient)
            {
                if (job.ClientId != currentUserId)
                    throw new UnauthorizedAccessException("You do not have access to this invoice.");
            }
            else
            {
                var isAssigned = await _dbContext.JobGardeners
                    .AnyAsync(jg => jg.JobId == jobId && jg.GardenerId == currentUserId);

                if (!isAssigned)
                    throw new UnauthorizedAccessException("You do not have access to this invoice.");
            }
        }

        var client = await _dbContext.Clients.FindAsync(job.ClientId);

        var gardeners = await _dbContext.JobGardeners
            .Where(jg => jg.JobId == jobId)
            .Join(_dbContext.Gardeners, jg => jg.GardenerId, g => g.Id, (jg, g) => g)
            .ToListAsync();

        var tasks = await _dbContext.Tasks
            .Where(t => t.JobId == jobId)
            .OrderBy(t => t.CreatedAtUtc)
            .ToListAsync();

        var taskIds = tasks.Select(t => t.Id).ToList();
        var allTaskMaterials = await _dbContext.TaskMaterials
            .Where(tm => taskIds.Contains(tm.TaskId))
            .ToListAsync();

        var taskLines = tasks.Select(t =>
        {
            var materials = allTaskMaterials
                .Where(tm => tm.TaskId == t.Id)
                .Select(tm => new InvoiceMaterialLine
                {
                    Name = tm.SnapshotName ?? string.Empty,
                    AmountType = tm.SnapshotAmountType ?? string.Empty,
                    UsedQuantity = tm.UsedQuantity,
                    PricePerAmount = tm.SnapshotPricePerAmount ?? 0m
                })
                .ToList();

            var materialCost = materials.Sum(m => m.TotalCost);
            var laborCost = ((t.ActualTimeMinutes ?? 0) / 60m) * (t.WagePerHour ?? 0m);

            return new InvoiceTaskLine
            {
                Name = t.Name,
                ActualTimeMinutes = t.ActualTimeMinutes,
                WagePerHour = t.WagePerHour,
                LaborCost = laborCost,
                MaterialCost = materialCost,
                Materials = materials
            };
        }).ToList();

        var invoiceData = new InvoiceData
        {
            InvoiceNumber = job.InvoiceNumber,
            IssuedAt = job.ClosedAtUtc.Value,
            JobName = job.Name,
            Client = new InvoicePartyInfo
            {
                Name = client?.Name ?? "Unknown",
                Email = client?.Email ?? string.Empty
            },
            Gardeners = gardeners
                .Select(g => new InvoicePartyInfo
                {
                    Name = g.Name ?? g.CompanyName,
                    Email = g.Email
                })
                .ToList(),
            Tasks = taskLines,
            TotalLaborCost = taskLines.Sum(t => t.LaborCost),
            TotalMaterialCost = taskLines.Sum(t => t.MaterialCost)
        };

        var pdf = new InvoiceDocument(invoiceData).GeneratePdf();
        return (pdf, $"{job.InvoiceNumber}.pdf");
    }
}
