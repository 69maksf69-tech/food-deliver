CREATE TABLE IF NOT EXISTS orders (
    id uuid PRIMARY KEY,
    customer_id uuid NOT NULL,
    status text NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    created_at timestamptz NOT NULL
);