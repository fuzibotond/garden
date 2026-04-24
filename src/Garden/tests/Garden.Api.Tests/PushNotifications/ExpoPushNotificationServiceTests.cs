using FluentAssertions;
using Garden.Modules.Notifications.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text.Json;
using Xunit;

namespace Garden.Api.Tests.PushNotifications;

public class ExpoPushNotificationServiceTests
{
    private readonly Mock<IHttpClientFactory> _httpClientFactoryMock;
    private readonly Mock<ILogger<ExpoPushNotificationService>> _loggerMock;
    private readonly ExpoPushNotificationService _service;
    private readonly Mock<HttpMessageHandler> _httpMessageHandlerMock;

    public ExpoPushNotificationServiceTests()
    {
        _httpClientFactoryMock = new Mock<IHttpClientFactory>();
        _loggerMock = new Mock<ILogger<ExpoPushNotificationService>>();
        _httpMessageHandlerMock = new Mock<HttpMessageHandler>();
        
        var httpClient = new HttpClient(_httpMessageHandlerMock.Object);
        _httpClientFactoryMock.Setup(x => x.CreateClient(It.IsAny<string>())).Returns(httpClient);
        
        _service = new ExpoPushNotificationService(_httpClientFactoryMock, _loggerMock.Object);
    }

    [Fact]
    public async Task SendPushNotificationAsync_ValidToken_ShouldSendSuccessfully()
    {
        // Arrange
        var token = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";
        var title = "Test Notification";
        var body = "Test Body";
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"data\": [{\"status\": \"ok\"}]}")
            });

        // Act
        await _service.SendPushNotificationAsync(token, title, body);

        // Assert
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.Method == HttpMethod.Post &&
                req.RequestUri!.ToString() == "https://exp.host/--/api/v2/push/send"),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SendPushNotificationsAsync_MultipleTokens_ShouldSendToAll()
    {
        // Arrange
        var tokens = new[]
        {
            "ExponentPushToken[token1]",
            "ExponentPushToken[token2]",
            "ExponentPushToken[token3]"
        };
        var title = "Bulk Notification";
        var body = "Sent to multiple devices";
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"data\": [{\"status\": \"ok\"}, {\"status\": \"ok\"}, {\"status\": \"ok\"}]}")
            });

        // Act
        await _service.SendPushNotificationsAsync(tokens, title, body);

        // Assert
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.Method == HttpMethod.Post),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SendPushNotificationAsync_WithCustomData_ShouldIncludeData()
    {
        // Arrange
        var token = "ExponentPushToken[test]";
        var title = "Test";
        var body = "Test Body";
        var customData = new { scheduleId = Guid.NewGuid(), type = "schedule_request" };
        
        HttpRequestMessage? capturedRequest = null;
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, ct) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"data\": [{\"status\": \"ok\"}]}")
            });

        // Act
        await _service.SendPushNotificationAsync(token, title, body, customData);

        // Assert
        capturedRequest.Should().NotBeNull();
        var content = await capturedRequest!.Content!.ReadAsStringAsync();
        content.Should().Contain("scheduleId");
        content.Should().Contain("schedule_request");
    }

    [Fact]
    public async Task SendPushNotificationsAsync_EmptyTokenList_ShouldNotSendRequest()
    {
        // Arrange
        var emptyTokens = Array.Empty<string>();
        var title = "Test";
        var body = "Test Body";

        // Act
        await _service.SendPushNotificationsAsync(emptyTokens, title, body);

        // Assert
        _httpMessageHandlerMock.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SendPushNotificationsAsync_NullOrWhitespaceTokens_ShouldFilterThem()
    {
        // Arrange
        var tokens = new[] { "ExponentPushToken[valid]", "", null!, "  " };
        var title = "Test";
        var body = "Test Body";
        
        HttpRequestMessage? capturedRequest = null;
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, ct) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"data\": [{\"status\": \"ok\"}]}")
            });

        // Act
        await _service.SendPushNotificationsAsync(tokens, title, body);

        // Assert
        capturedRequest.Should().NotBeNull();
        var content = await capturedRequest!.Content!.ReadAsStringAsync();
        var messages = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(content);
        messages.Should().HaveCount(1); // Only the valid token
    }

    [Fact]
    public async Task SendPushNotificationAsync_ApiError_ShouldLogError()
    {
        // Arrange
        var token = "ExponentPushToken[test]";
        var title = "Test";
        var body = "Test Body";
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                Content = new StringContent("{\"errors\": [{\"message\": \"Invalid token\"}]}")
            });

        // Act
        await _service.SendPushNotificationAsync(token, title, body);

        // Assert - Should not throw but should log error
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }

    [Fact]
    public async Task SendPushNotificationAsync_NetworkException_ShouldLogError()
    {
        // Arrange
        var token = "ExponentPushToken[test]";
        var title = "Test";
        var body = "Test Body";
        
        _httpMessageHandlerMock.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        // Act
        await _service.SendPushNotificationAsync(token, title, body);

        // Assert - Should not throw but should log error
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => true),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }
}
