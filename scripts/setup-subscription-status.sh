#!/bin/bash

# Subscription Status Management - Setup Script
# This script applies the database migrations for the subscription status system

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters (with defaults)
DB_HOST=${DATABASE_HOST:-localhost}
DB_PORT=${DATABASE_PORT:-5431}
DB_NAME=${DATABASE_NAME:-trading_db}
DB_USER=${DATABASE_USERNAME:-postgres}
DB_PASSWORD=${DATABASE_PASSWORD:-password}

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Subscription Status Management Setup            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to run SQL file
run_sql() {
    local file=$1
    local description=$2
    
    echo -e "${YELLOW}→ ${description}...${NC}"
    
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        echo ""
    else
        echo -e "${RED}✗ Failed${NC}"
        exit 1
    fi
}

# Check if PostgreSQL is accessible
echo -e "${YELLOW}Checking database connection...${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Cannot connect to database${NC}"
    echo -e "${RED}  Host: $DB_HOST:$DB_PORT${NC}"
    echo -e "${RED}  Database: $DB_NAME${NC}"
    echo -e "${RED}  User: $DB_USER${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Step 1: Add status column and enum
if [ -f "database/migrations/add-subscription-status.sql" ]; then
    run_sql "database/migrations/add-subscription-status.sql" "Step 1: Adding status column and migrating data"
else
    echo -e "${RED}✗ Migration file not found: database/migrations/add-subscription-status.sql${NC}"
    exit 1
fi

# Step 2: Create triggers (optional)
echo -e "${BLUE}Would you like to install database triggers for automatic expiration? (recommended)${NC}"
read -p "Install triggers? [Y/n] " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    if [ -f "database/migrations/subscription-expiration-trigger.sql" ]; then
        run_sql "database/migrations/subscription-expiration-trigger.sql" "Step 2: Installing database triggers"
    else
        echo -e "${RED}✗ Trigger file not found: database/migrations/subscription-expiration-trigger.sql${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipping trigger installation${NC}"
    echo ""
fi

# Verification
echo -e "${BLUE}Running verification queries...${NC}"
echo ""

echo -e "${YELLOW}Status distribution:${NC}"
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << EOF
SELECT 
    status,
    active,
    COUNT(*) as count,
    COUNT(CASE WHEN subscription_expires_at IS NOT NULL THEN 1 END) as with_expiry,
    COUNT(CASE WHEN subscription_expires_at <= NOW() THEN 1 END) as past_expiry
FROM customer_services 
GROUP BY status, active 
ORDER BY status, active;
EOF

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✓ Setup Complete!                                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Restart your application: npm run start:dev"
echo "2. The scheduler will run hourly to check for expired subscriptions"
echo "3. Review the documentation: docs/SUBSCRIPTION_STATUS_MANAGEMENT.md"
echo ""
echo -e "${YELLOW}Note: TypeScript may show temporary errors until you restart the dev server${NC}"
