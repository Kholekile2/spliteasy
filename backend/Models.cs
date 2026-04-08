using Supabase.Postgrest.Attributes;
using Supabase.Postgrest.Models;

[Table("profiles")]
public class Profile : BaseModel
{
    [PrimaryKey("id", false)]
    public string Id { get; set; } = string.Empty;

    [Column("full_name")]
    public string FullName { get; set; } = string.Empty;

    [Column("email")]
    public string Email { get; set; } = string.Empty;

    [Column("created_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime CreatedAt { get; set; }
}

[Table("groups")]
public class Group : BaseModel
{
    [PrimaryKey("id", false)]
    public string Id { get; set; } = string.Empty;

    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("created_by")]
    public string CreatedBy { get; set; } = string.Empty;

    [Column("created_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime CreatedAt { get; set; }
}

[Table("group_members")]
public class GroupMember : BaseModel
{
    [Column("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [Column("user_id")]
    public string UserId { get; set; } = string.Empty;

    [Column("joined_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime? JoinedAt { get; set; }
}

[Table("expenses")]
public class Expense : BaseModel
{
    [PrimaryKey("id", false)]
    public string Id { get; set; } = string.Empty;

    [Column("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [Column("description")]
    public string Description { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("paid_by")]
    public string PaidBy { get; set; } = string.Empty;

    [Column("category")]
    public string Category { get; set; } = "Other";

    [Column("created_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime? CreatedAt { get; set; }
}

[Table("expense_splits")]
public class ExpenseSplit : BaseModel
{
    [Column("expense_id")]
    public string ExpenseId { get; set; } = string.Empty;

    [Column("user_id")]
    public string UserId { get; set; } = string.Empty;

    [Column("amount_owed")]
    public decimal AmountOwed { get; set; }
}

[Table("settlements")]
public class Settlement : BaseModel
{
    [Column("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [Column("from_user")]
    public string FromUser { get; set; } = string.Empty;

    [Column("to_user")]
    public string ToUser { get; set; } = string.Empty;

    [Column("amount")]
    public decimal Amount { get; set; }

    [Column("settled_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime? SettledAt { get; set; }
}

[Table("deletion_history")]
public class DeletionHistory : BaseModel
{
    [Column("group_id")]
    public string GroupId { get; set; } = string.Empty;

    [Column("deleted_by")]
    public string DeletedBy { get; set; } = string.Empty;

    [Column("expense_description")]
    public string ExpenseDescription { get; set; } = string.Empty;

    [Column("expense_amount")]
    public decimal ExpenseAmount { get; set; }

    [Column("deleted_at", Newtonsoft.Json.NullValueHandling.Ignore, true, false)]
    public DateTime? DeletedAt { get; set; }
}