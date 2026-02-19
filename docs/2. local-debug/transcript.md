# Migration Debugging Transcript

## Initial Investigation

### Check Docker Containers
```bash
docker ps -a
# Found: budget-db container (postgres:16) running on port 5432
```

### Check Container Logs
```bash
docker logs budget-db 2>&1 | tail -100
```

**Error Found:**
```
2026-02-19 22:07:16.165 UTC [419] ERROR:  syntax error at or near "NOT" at character 46
2026-02-19 22:07:16.165 UTC [419] STATEMENT:  ALTER TABLE budget_entries ADD CONSTRAINT IF NOT EXISTS check_entry_type CHECK (entry_type IN ('income', 'expense'));
```

### Examine Migration File
```bash
cat migrations/1708371600000_create-budget-entries-table.js
```

**Problematic Code:**
```javascript
pgm.addConstraint('budget_entries', 'check_entry_type', {
  check: "entry_type IN ('income', 'expense')"
});
```

This generates SQL with `IF NOT EXISTS` which PostgreSQL doesn't support for `ADD CONSTRAINT`.

## Fix Implementation

### Update Migration File
```javascript
// Changed from pgm.addConstraint() to raw SQL
pgm.sql("ALTER TABLE budget_entries ADD CONSTRAINT check_entry_type CHECK (entry_type IN ('income', 'expense'))");
```

### Reset Docker Container
```bash
# Stop and remove container
docker stop budget-db && docker rm budget-db

# Remove volume to start fresh
docker volume rm budget-tracking-processor_postgres-data

# Start container
docker-compose up -d postgres
```

### Run Migration

**Discovery:** Local PostgreSQL server on port 5432 interfered with connection

```bash
# Created database on local server
psql -U mfisher -h localhost -d postgres -c "CREATE DATABASE budgetdb;"

# Run migration (connected to local server)
npm run migrate:local:up
```

**Result:** ✅ Migration succeeded on local PostgreSQL server

### Apply to Docker Container

```bash
# Manually run migration SQL in Docker container
docker exec budget-db psql -U postgres -d budgetdb -f /tmp/run_migration.sql
```

**Result:** ✅ Migration succeeded in Docker container

## Verification

### Check Table Structure (Local)
```bash
psql -U mfisher -h localhost -d budgetdb -c "\d budget_entries"
```

### Check Table Structure (Docker)
```bash
docker exec budget-db psql -U postgres -d budgetdb -c "\d budget_entries"
```

Both showed:
```
Table "public.budget_entries"
   Column    |            Type             | Nullable |                  Default                   
-------------+-----------------------------+----------+--------------------------------------------
 id          | integer                     | not null | nextval('budget_entries_id_seq'::regclass)
 entry_date  | date                        | not null | 
 category    | character varying(100)      | not null | 
 description | text                        |          | 
 amount      | numeric(10,2)               | not null | 
 entry_type  | character varying(20)       | not null | 
 created_at  | timestamp without time zone | not null | CURRENT_TIMESTAMP
 source_file | character varying(255)      |          | 

Indexes:
    "budget_entries_pkey" PRIMARY KEY, btree (id)
    "budget_entries_category_index" btree (category)
    "budget_entries_entry_date_index" btree (entry_date)
    "budget_entries_entry_type_index" btree (entry_type)
    
Check constraints:
    "check_entry_type" CHECK (entry_type IN ('income', 'expense'))
```

### Check Docker Logs
```bash
docker logs budget-db 2>&1 | tail -20
# No errors - clean startup
```

## Lessons Learned

1. **Always check container logs** when migrations fail silently or partially
2. **PostgreSQL doesn't support `IF NOT EXISTS` with `ADD CONSTRAINT`** - use raw SQL or handle constraint existence differently
3. **Local services can interfere** - be aware of port conflicts with local PostgreSQL installations
4. **node-pg-migrate** may generate incompatible SQL depending on database version
5. **Starting fresh** (removing volumes) is sometimes the cleanest approach when state is corrupted
