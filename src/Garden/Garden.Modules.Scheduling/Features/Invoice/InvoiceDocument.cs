using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using System.Globalization;

namespace Garden.Modules.Scheduling.Features.Invoice;

public class InvoiceDocument : IDocument
{
    private readonly InvoiceData _data;
    private static readonly CultureInfo DkkCulture = new("da-DK");

    public InvoiceDocument(InvoiceData data)
    {
        _data = data;
    }

    private static string Dkk(decimal value) => value.ToString("C2", DkkCulture);

    public DocumentMetadata GetMetadata() => DocumentMetadata.Default;
    public DocumentSettings GetSettings() => DocumentSettings.Default;

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(40);
            page.DefaultTextStyle(x => x.FontSize(10).FontFamily(Fonts.Calibri));

            page.Header().Element(ComposeHeader);
            page.Content().PaddingTop(20).Element(ComposeContent);
            page.Footer().AlignCenter().Text(x =>
            {
                x.CurrentPageNumber();
                x.Span(" / ");
                x.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("INVOICE").FontSize(26).Bold();
                col.Item().Text($"#{_data.InvoiceNumber}").FontSize(12).FontColor(Colors.Grey.Darken1);
                col.Item().Text($"Date: {_data.IssuedAt:dd MMMM yyyy}").FontSize(10);
            });
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.Column(col =>
        {
            col.Spacing(16);
            col.Item().Element(ComposeParties);
            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            col.Item().Element(ComposeTasks);
            col.Item().Element(ComposeTotals);
        });
    }

    private void ComposeParties(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(col =>
            {
                col.Item().Text("FROM").FontSize(8).Bold().FontColor(Colors.Grey.Medium);
                col.Item().PaddingTop(4);
                foreach (var gardener in _data.Gardeners)
                {
                    col.Item().Text(gardener.Name).Bold();
                    col.Item().Text(gardener.Email).FontColor(Colors.Grey.Darken1);
                }
            });

            row.ConstantItem(30);

            row.RelativeItem().Column(col =>
            {
                col.Item().Text("TO").FontSize(8).Bold().FontColor(Colors.Grey.Medium);
                col.Item().PaddingTop(4);
                col.Item().Text(_data.Client.Name).Bold();
                col.Item().Text(_data.Client.Email).FontColor(Colors.Grey.Darken1);
            });
        });
    }

    private void ComposeTasks(IContainer container)
    {
        container.Column(col =>
        {
            col.Item().Text($"Job: {_data.JobName}").FontSize(12).Bold();
            col.Item().PaddingTop(8).Table(table =>
            {
                table.ColumnsDefinition(cols =>
                {
                    cols.RelativeColumn(3);   // Task name
                    cols.RelativeColumn(1);   // Time
                    cols.RelativeColumn(1);   // Wage/h
                    cols.RelativeColumn(1);   // Labor
                    cols.RelativeColumn(1);   // Materials
                    cols.RelativeColumn(1);   // Total
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCell).Text("Task");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Time (h)");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Wage/h");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Labor");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Materials");
                    header.Cell().Element(HeaderCell).AlignRight().Text("Total");
                });

                foreach (var task in _data.Tasks)
                {
                    var hours = task.ActualTimeMinutes.HasValue
                        ? $"{task.ActualTimeMinutes.Value / 60m:F2}"
                        : "-";

                    table.Cell().Element(DataCell).Column(c =>
                    {
                        c.Item().Text(task.Name);
                        foreach (var mat in task.Materials)
                        {
                            c.Item().Text($"  • {mat.Name}: {mat.UsedQuantity} {mat.AmountType} × {Dkk(mat.PricePerAmount)}")
                                .FontSize(8).FontColor(Colors.Grey.Medium);
                        }
                    });
                    table.Cell().Element(DataCell).AlignRight().Text(hours);
                    table.Cell().Element(DataCell).AlignRight()
                        .Text(task.WagePerHour.HasValue ? Dkk(task.WagePerHour.Value) : "-");
                    table.Cell().Element(DataCell).AlignRight().Text(Dkk(task.LaborCost));
                    table.Cell().Element(DataCell).AlignRight().Text(Dkk(task.MaterialCost));
                    table.Cell().Element(DataCell).AlignRight().Text(Dkk(task.TotalCost));
                }
            });
        });
    }

    private void ComposeTotals(IContainer container)
    {
        container.AlignRight().Column(col =>
        {
            col.Spacing(4);
            col.Item().Row(row =>
            {
                row.ConstantItem(140).AlignRight().Text("Total Labor:");
                row.ConstantItem(80).AlignRight().Text(Dkk(_data.TotalLaborCost));
            });
            col.Item().Row(row =>
            {
                row.ConstantItem(140).AlignRight().Text("Total Materials:");
                row.ConstantItem(80).AlignRight().Text(Dkk(_data.TotalMaterialCost));
            });
            col.Item().LineHorizontal(1).LineColor(Colors.Grey.Lighten2);
            col.Item().Row(row =>
            {
                row.ConstantItem(140).AlignRight().Text("TOTAL:").Bold().FontSize(12);
                row.ConstantItem(80).AlignRight().Text(Dkk(_data.TotalCost)).Bold().FontSize(12);
            });
        });
    }

    private static IContainer HeaderCell(IContainer container) =>
        container.Padding(5).Background(Colors.Grey.Lighten3).BorderBottom(1).BorderColor(Colors.Grey.Lighten1);

    private static IContainer DataCell(IContainer container) =>
        container.Padding(5).BorderBottom(1).BorderColor(Colors.Grey.Lighten3);
}
