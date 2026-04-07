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
                return Results.Forbid();

            // Get all members of the group
            var membersResult = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            var memberIds = membersResult.Models.Select(m => m.UserId).ToList();

            // Get all expenses for this group
            var expensesResult = await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            // Get all splits for this group's expenses
            var expenseIds = expensesResult.Models.Select(e => e.Id).ToList();

            if (!expenseIds.Any())
                return Results.Ok(new List<SettlementResponse>());

            var splitsResult = await supabase
                .From<ExpenseSplit>()
                .Filter("expense_id", Constants.Operator.In, expenseIds)
                .Get();

            // Calculate net balance for each member
            // Positive = they are owed money
            // Negative = they owe money
            var balances = new Dictionary<string, decimal>();

            foreach (var memberId in memberIds)
                balances[memberId] = 0;

            // Add what each person paid
            foreach (var expense in expensesResult.Models)
            {
                if (balances.ContainsKey(expense.PaidBy))
                    balances[expense.PaidBy] += expense.Amount;
            }

            // Subtract what each person owes
            foreach (var split in splitsResult.Models)
            {
                if (balances.ContainsKey(split.UserId))
                    balances[split.UserId] -= split.AmountOwed;
            }

            // Debt simplification algorithm
            // Separate into creditors (positive balance) and debtors (negative balance)
            var settlements = new List<SettlementResponse>();
            var creditors = balances.Where(b => b.Value > 0.01m).Select(b => new BalanceEntry(b.Key, b.Value)).ToList();
            var debtors = balances.Where(b => b.Value < -0.01m).Select(b => new BalanceEntry(b.Key, Math.Abs(b.Value))).ToList();

            // Get member profiles for names
            var profilesResult = await supabase
                .From<Profile>()
                .Filter("id", Constants.Operator.In, memberIds)
                .Get();

            var profileMap = profilesResult.Models.ToDictionary(p => p.Id, p => p.FullName);

            // Greedy matching — match biggest debtor with biggest creditor
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
    }
}

// Helper record for the algorithm
public record BalanceEntry(string UserId, decimal Amount)
{
    public decimal Amount { get; init; } = Amount;
}

// Response DTO
public record SettlementResponse(
    string FromUserId,
    string ToUserId,
    string FromUserName,
    string ToUserName,
    decimal Amount
);