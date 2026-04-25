using FluentAssertions;
using Garden.Api.Tests.TestHelpers;
using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Tasks.Features.Questions;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace Garden.Api.Tests.Tasks.Questions;

public class QuestionHandlersTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task CreateQuestion_Should_Create_Record_And_Publish_Event()
    {
        var context = CreateContext($"{nameof(CreateQuestion_Should_Create_Record_And_Publish_Event)}-{Guid.NewGuid()}");
        var eventPublisher = new Mock<IEventPublisher>();

        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Job",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.Tasks.Add(new TaskRecord
        {
            Id = taskId,
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Task",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { UserId = gardenerId, IsAuthenticated = true };
        var handler = new CreateQuestionHandler(context, currentUser, eventPublisher.Object);

        var request = new CreateQuestionRequest
        {
            TaskId = taskId,
            QuestionText = "Which color?",
            QuestionType = QuestionType.MultipleChoice,
            PredefinedOptions = ["Red", "Blue"]
        };

        var response = await handler.Handle(request);

        response.TaskId.Should().Be(taskId);
        response.QuestionText.Should().Be("Which color?");
        response.PredefinedOptions.Should().BeEquivalentTo(["Red", "Blue"]);

        var stored = await context.TaskQuestions.SingleAsync();
        stored.TaskId.Should().Be(taskId);
        stored.GardenerId.Should().Be(gardenerId);
        stored.ClientId.Should().Be(clientId);

        eventPublisher.Verify(x => x.PublishAsync(
            It.Is<TaskQuestionCreatedEvent>(e =>
                e.QuestionId == response.QuestionId &&
                e.TaskId == taskId &&
                e.GardenerId == gardenerId &&
                e.ClientId == clientId &&
                e.QuestionText == "Which color?"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CreateQuestion_Should_Throw_When_MultipleChoice_Has_No_Options()
    {
        var context = CreateContext($"{nameof(CreateQuestion_Should_Throw_When_MultipleChoice_Has_No_Options)}-{Guid.NewGuid()}");
        var eventPublisher = new Mock<IEventPublisher>();

        var gardenerId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Job",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.Tasks.Add(new TaskRecord
        {
            Id = taskId,
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Task",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { UserId = gardenerId, IsAuthenticated = true };
        var handler = new CreateQuestionHandler(context, currentUser, eventPublisher.Object);

        var request = new CreateQuestionRequest
        {
            TaskId = taskId,
            QuestionText = "Choose one",
            QuestionType = QuestionType.MultipleChoice,
            PredefinedOptions = null
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(request));
    }

    [Fact]
    public async Task CreateAnswer_Should_Create_Record_And_Publish_Event()
    {
        var context = CreateContext($"{nameof(CreateAnswer_Should_Create_Record_And_Publish_Event)}-{Guid.NewGuid()}");
        var eventPublisher = new Mock<IEventPublisher>();

        var taskId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var clientId = Guid.NewGuid();
        var gardenerId = Guid.NewGuid();

        context.TaskQuestions.Add(new TaskQuestionRecord
        {
            Id = questionId,
            TaskId = taskId,
            GardenerId = gardenerId,
            ClientId = clientId,
            QuestionText = "Free text question",
            QuestionType = TaskQuestionType.FreeText,
            CreatedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { UserId = clientId, IsAuthenticated = true };
        var handler = new CreateAnswerHandler(context, currentUser, eventPublisher.Object);

        var request = new CreateAnswerRequest
        {
            QuestionId = questionId,
            AnswerText = "My answer"
        };

        var response = await handler.Handle(request);

        response.QuestionId.Should().Be(questionId);
        response.AnswerText.Should().Be("My answer");

        var stored = await context.TaskAnswers.SingleAsync();
        stored.QuestionId.Should().Be(questionId);
        stored.ClientId.Should().Be(clientId);
        stored.AnswerText.Should().Be("My answer");

        eventPublisher.Verify(x => x.PublishAsync(
            It.Is<TaskQuestionAnsweredEvent>(e =>
                e.AnswerId == response.AnswerId &&
                e.QuestionId == questionId &&
                e.TaskId == taskId &&
                e.ClientId == clientId &&
                e.GardenerId == gardenerId &&
                e.AnswerText == "My answer"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetQuestionsByTask_Should_Return_Questions_Answers_And_Media()
    {
        var context = CreateContext($"{nameof(GetQuestionsByTask_Should_Return_Questions_Answers_And_Media)}-{Guid.NewGuid()}");

        var clientId = Guid.NewGuid();
        var gardenerId = Guid.NewGuid();
        var taskId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var answerId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Job",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.Tasks.Add(new TaskRecord
        {
            Id = taskId,
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Task",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });
        context.TaskQuestions.Add(new TaskQuestionRecord
        {
            Id = questionId,
            TaskId = taskId,
            GardenerId = gardenerId,
            ClientId = clientId,
            QuestionText = "Pick one",
            QuestionType = TaskQuestionType.MultipleChoice,
            PredefinedOptions = "[\"A\",\"B\"]",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.TaskAnswers.Add(new TaskAnswerRecord
        {
            Id = answerId,
            QuestionId = questionId,
            ClientId = clientId,
            AnswerText = "A",
            CreatedAtUtc = DateTime.UtcNow
        });
        context.TaskQuestionMedia.Add(new TaskQuestionMediaRecord
        {
            Id = Guid.NewGuid(),
            QuestionId = questionId,
            MediaUrl = "https://cdn/q.png",
            MediaType = "image/png",
            FileName = "q.png",
            UploadedAtUtc = DateTime.UtcNow
        });
        context.TaskAnswerMedia.Add(new TaskAnswerMediaRecord
        {
            Id = Guid.NewGuid(),
            AnswerId = answerId,
            MediaUrl = "https://cdn/a.png",
            MediaType = "image/png",
            FileName = "a.png",
            UploadedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { UserId = clientId, IsAuthenticated = true };
        var handler = new GetQuestionsByTaskHandler(context, currentUser);

        var response = await handler.Handle(taskId);

        response.Questions.Should().HaveCount(1);
        response.Questions[0].QuestionId.Should().Be(questionId);
        response.Questions[0].PredefinedOptions.Should().BeEquivalentTo(["A", "B"]);
        response.Questions[0].Media.Should().ContainSingle(m => m.FileName == "q.png");
        response.Questions[0].Answers.Should().ContainSingle(a => a.AnswerId == answerId);
        response.Questions[0].Answers[0].Media.Should().ContainSingle(m => m.FileName == "a.png");
    }

    [Fact]
    public async Task UploadQuestionMedia_Should_Store_Returned_Blob_Url()
    {
        var context = CreateContext($"{nameof(UploadQuestionMedia_Should_Store_Returned_Blob_Url)}-{Guid.NewGuid()}");
        var blobStorage = new Mock<IBlobStorageService>();

        var gardenerId = Guid.NewGuid();
        var questionId = Guid.NewGuid();
        var expectedUrl = "https://blob.example/question.jpg";

        context.TaskQuestions.Add(new TaskQuestionRecord
        {
            Id = questionId,
            TaskId = Guid.NewGuid(),
            GardenerId = gardenerId,
            ClientId = Guid.NewGuid(),
            QuestionText = "Question",
            QuestionType = TaskQuestionType.FreeText,
            CreatedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        blobStorage
            .Setup(x => x.UploadFileAsync("base64-data", "question.jpg", "image/jpeg", "question-media"))
            .ReturnsAsync(expectedUrl);

        var currentUser = new FakeCurrentUser { UserId = gardenerId, IsAuthenticated = true };
        var handler = new UploadQuestionMediaHandler(context, currentUser, blobStorage.Object);

        var request = new UploadQuestionMediaRequest
        {
            QuestionId = questionId,
            MediaUrl = "base64-data",
            MediaType = "image/jpeg",
            FileName = "question.jpg"
        };

        var response = await handler.Handle(request);

        response.MediaUrl.Should().Be(expectedUrl);
        var stored = await context.TaskQuestionMedia.SingleAsync();
        stored.QuestionId.Should().Be(questionId);
        stored.MediaUrl.Should().Be(expectedUrl);
    }

    [Fact]
    public async Task UploadAnswerMedia_Should_Throw_When_Answer_Belongs_To_Different_Client()
    {
        var context = CreateContext($"{nameof(UploadAnswerMedia_Should_Throw_When_Answer_Belongs_To_Different_Client)}-{Guid.NewGuid()}");
        var blobStorage = new Mock<IBlobStorageService>();

        var ownerClientId = Guid.NewGuid();
        var otherClientId = Guid.NewGuid();
        var answerId = Guid.NewGuid();

        context.TaskAnswers.Add(new TaskAnswerRecord
        {
            Id = answerId,
            QuestionId = Guid.NewGuid(),
            ClientId = ownerClientId,
            AnswerText = "Answer",
            CreatedAtUtc = DateTime.UtcNow
        });
        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { UserId = otherClientId, IsAuthenticated = true };
        var handler = new UploadAnswerMediaHandler(context, currentUser, blobStorage.Object);

        var request = new UploadAnswerMediaRequest
        {
            AnswerId = answerId,
            MediaUrl = "base64-data",
            MediaType = "image/jpeg",
            FileName = "answer.jpg"
        };

        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(request));
    }
}
