#!/bin/bash

# Create database and user
psql -U postgres << EOF
CREATE DATABASE quaiqi;
CREATE USER quaiqi WITH PASSWORD 'quaiqi_password';
GRANT ALL PRIVILEGES ON DATABASE quaiqi TO quaiqi;
\c quaiqi
GRANT ALL ON SCHEMA public TO quaiqi;
EOF

echo "Database setup complete!" 