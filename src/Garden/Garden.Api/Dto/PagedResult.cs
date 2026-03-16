namespace Garden.Api.Dto
{
    public record PagedResult<T>(IEnumerable<T> Items, int Total, int Page, int PageSize);
}
