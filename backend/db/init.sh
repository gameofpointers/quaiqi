#!/bin/bash

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
while ! pg_isready -h localhost -p 5432 -U quaiqi; do
  sleep 1
done

# Run migrations
echo "Running database migrations..."
psql -h localhost -U quaiqi -d quaiqi -f migrations/001_create_price_history.sql

echo "Database initialization complete!" 