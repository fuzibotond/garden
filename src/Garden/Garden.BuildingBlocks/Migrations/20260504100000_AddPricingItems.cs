using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    public partial class AddPricingItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PricingItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GardenerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                    Conditions = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    PriceAmount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PriceUnit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PricingItems", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PricingItems_GardenerId",
                table: "PricingItems",
                column: "GardenerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PricingItems");
        }
    }
}
