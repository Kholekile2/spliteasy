using Supabase.Postgrest;

public static class SettlementsApi
{
    public static void MapSettlementsEndpoints(this WebApplication app)
    {
        // GET /groups/{groupId}/settlements — calculate who owes whom
        app.MapGet("/groups/{groupId}/settlements", async (Supabase.Client supabase, HttpContext context, string groupId) =>
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

            // Get all members of the group
            var membersResult = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            var memberIds = membersResult.Models
                .Select(m => m.UserId)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToList();

            if (!memberIds.Any())
                return Results.Ok(new List<SettlementResponse>());

            // Get all expenses for this group
            var expensesResult = await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            var expenseIds = expensesResult.Models
                .Select(e => e.Id)
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .ToList();

            // Calculate net balance for each member
            var balances = new Dictionary<string, decimal>();
            foreach (var memberId in memberIds)
                balances[memberId] = 0;

            if (expenseIds.Any())
            {
                var splitsResult = await supabase
                    .From<ExpenseSplit>()
                    .Filter("expense_id", Constants.Operator.In, expenseIds)
                    .Get();

                // Add what each person paid
                foreach (var expense in expensesResult.Models)
                    if (!string.IsNullOrWhiteSpace(expense.PaidBy) && balances.ContainsKey(expense.PaidBy))
                        balances[expense.PaidBy] += expense.Amount;

                // Subtract what each person owes.
                // If stored splits are inconsistent for an expense, fall back to equal split.
                foreach (var expense in expensesResult.Models)
                {
                    var splitsForExpense = splitsResult.Models
                        .Where(s => s.ExpenseId == expense.Id)
                        .ToList();

                    var splitTotal = splitsForExpense.Sum(s => s.AmountOwed);
                    var hasValidSplits = splitsForExpense.Any() && Math.Abs(splitTotal - expense.Amount) <= 0.02m;

                    if (hasValidSplits)
                    {
                        foreach (var split in splitsForExpense)
                            if (!string.IsNullOrWhiteSpace(split.UserId) && balances.ContainsKey(split.UserId))
                                balances[split.UserId] -= split.AmountOwed;
                    }
                    else
                    {
                        var fallbackShare = Math.Round(expense.Amount / memberIds.Count, 2);
                        foreach (var memberId in memberIds)
                            if (balances.ContainsKey(memberId))
                                balances[memberId] -= fallbackShare;
                    }
                }
            }

            // Factor in existing settlements
            var settlementsResult = await supabase
                .From<Settlement>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            foreach (var settlement in settlementsResult.Models.Where(s => s.SettledAt.HasValue))
            {
                // The person who paid reduces their debt (increases their balance)
                if (!string.IsNullOrWhiteSpace(settlement.FromUser) && balances.ContainsKey(settlement.FromUser))
                    balances[settlement.FromUser] += settlement.Amount;

                // The person who received reduces their credit (decreases their balance)
                if (!string.IsNullOrWhiteSpace(settlement.ToUser) && balances.ContainsKey(settlement.ToUser))
                    balances[settlement.ToUser] -= settlement.Amount;
            }

            // Get member profiles for names
            var profilesResult = await supabase
                .From<Profile>()
                .Filter("id", Constants.Operator.In, memberIds)
                .Get();

            var profileMap = profilesResult.Models
                .Where(p => !string.IsNullOrWhiteSpace(p.Id))
                .GroupBy(p => p.Id)
                .ToDictionary(g => g.Key, g => g.First().FullName);

            // Debt simplification algorithm
            var settlements = new List<SettlementResponse>();
            var creditors = balances.Where(b => b.Value > 0.01m).Select(b => new BalanceEntry(b.Key, b.Value)).ToList();
            var debtors = balances.Where(b => b.Value < -0.01m).Select(b => new BalanceEntry(b.Key, Math.Abs(b.Value))).ToList();

            int i = 0, j = 0;
            while (i < debtors.Count && j < creditors.Count)
            {
                var debtor = debtors[i];
                var creditor = creditors[j];
                var amount = Math.Min(debtor.Amount, creditor.Amount);

                if (amount > 0.01m)
                {
                    settlements.Add(new SettlementResponse(
                        FromUserId: debtor.UserId,
                        ToUserId: creditor.UserId,
                        FromUserName: profileMap.GetValueOrDefault(debtor.UserId, "Unknown"),
                        ToUserName: profileMap.GetValueOrDefault(creditor.UserId, "Unknown"),
                        Amount: Math.Round(amount, 2)
                    ));
                }

                debtor = debtor with { Amount = debtor.Amount - amount };
                creditor = creditor with { Amount = creditor.Amount - amount };
                debtors[i] = debtor;
                creditors[j] = creditor;

                if (debtor.Amount <= 0.01m) i++;
                if (creditor.Amount <= 0.01m) j++;
            }

            return Results.Ok(settlements);
        });

        // GET /groups/{groupId}/settlements/history — get recent settlement activity
        app.MapGet("/groups/{groupId}/settlements/history", async (Supabase.Client supabase, HttpContext context, string groupId) =>
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

            var settlementsResult = await supabase
                .From<Settlement>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Order("settled_at", Constants.Ordering.Descending)
                .Limit(50)
                .Get();

            var userIds = settlementsResult.Models
                .SelectMany(s => new[] { s.FromUser, s.ToUser })
                .Where(id => !string.IsNullOrWhiteSpace(id))
                .Distinct()
                .ToList();

            if (!userIds.Any())
                return Results.Ok(new List<SettlementHistoryResponse>());

            var profilesResult = await supabase
                .From<Profile>()
                .Filter("id", Constants.Operator.In, userIds)
                .Get();

            var profileMap = profilesResult.Models
                .Where(p => !string.IsNullOrWhiteSpace(p.Id))
                .GroupBy(p => p.Id)
                .ToDictionary(g => g.Key, g => g.First().FullName);

            var history = settlementsResult.Models
                .Where(s => s.SettledAt.HasValue)
                .Select(s => new SettlementHistoryResponse(
                    FromUserId: s.FromUser,
                    ToUserId: s.ToUser,
                    FromUserName: profileMap.GetValueOrDefault(s.FromUser, "Unknown"),
                    ToUserName: profileMap.GetValueOrDefault(s.ToUser, "Unknown"),
                    Amount: s.Amount,
                    SettledAt: s.SettledAt
                ))
                .ToList();

            return Results.Ok(history);
        });

        // POST /groups/{groupId}/settle — record a settlement payment
        app.MapPost("/groups/{groupId}/settle", async (Supabase.Client supabase, HttpContext context, string groupId, RecordSettlementRequest request) =>
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

            // Record the settlement
            var newSettlement = new Settlement
            {
                GroupId = groupId,
                FromUser = request.FromUser,
                ToUser = request.ToUser,
                Amount = request.Amount,
                SettledAt = DateTime.UtcNow
            };

            await supabase.From<Settlement>().Insert(newSettlement);

            return Results.Ok(new { message = "Settlement recorded successfully." });
        });
    }
}

// Helper record for the algorithm
public record BalanceEntry(string UserId, decimal Amount)
{
    public decimal Amount { get; init; } = Amount;
}

// DTOs
public record SettlementResponse(
    string FromUserId,
    string ToUserId,
    string FromUserName,
    string ToUserName,
    decimal Amount
);

public record SettlementHistoryResponse(
    string FromUserId,
    string ToUserId,
    string FromUserName,
    string ToUserName,
    decimal Amount,
    DateTime? SettledAt
);

public record RecordSettlementRequest(
    string FromUser,
    string ToUser,
    decimal Amount
);