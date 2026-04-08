using Supabase.Postgrest;
using System.Security.Claims;

public static class GroupsApi
{
    public static void MapGroupsEndpoints(this WebApplication app)
    {
        // GET /groups — get all groups for the current user
        app.MapGet("/groups", async (Supabase.Client supabase, HttpContext context) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Get all group_ids this user belongs to
            var memberRows = await supabase
                .From<GroupMember>()
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            var groupIds = memberRows.Models.Select(m => m.GroupId).ToList();

            if (!groupIds.Any())
                return Results.Ok(new List<GroupResponse>());

            // Get the actual group records
            var groups = await supabase
                .From<Group>()
                .Filter("id", Constants.Operator.In, groupIds)
                .Get();

            var groupResponses = groups.Models
                .Select(g => new GroupResponse(g.Id, g.Name, g.CreatedBy, g.CreatedAt))
                .ToList();

            return Results.Ok(groupResponses);
        });

        // POST /groups — create a new group
        app.MapPost("/groups", async (Supabase.Client supabase, HttpContext context, CreateGroupRequest request) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Create the group
            var newGroup = new Group
            {
                Name = request.Name,
                CreatedBy = userId,
                CreatedAt = DateTime.UtcNow
            };

            await supabase
                .From<Group>()
                .Insert(newGroup);

            // Fetch the group we just created by name and creator
            var groupResult = await supabase
                .From<Group>()
                .Filter("created_by", Constants.Operator.Equals, userId)
                .Filter("name", Constants.Operator.Equals, request.Name)
                .Order("created_at", Constants.Ordering.Descending)
                .Limit(1)
                .Get();

            var createdGroup = groupResult.Models.First();

            // Add the creator as the first member
            var membership = new GroupMember
            {
                GroupId = createdGroup.Id,
                UserId = userId,
                JoinedAt = DateTime.UtcNow
            };

            await supabase
                .From<GroupMember>()
                .Insert(membership);

            return Results.Ok(new GroupResponse(
                createdGroup.Id,
                createdGroup.Name,
                createdGroup.CreatedBy,
                createdGroup.CreatedAt
            ));
        });

        // POST /groups/{groupId}/members — invite a user to a group by email
        app.MapPost("/groups/{groupId}/members", async (Supabase.Client supabase, HttpContext context, string groupId, InviteMemberRequest request) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Check the inviter is actually a member of this group
            var membership = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membership.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Look up the invitee by email
            var profiles = await supabase
                .From<Profile>()
                .Filter("email", Constants.Operator.Equals, request.Email)
                .Get();

            if (!profiles.Models.Any())
                return Results.NotFound(new { message = "No user found with that email address." });

            var invitee = profiles.Models.First();

            // Check they are not already a member
            var existing = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, invitee.Id)
                .Get();

            if (existing.Models.Any())
                return Results.Conflict(new { message = "That user is already a member of this group." });

            // Add them
            var newMember = new GroupMember
            {
                GroupId = groupId,
                UserId = invitee.Id,
                JoinedAt = DateTime.UtcNow
            };

            await supabase.From<GroupMember>().Insert(newMember);

            return Results.Ok(new { message = "Member added successfully." });
        });

        // GET /groups/{groupId} — get one group if current user is a member
        app.MapGet("/groups/{groupId}", async (Supabase.Client supabase, HttpContext context, string groupId) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify requester is a member of the group
            var membership = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membership.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            var groupResult = await supabase
                .From<Group>()
                .Filter("id", Constants.Operator.Equals, groupId)
                .Limit(1)
                .Get();

            var group = groupResult.Models.FirstOrDefault();
            if (group is null)
                return Results.NotFound(new { message = "Group not found." });

            return Results.Ok(new GroupResponse(group.Id, group.Name, group.CreatedBy, group.CreatedAt));
        });

        // GET /groups/{groupId}/members — get all members of a group
        app.MapGet("/groups/{groupId}/members", async (Supabase.Client supabase, HttpContext context, string groupId) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify the requester is a member
            var membership = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Get();

            if (!membership.Models.Any())
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Get all member user_ids
            var members = await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            var userIds = members.Models.Select(m => m.UserId).ToList();

            // Get their profiles
            var profiles = await supabase
                .From<Profile>()
                .Filter("id", Constants.Operator.In, userIds)
                .Get();

            var profileResponses = profiles.Models
                .Select(p => new ProfileResponse(p.Id, p.FullName, p.Email, p.CreatedAt))
                .ToList();

            return Results.Ok(profileResponses);
        });

        // DELETE /groups/{groupId}/leave — leave a group
        app.MapDelete("/groups/{groupId}/leave", async (Supabase.Client supabase, HttpContext context, string groupId) =>
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
                return Results.BadRequest(new { message = "You are not a member of this group." });

            // Check if user is the creator - creators cannot leave, they must delete the group
            var groupResult = await supabase
                .From<Group>()
                .Filter("id", Constants.Operator.Equals, groupId)
                .Limit(1)
                .Get();

            var group = groupResult.Models.FirstOrDefault();
            if (group is null)
                return Results.NotFound(new { message = "Group not found." });

            if (group.CreatedBy == userId)
                return Results.BadRequest(new { message = "You created this group. Delete the group instead of leaving it." });

            // Remove the member
            await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Filter("user_id", Constants.Operator.Equals, userId)
                .Delete();

            return Results.Ok(new { message = "You have left the group." });
        });

        // DELETE /groups/{groupId} — delete a group (creator only)
        app.MapDelete("/groups/{groupId}", async (Supabase.Client supabase, HttpContext context, string groupId) =>
        {
            var userId = context.Request.Headers["x-user-id"].ToString();
            if (string.IsNullOrEmpty(userId))
                return Results.Unauthorized();

            // Verify the requester is the creator of this group
            var groupResult = await supabase
                .From<Group>()
                .Filter("id", Constants.Operator.Equals, groupId)
                .Limit(1)
                .Get();

            var group = groupResult.Models.FirstOrDefault();
            if (group == null)
                return Results.NotFound(new { message = "Group not found." });

            if (group.CreatedBy != userId)
                return Results.Json(new { message = "Forbidden." }, statusCode: 403);

            // Delete all expense splits for this group's expenses
            var expenses = await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Get();

            foreach (var expense in expenses.Models)
            {
                await supabase
                    .From<ExpenseSplit>()
                    .Filter("expense_id", Constants.Operator.Equals, expense.Id)
                    .Delete();
            }

            // Delete all expenses
            await supabase
                .From<Expense>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Delete();

            // Delete all settlements
            await supabase
                .From<Settlement>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Delete();

            // Delete all memberships
            await supabase
                .From<GroupMember>()
                .Filter("group_id", Constants.Operator.Equals, groupId)
                .Delete();

            // Delete the group itself
            await supabase
                .From<Group>()
                .Filter("id", Constants.Operator.Equals, groupId)
                .Delete();

            return Results.Ok(new { message = "Group deleted." });
        });
    }
}

// Request DTOs
public record CreateGroupRequest(string Name);
public record InviteMemberRequest(string Email);

// Response DTOs (avoid serializing Supabase BaseModel internals)
public record GroupResponse(string Id, string Name, string CreatedBy, DateTime CreatedAt);
public record ProfileResponse(string Id, string FullName, string Email, DateTime CreatedAt);
