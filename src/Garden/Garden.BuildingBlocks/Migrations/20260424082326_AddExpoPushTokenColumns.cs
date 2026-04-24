using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    public partial class AddExpoPushTokenColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "Status",
                table: "TaskScheduleRequests",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "ExpoPushToken",
                table: "Gardeners",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExpoPushToken",
                table: "Clients",
                type: "nvarchar(256)",
                maxLength: 256,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ExpoPushToken",
                table: "Gardeners");

            migrationBuilder.DropColumn(
                name: "ExpoPushToken",
                table: "Clients");

            migrationBuilder.AlterColumn<int>(
                name: "Status",
                table: "TaskScheduleRequests",
                type: "int",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");
        }
    }
}
