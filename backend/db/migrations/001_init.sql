-- Drop existing table if it exists
DROP TABLE IF EXISTS price_history;

-- Create price_history table with correct constraints
CREATE TABLE price_history (
    timestamp BIGINT PRIMARY KEY,
    quai_price DECIMAL NOT NULL,
    qi_price DECIMAL NOT NULL,
    block_number BIGINT NOT NULL,
    qi_to_quai_rate DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on timestamp for faster lookups
CREATE INDEX idx_price_history_timestamp ON price_history(timestamp);

-- Create index on block_number for faster lookups
CREATE INDEX idx_price_history_block_number ON price_history(block_number);

-- Grant permissions to quaiqi user
GRANT ALL PRIVILEGES ON TABLE price_history TO quaiqi;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO quaiqi;

-- Add comment to table
COMMENT ON TABLE price_history IS 'Stores historical price data for QUAI and QI tokens';

-- Add comments to columns
COMMENT ON COLUMN price_history.timestamp IS 'Unix timestamp in milliseconds';
COMMENT ON COLUMN price_history.quai_price IS 'QUAI price in USD';
COMMENT ON COLUMN price_history.qi_price IS 'QI price in USD';
COMMENT ON COLUMN price_history.block_number IS 'Block number in decimal format';
COMMENT ON COLUMN price_history.qi_to_quai_rate IS 'QI to QUAI conversion rate';
COMMENT ON COLUMN price_history.created_at IS 'Record creation timestamp'; 