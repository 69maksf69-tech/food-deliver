CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY,
    order_id uuid NOT NULL,
    customer_id uuid,
    message text NOT NULL,
    delivery_status text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);