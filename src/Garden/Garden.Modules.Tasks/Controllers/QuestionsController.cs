using Garden.Modules.Tasks.Features.Questions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Tasks.Controllers;

[ApiController]
[Route("api/tasks/{taskId}/questions")]
[Authorize]
public class QuestionsController : ControllerBase
{
    [HttpPost]
    [Authorize(Roles = "Gardener")]
    public async Task<IActionResult> CreateQuestion(
        [FromServices] CreateQuestionHandler handler,
        Guid taskId,
        [FromBody] CreateQuestionRequest request)
    {
        try
        {
            var requestWithTaskId = request with { TaskId = taskId };
            var response = await handler.Handle(requestWithTaskId);
            return CreatedAtAction(nameof(GetQuestionsByTask), new { taskId }, response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetQuestionsByTask(
        [FromServices] GetQuestionsByTaskHandler handler,
        Guid taskId)
    {
        try
        {
            var response = await handler.Handle(taskId);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("~/api/questions/{questionId}/media")]
    [Authorize(Roles = "Gardener")]
    public async Task<IActionResult> UploadQuestionMedia(
        [FromServices] UploadQuestionMediaHandler handler,
        Guid questionId,
        [FromBody] UploadQuestionMediaRequest request)
    {
        try
        {
            var requestWithQuestionId = request with { QuestionId = questionId };
            var response = await handler.Handle(requestWithQuestionId);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}
