INSERT INTO permissions (name, description, group_name, status, created_at, updated_at)
VALUES
  -- Customer Management Permissions
  ('customers:create', 'Create new customers', 'Customers', 'active', NOW(), NOW()),
  ('customers:read', 'View customer list and details', 'Customers', 'active', NOW(), NOW()),
  ('customers:update', 'Update customer info, status, ban/activate', 'Customers', 'active', NOW(), NOW()),
  ('customers:delete', 'Delete customers', 'Customers', 'active', NOW(), NOW()),
  
  -- User Management Permissions
  ('users:create', 'Create admin users', 'Users', 'active', NOW(), NOW()),
  ('users:read', 'View admin users', 'Users', 'active', NOW(), NOW()),
  ('users:update', 'Update admin users', 'Users', 'active', NOW(), NOW()),
  ('users:delete', 'Delete admin users', 'Users', 'active', NOW(), NOW()),
  
  -- Role Management Permissions
  ('roles:create', 'Create roles', 'Roles', 'active', NOW(), NOW()),
  ('roles:read', 'View roles', 'Roles', 'active', NOW(), NOW()),
  ('roles:update', 'Update roles and assign permissions', 'Roles', 'active', NOW(), NOW()),
  ('roles:delete', 'Delete roles', 'Roles', 'active', NOW(), NOW()),
  
  -- Permission Management
  ('permissions:create', 'Create permissions', 'Permissions', 'active', NOW(), NOW()),
  ('permissions:read', 'View permissions', 'Permissions', 'active', NOW(), NOW()),
  ('permissions:update', 'Update permissions', 'Permissions', 'active', NOW(), NOW()),
  ('permissions:delete', 'Delete permissions', 'Permissions', 'active', NOW(), NOW()),
  
  -- Wallet Management
  ('wallets:read', 'View wallet information', 'Wallets', 'active', NOW(), NOW()),
  ('wallets:topup:approve', 'Approve wallet topup requests', 'Wallets', 'active', NOW(), NOW()),
  ('wallets:topup:reject', 'Reject wallet topup requests', 'Wallets', 'active', NOW(), NOW()),
  
  -- Stock Management
  ('stocks:create', 'Create stocks', 'Stocks', 'active', NOW(), NOW()),
  ('stocks:read', 'View stocks', 'Stocks', 'active', NOW(), NOW()),
  ('stocks:update', 'Update stocks', 'Stocks', 'active', NOW(), NOW()),
  ('stocks:delete', 'Delete stocks', 'Stocks', 'active', NOW(), NOW()),
  
  -- Stock Categories
  ('stock-categories:create', 'Create stock categories', 'Stock Categories', 'active', NOW(), NOW()),
  ('stock-categories:read', 'View stock categories', 'Stock Categories', 'active', NOW(), NOW()),
  ('stock-categories:update', 'Update stock categories', 'Stock Categories', 'active', NOW(), NOW()),
  ('stock-categories:delete', 'Delete stock categories', 'Stock Categories', 'active', NOW(), NOW()),
  
  -- Customer Stocks
  ('customer-stocks:read', 'View customer stock holdings', 'Customer Stocks', 'active', NOW(), NOW()),
  
  -- Stock Transactions
  ('stock-transactions:read', 'View stock transactions', 'Stock Transactions', 'active', NOW(), NOW()),
  
  -- Subscription Packages
  ('subscription-packages:create', 'Create subscription packages', 'Subscriptions', 'active', NOW(), NOW()),
  ('subscription-packages:read', 'View subscription packages', 'Subscriptions', 'active', NOW(), NOW()),
  ('subscription-packages:update', 'Update subscription packages', 'Subscriptions', 'active', NOW(), NOW()),
  ('subscription-packages:delete', 'Delete subscription packages', 'Subscriptions', 'active', NOW(), NOW()),
  
  -- Invest Types
  ('invest-types:create', 'Create invest types', 'Invest Types', 'active', NOW(), NOW()),
  ('invest-types:read', 'View invest types', 'Invest Types', 'active', NOW(), NOW()),
  ('invest-types:update', 'Update invest types', 'Invest Types', 'active', NOW(), NOW()),
  ('invest-types:delete', 'Delete invest types', 'Invest Types', 'active', NOW(), NOW()),
  
  -- Bounds
  ('bounds:create', 'Create bounds', 'Bounds', 'active', NOW(), NOW()),
  ('bounds:read', 'View bounds', 'Bounds', 'active', NOW(), NOW()),
  ('bounds:update', 'Update bounds', 'Bounds', 'active', NOW(), NOW()),
  ('bounds:delete', 'Delete bounds', 'Bounds', 'active', NOW(), NOW()),
  
  -- Audit Logs
  ('audit-logs:read', 'View audit logs', 'Audit Logs', 'active', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;