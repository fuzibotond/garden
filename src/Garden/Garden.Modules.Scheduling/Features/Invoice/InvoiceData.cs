namespace Garden.Modules.Scheduling.Features.Invoice;

public record InvoiceData
{
    public string InvoiceNumber { get; init; } = default!;
    public DateTime IssuedAt { get; init; }
    public string JobName { get; init; } = default!;
    public InvoicePartyInfo Client { get; init; } = default!;
    public List<InvoicePartyInfo> Gardeners { get; init; } = [];
    public List<InvoiceTaskLine> Tasks { get; init; } = [];
    public decimal TotalLaborCost { get; init; }
    public decimal TotalMaterialCost { get; init; }
    public decimal TotalCost => TotalLaborCost + TotalMaterialCost;
}

public record InvoicePartyInfo
{
    public string Name { get; init; } = default!;
    public string Email { get; init; } = default!;
}

public record InvoiceTaskLine
{
    public string Name { get; init; } = default!;
    public int? ActualTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public decimal LaborCost { get; init; }
    public decimal MaterialCost { get; init; }
    public decimal TotalCost => LaborCost + MaterialCost;
    public List<InvoiceMaterialLine> Materials { get; init; } = [];
}

public record InvoiceMaterialLine
{
    public string Name { get; init; } = default!;
    public string AmountType { get; init; } = default!;
    public decimal UsedQuantity { get; init; }
    public decimal PricePerAmount { get; init; }
    public decimal TotalCost => UsedQuantity * PricePerAmount;
}
