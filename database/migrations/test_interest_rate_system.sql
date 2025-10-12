-- Test script for Interest Rate Configuration System
-- Run this after creating the table to verify the system works correctly

-- 1. Display all active configurations
SELECT 
    tier_name,
    risk_tolerance,
    '$' || to_char(min_amount, 'FM999,999,999') AS min_amount,
    CASE 
        WHEN max_amount IS NULL THEN 'No Limit'
        ELSE '$' || to_char(max_amount, 'FM999,999,999')
    END AS max_amount,
    (base_interest_rate * 100) || '%' AS base_rate,
    (risk_adjustment * 100) || '%' AS risk_adjustment,
    (final_interest_rate * 100) || '%' AS final_rate,
    description
FROM interest_rate_configurations
WHERE is_active = true
ORDER BY sort_order;

-- 2. Test interest rate calculation for different scenarios
-- Test Case 1: $15,000 investment with medium risk
SELECT 
    tier_name,
    risk_tolerance,
    (final_interest_rate * 100) || '%' AS interest_rate,
    description
FROM interest_rate_configurations
WHERE is_active = true
  AND 15000 >= min_amount 
  AND (max_amount IS NULL OR 15000 <= max_amount)
  AND risk_tolerance = 'medium';

-- Test Case 2: $75,000 investment with high risk
SELECT 
    tier_name,
    risk_tolerance,
    (final_interest_rate * 100) || '%' AS interest_rate,
    description
FROM interest_rate_configurations
WHERE is_active = true
  AND 75000 >= min_amount 
  AND (max_amount IS NULL OR 75000 <= max_amount)
  AND risk_tolerance = 'high';

-- Test Case 3: $150,000 investment with low risk
SELECT 
    tier_name,
    risk_tolerance,
    (final_interest_rate * 100) || '%' AS interest_rate,
    description
FROM interest_rate_configurations
WHERE is_active = true
  AND 150000 >= min_amount 
  AND (max_amount IS NULL OR 150000 <= max_amount)
  AND risk_tolerance = 'low';

-- 3. Summary of all tiers and risk combinations
SELECT 
    tier_name,
    COUNT(*) AS risk_levels,
    MIN(final_interest_rate * 100) || '% - ' || MAX(final_interest_rate * 100) || '%' AS rate_range,
    '$' || to_char(MIN(min_amount), 'FM999,999,999') AS tier_min_amount,
    CASE 
        WHEN MAX(max_amount) IS NULL THEN 'No Limit'
        ELSE '$' || to_char(MAX(max_amount), 'FM999,999,999')
    END AS tier_max_amount
FROM interest_rate_configurations
WHERE is_active = true
GROUP BY tier_name
ORDER BY MIN(min_amount);

-- 4. Verify data integrity
-- Check for overlapping ranges within same risk tolerance
WITH range_overlaps AS (
    SELECT 
        a.tier_name AS tier_a,
        a.risk_tolerance,
        a.min_amount AS min_a,
        a.max_amount AS max_a,
        b.tier_name AS tier_b,
        b.min_amount AS min_b,
        b.max_amount AS max_b
    FROM interest_rate_configurations a
    CROSS JOIN interest_rate_configurations b
    WHERE a.id != b.id
      AND a.risk_tolerance = b.risk_tolerance
      AND a.is_active = true
      AND b.is_active = true
      AND (
          (a.min_amount BETWEEN b.min_amount AND COALESCE(b.max_amount, 999999999))
          OR (COALESCE(a.max_amount, 999999999) BETWEEN b.min_amount AND COALESCE(b.max_amount, 999999999))
          OR (b.min_amount BETWEEN a.min_amount AND COALESCE(a.max_amount, 999999999))
      )
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'PASS: No overlapping ranges detected'
        ELSE 'FAIL: Found ' || COUNT(*) || ' overlapping ranges'
    END AS integrity_check
FROM range_overlaps;

-- 5. Check for gaps in coverage
-- This query finds amount ranges that might not be covered
WITH gaps AS (
    SELECT 
        risk_tolerance,
        LAG(max_amount) OVER (PARTITION BY risk_tolerance ORDER BY min_amount) AS prev_max,
        min_amount AS current_min
    FROM interest_rate_configurations
    WHERE is_active = true
)
SELECT 
    risk_tolerance,
    'Gap from $' || to_char(prev_max + 0.01, 'FM999,999,999.99') || 
    ' to $' || to_char(current_min - 0.01, 'FM999,999,999.99') AS gap_range
FROM gaps
WHERE prev_max IS NOT NULL 
  AND prev_max + 0.01 < current_min
ORDER BY risk_tolerance, current_min;