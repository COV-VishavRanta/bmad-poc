-- Initialize ClientOps Database
-- This script is run when the MySQL container starts for the first time

-- Ensure the database exists (redundant with MYSQL_DATABASE env var but safe)
CREATE DATABASE IF NOT EXISTS clientops_db;

-- Use the database
USE clientops_db;

-- Create a basic health check table to verify connectivity
CREATE TABLE IF NOT EXISTS health_check (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status VARCHAR(50) NOT NULL DEFAULT 'healthy',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial health check record
INSERT INTO health_check (status) VALUES ('database_initialized');

-- Grant privileges (redundant with MYSQL_USER env var but explicit)
GRANT ALL PRIVILEGES ON clientops_db.* TO 'clientops_user'@'%';
FLUSH PRIVILEGES;