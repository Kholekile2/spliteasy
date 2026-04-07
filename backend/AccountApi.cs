public static class AccountApi
{
    public static void MapAccountEndpoints(this WebApplication app)
    {
        // DELETE /account — delete the current user's account
        app.MapDelete("/account", async (HttpContext context, IConfiguration config) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            try
            {
                var supabaseUrl = config["Supabase:Url"]!;
                var serviceRoleKey = config["Supabase:ServiceRoleKey"]!;

                using var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("apikey", serviceRoleKey);
                httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {serviceRoleKey}");

                var response = await httpClient.DeleteAsync(
                    $"{supabaseUrl}/auth/v1/admin/users/{userId}"
                );

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync();
                    return Results.BadRequest(new { message = "Failed to delete account." });
                }

                return Results.Ok(new { message = "Account deleted successfully." });
            }
            catch (Exception ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });
    }
}