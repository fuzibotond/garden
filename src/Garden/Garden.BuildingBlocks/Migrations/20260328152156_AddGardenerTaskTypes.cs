using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    public partial class AddGardenerTaskTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_TaskTypes_GardenerId",
                table: "TaskTypes");

            migrationBuilder.DropColumn(
                name: "GardenerId",
                table: "TaskTypes");

            migrationBuilder.CreateTable(
                name: "GardenerTaskTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GardenerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskTypeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GardenerTaskTypes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GardenerTaskTypes_GardenerId_TaskTypeId",
                table: "GardenerTaskTypes",
                columns: new[] { "GardenerId", "TaskTypeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GardenerTaskTypes");

            migrationBuilder.AddColumn<Guid>(
                name: "GardenerId",
                table: "TaskTypes",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_TaskTypes_GardenerId",
                table: "TaskTypes",
                column: "GardenerId");
        }
    }
}
