using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;

namespace Garden.Modules.Notifications.Services;

public sealed class SmtpEmailService : IEmailService
{
    private readonly SmtpOptions _options;
    private readonly ILogger<SmtpEmailService> _logger;

    public SmtpEmailService(SmtpOptions options, ILogger<SmtpEmailService> logger)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task SendAsync(string to, string subject, string body, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(to))
            throw new ArgumentException("Recipient email is required.", nameof(to));
        if (string.IsNullOrWhiteSpace(subject))
            throw new ArgumentException("Subject is required.", nameof(subject));
        if (string.IsNullOrWhiteSpace(body))
            throw new ArgumentException("Body is required.", nameof(body));

        using var client = new SmtpClient(_options.Host, _options.Port)
        {
            EnableSsl = _options.EnableSsl,
            Credentials = new NetworkCredential(_options.Username, _options.Password)
        };

        using var message = new MailMessage(_options.FromAddress, to, subject, body)
        {
            IsBodyHtml = true
        };

        try
        {
            await client.SendMailAsync(message, cancellationToken);
            _logger.LogInformation("Email sent to {To} with subject '{Subject}'", to, subject);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To} with subject '{Subject}'", to, subject);
            throw;
        }
    }
}
