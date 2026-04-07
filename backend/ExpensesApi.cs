using Supabase.Postgrest;

public static class ExpensesApi
{
    public static void MapExpensesEndpoints(this WebApplication app)
    {
        // GET /groups/{groupId}/expenses — get all expenses for a group
        app.MapGet("/groups/{groupId}/expenses", async (Supabase.Client supabase, HttpContext context, string groupId) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify the requester is a member of this group
            var membership = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membership.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Fetch all expenses for this group
            var expenses = await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Order("created_at", Constants.Ordering.Descending)
                .Get();

            var result = expenses.Models.Select(e => new ExpenseResponse(
                e.Id,
                e.GroupId,
                e.Description,
                e.Amount,
                e.PaidBy,
                e.CreatedAt
            )).ToList();

            return Results.Ok(result);
        });

        // POST /groups/{groupId}/expenses — log a new expense
        app.MapPost("/groups/{groupId}/expenses", async (Supabase.Client supabase, HttpContext context, string groupId, CreateExpenseRequest request) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify the requester is a member of this group
            var membershipResult = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membershipResult.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Get all members of the group so we can split equally
            var allMembers = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            var memberIds = allMembers.Models.Select(m => m.UserId).ToList();
            int memberCount = memberIds.Count;

            if (memberCount == 0)
                return Results.BadRequest(new { message = "Group has no members." });

            // Calculate the equal split amount
            decimal splitAmount = Math.Round(request.Amount / memberCount, 2);

            // Insert the expense
            var newExpense = new Expense
            {
                GroupId = groupId,
                Description = request.Description,
                Amount = request.Amount,
                PaidBy = request.PaidBy
            };

            await supabase.From<Expense>().Insert(newExpense);

            // Fetch the expense we just created
            var expenseResult = await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("paid_by", Constants.Operator.Equals, request.PaidBy)
                .Filter("description", Constants.Operator.Equals, request.Description)
                .Order("created_at", Constants.Ordering.Descending)
                .Limit(10)
                .Get();

            var createdExpense = expenseResult.Models
                .FirstOrDefault(e => Math.Abs(e.Amount - request.Amount) <= 0.01m);
            if (createdExpense is null)
                return Results.StatusCode(StatusCodes.Status500InternalServerError);

            // Insert a split row for each member
            foreach (var memberId in memberIds)
            {
                var split = new ExpenseSplit
                {
                    ExpenseId = createdExpense.Id,
                    UserId = memberId,
                    AmountOwed = splitAmount
                };

                await supabase.From<ExpenseSplit>().Insert(split);
            }

            return Results.Ok(new ExpenseResponse(
                createdExpense.Id,
                createdExpense.GroupId,
                createdExpense.Description,
                createdExpense.Amount,
                createdExpense.PaidBy,
                createdExpense.CreatedAt
            ));
        });

        // DELETE /groups/{groupId}/expenses/{expenseId} — delete an expense
        app.MapDelete("/groups/{groupId}/expenses/{expenseId}", async (Supabase.Client supabase, HttpContext context, string groupId, string expenseId) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify the requester is a member of this group
            var membership = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membership.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Verify the expense belongs to this group
            var expenseResult = await supabase
                .From<Expense>()
                .Filter("id", Constants.Operator.Equals, expenseId)
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            if (!expenseResult.Models.Any())
                return Results.NotFound(new { message = "Expense not found." });

            // Delete the splits first
            await supabase
                .From<ExpenseSplit>()
                .Filter("expense_id", Constants.Operator.Equals, expenseId)
                .Delete();

            // Delete the expense
            await supabase
                .From<Expense>()
                .Filter("id", Constants.Operator.Equals, expenseId)
                .Delete();

            return Results.Ok(new { message = "Expense deleted." });
        });
    }
}

// Request and response DTOs
public record CreateExpenseRequest(string Description, decimal Amount, string PaidBy);
public record ExpenseResponse(string Id, string GroupId, string Description, decimal Amount, string PaidBy, DateTime? CreatedAt);