# Migration Fix Summary

## Problem
The database migration was failing with a SQL syntax error:
```
ERROR:  syntax error at or near "NOT" at character 46
STATEMENT:  ALTER TABLE budget_entries ADD CONSTRAINT IF NOT EXISTS check_entry_type CHECK (entry_type IN ('income', 'expense'));
```

## Root Cause
The `node-pg-migrate` library's `pgm.addConstraint()` method was generating SQL with `IF NOT EXISTS` clause, which PostgreSQL does not support with `ADD CONSTRAINT` statements.

## Solution
Changed the migration file to use raw SQL instead:

**Before:**
```javascript
pgm.addConstraint('budget_entries', 'check_entry_type', {
  check: "entry_type IN ('income', 'expense')"
});
```

**After:**
```javascript
// Use raw SQL to avoid IF NOT EXISTS syntax error
pgm.sql("ALTER TABLE budget_entries ADD CONSTRAINT check_entry_type CHECK (entry_type IN ('income', 'expense'))");
```

## Steps Taken
1. Identified error by inspecting Docker container logs: `docker logs budget-db`
2. Found the problematic migration file: `migrations/1708371600000_create-budget-entries-table.js`
3. Fixed the migration by replacing `pgm.addConstraint()` with `pgm.sql()`
4. Restarted Docker container from scratch to clear old state
5. Verified migration succeeded in both local PostgreSQL server and Docker container

## Additional Notes
- There was a local PostgreSQL server running on port 5432, which took precedence over the Docker container
- The migration succeeded on the local server after creating the `budgetdb` database
- Also manually applied the migration to the Docker container to ensure consistency
- Both databases now have the correct table structure with the check constraint

## Files Modified
- `migrations/1708371600000_create-budget-entries-table.js` - Fixed constraint creation
