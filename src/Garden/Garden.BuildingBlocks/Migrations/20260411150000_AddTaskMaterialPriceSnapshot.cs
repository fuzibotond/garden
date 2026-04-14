using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(GardenDbContext))]
    [Migration("20260411150000_AddTaskMaterialPriceSnapshot")]
    public partial class AddTaskMaterialPriceSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SnapshotName",
                table: "TaskMaterials",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SnapshotAmountType",
                table: "TaskMaterials",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "SnapshotPricePerAmount",
                table: "TaskMaterials",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            // Backfill snapshot values for existing rows from current material data
            migrationBuilder.Sql(@"
                UPDATE tm
                SET tm.SnapshotName = m.Name,
                    tm.SnapshotAmountType = m.AmountType,
                    tm.SnapshotPricePerAmount = m.PricePerAmount
                FROM TaskMaterials tm
                INNER JOIN Materials m ON m.Id = tm.MaterialId
                WHERE tm.SnapshotPricePerAmount IS NULL
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SnapshotName",
                table: "TaskMaterials");

            migrationBuilder.DropColumn(
                name: "SnapshotAmountType",
                table: "TaskMaterials");

            migrationBuilder.DropColumn(
                name: "SnapshotPricePerAmount",
                table: "TaskMaterials");
        }
    }
}
