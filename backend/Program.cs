using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Supabase;

var builder = WebApplication.CreateBuilder(args);

// Add CORS so our Next.js frontend can talk to this API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Register Supabase client
var supabaseUrl = builder.Configuration["Supabase:Url"]!;
var supabaseKey = builder.Configuration["Supabase:ServiceRoleKey"]!;

builder.Services.AddScoped<Supabase.Client>(_ =>
    new Supabase.Client(supabaseUrl, supabaseKey, new SupabaseOptions
    {
        AutoRefreshToken = false,
        AutoConnectRealtime = false
    })
);

var app = builder.Build();

app.UseCors("AllowFrontend");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

// Groups endpoints
app.MapGroupsEndpoints();
app.MapExpensesEndpoints();

app.Run();