using Garden.Modules.Tasks.Features.Questions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Garden.Modules.Tasks.Controllers;

[ApiController]
[Route("api/questions/{questionId}/answers")]
[Authorize(Roles = "Client")]
public class AnswersController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> CreateAnswer(
        [FromServices] CreateAnswerHandler handler,
        Guid questionId,
        [FromBody] CreateAnswerRequest request)
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

    [HttpPost("~/api/answers/{answerId}/media")]
    public async Task<IActionResult> UploadAnswerMedia(
        [FromServices] UploadAnswerMediaHandler handler,
        Guid answerId,
        [FromBody] UploadAnswerMediaRequest request)
    {
        try
        {
            var requestWithAnswerId = request with { AnswerId = answerId };
            var response = await handler.Handle(requestWithAnswerId);
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
