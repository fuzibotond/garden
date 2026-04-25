using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Garden.BuildingBlocks.Migrations
{
    /// <inheritdoc />
    public partial class AddTaskQuestionsAndAnswers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TaskAnswerMedia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnswerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    MediaType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAnswerMedia", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaskAnswers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AnswerText = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskAnswers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaskQuestionMedia",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MediaUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    MediaType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    UploadedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskQuestionMedia", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TaskQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TaskId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GardenerId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ClientId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false),
                    QuestionType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PredefinedOptions = table.Column<string>(type: "nvarchar(max)", maxLength: 4096, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TaskQuestions", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TaskAnswerMedia_AnswerId",
                table: "TaskAnswerMedia",
                column: "AnswerId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAnswers_ClientId",
                table: "TaskAnswers",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskAnswers_QuestionId",
                table: "TaskAnswers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskQuestionMedia_QuestionId",
                table: "TaskQuestionMedia",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskQuestions_ClientId",
                table: "TaskQuestions",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskQuestions_GardenerId",
                table: "TaskQuestions",
                column: "GardenerId");

            migrationBuilder.CreateIndex(
                name: "IX_TaskQuestions_TaskId",
                table: "TaskQuestions",
                column: "TaskId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TaskAnswerMedia");

            migrationBuilder.DropTable(
                name: "TaskAnswers");

            migrationBuilder.DropTable(
                name: "TaskQuestionMedia");

            migrationBuilder.DropTable(
                name: "TaskQuestions");
        }
    }
}
