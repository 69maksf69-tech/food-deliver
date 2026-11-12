using Npgsql;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

var connStr = Environment.GetEnvironmentVariable("ConnectionStrings__Default")
    ?? "Host=order-db;Database=orders;Username=postgres;Password=postgres";
var rabbitHost = Environment.GetEnvironmentVariable("RabbitMQ__Host") ?? "rabbitmq";

await using (var conn = new NpgsqlConnection(connStr))
{
    await conn.OpenAsync();
    await using var cmd = new NpgsqlCommand(
        "CREATE TABLE IF NOT EXISTS orders (" +
        "id uuid PRIMARY KEY, customer_id uuid NOT NULL, status text NOT NULL, " +
        "total_amount numeric(12,2) NOT NULL, created_at timestamptz NOT NULL)", conn);
    await cmd.ExecuteNonQueryAsync();
}

app.MapPost("/orders", async (OrderRequest req) =>
{
    var id = Guid.NewGuid();

    await using (var conn = new NpgsqlConnection(connStr))
    {
        await conn.OpenAsync();
        await using var cmd = new NpgsqlCommand(
            "INSERT INTO orders(id, customer_id, status, total_amount, created_at) " +
            "VALUES($1,$2,$3,$4,$5)", conn);
        cmd.Parameters.AddWithValue(id);
        cmd.Parameters.AddWithValue(req.CustomerId);
        cmd.Parameters.AddWithValue("Created");
        cmd.Parameters.AddWithValue(req.TotalAmount);
        cmd.Parameters.AddWithValue(DateTime.UtcNow);
        await cmd.ExecuteNonQueryAsync();
    }

    var factory = new ConnectionFactory { HostName = rabbitHost };
    await using var connection = await factory.CreateConnectionAsync();
    await using var channel = await connection.CreateChannelAsync();

    await channel.ExchangeDeclareAsync("orders", ExchangeType.Topic, durable: true);

    var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
    {
        orderId = id,
        customerId = req.CustomerId,
        totalAmount = req.TotalAmount
    }));

    await channel.BasicPublishAsync("orders", "order.created", body: body);

    return Results.Created($"/orders/{id}", new { orderId = id });
});

app.MapGet("/orders/{id:guid}", async (Guid id) =>
{
    await using var conn = new NpgsqlConnection(connStr);
    await conn.OpenAsync();
    await using var cmd = new NpgsqlCommand(
        "SELECT id, customer_id, status, total_amount, created_at FROM orders WHERE id=$1", conn);
    cmd.Parameters.AddWithValue(id);
    await using var reader = await cmd.ExecuteReaderAsync();
    if (!await reader.ReadAsync()) return Results.NotFound();

    return Results.Ok(new
    {
        orderId = reader.GetGuid(0),
        customerId = reader.GetGuid(1),
        status = reader.GetString(2),
        totalAmount = reader.GetDecimal(3),
        createdAt = reader.GetDateTime(4)
    });
});

app.Run();

record OrderRequest(Guid CustomerId, decimal TotalAmount);