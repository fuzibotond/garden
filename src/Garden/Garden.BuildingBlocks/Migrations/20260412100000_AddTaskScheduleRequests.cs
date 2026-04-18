using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskScheduleRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaskScheduleRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GardenerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ScheduledAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ProposedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ApprovedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeclinedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskScheduleRequests", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskScheduleRequests_ClientId",
                table: "TaskScheduleRequests",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskScheduleRequests_GardenerId",
                table: "TaskScheduleRequests",
                column: "GardenerId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskScheduleRequests_Status",
                table: "TaskScheduleRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_TaskScheduleRequests_TaskId_ClientId",
                table: "TaskScheduleRequests",
                columns: new[] { "TaskId", "ClientId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskScheduleRequests");
        }
    }
}
