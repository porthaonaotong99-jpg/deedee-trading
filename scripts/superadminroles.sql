
INSERT INTO roles (name, status, created_at, updated_at)
VALUES ('Super Admin', 'active', NOW(), NOW())
ON CONFLICT DO NOTHING;


INSERT INTO role_permissions (id, name, status, role_id, permission_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.name,
  'active',
  r.id,
  p.id,
  NOW(),
  NOW()
FROM permissions p
CROSS JOIN roles r
WHERE r.name = 'Super Admin'
AND NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'Super Admin' LIMIT 1),
    updated_at = NOW()
WHERE username = 'admin';


-- Add payment permissions
INSERT INTO permissions (id, name, description, group_name, status, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'payments:read', 'View payments', 'Payments', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'payments:approve', 'Approve payments', 'Payments', 'active', NOW(), NOW()),
  (gen_random_uuid(), 'payments:reject', 'Reject payments', 'Payments', 'active', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Assign to Super Admin role
INSERT INTO role_permissions (id, name, status, role_id, permission_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  p.name,
  'active',
  r.id,
  p.id,
  NOW(),
  NOW()
FROM permissions p
CROSS JOIN roles r
WHERE r.name = 'Super Admin'
  AND p.name IN ('payments:read', 'payments:approve', 'payments:reject')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );


  -- Add subscription package permissions
INSERT INTO permissions (name, description) VALUES
('subscription-packages:create', 'Create subscription packages'),
('subscription-packages:update', 'Update subscription packages'),
('subscription-packages:delete', 'Delete subscription packages')
ON CONFLICT (name) DO NOTHING;

-- Grant to super_admin role (if not already)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p 
WHERE r.name = 'super_admin' 
AND p.name IN ('subscription-packages:create', 'subscription-packages:update', 'subscription-packages:delete')
ON CONFLICT DO NOTHING;