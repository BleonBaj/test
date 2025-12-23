# Database Schema Information

## 📊 Skedarët e Databazës

### 1. `schema.sql` (DEPRECATED - MOS E PËRDOR)
- Schema e vjetër që nuk përfshin migration-et
- Përdor `schema_complete.sql` në vend të kësaj

### 2. `schema_complete.sql` ⭐ (REKOMANDOHET)
- Schema e plotë dhe e konsoliduar
- Përfshin të gjitha tabelat nga migrations
- Gati për deployment
- Përmban të gjitha indexes dhe foreign keys
- Default data për PIN permissions dhe settings

### 3. `database.sql`
- Schema + seed data (të dhëna example)
- Përdor për testing/development
- NUK rekomandohet për production (ka të dhëna test)

## 🗄️ Tabelat në Schema

### Tabela kryesore (Core)
1. **admins** - Administratorët e sistemit
   - Kolona kryesore: username, email, password_hash, management_pin_hash
   - Unique: username, email, public_id

2. **settings** - Cilësimet e aplikacionit
   - Groups: app, business, security

### Tabela të sigurisë (Security)
3. **activity_logs** - Audit trail për të gjitha veprimet
4. **pin_audit_logs** - Audit trail specifik për PIN
5. **login_attempts** - Rate limiting për login
6. **password_reset_tokens** - Tokens për reset password
7. **permission_access_tokens** - Tokens për akses në permissions
8. **pin_permissions** - Konfigurim për çdo veprim që kërkon PIN

### Tabela akademike (Academic)
9. **courses** - Kurset
10. **students** - Studentët
11. **professors** - Profesorët
12. **classes** - Klasat
13. **class_professors** - Lidhja klasa-profesorë
14. **class_students** - Lidhja klasa-studentë
15. **class_payment_plan** - Plani i pagesave për klasa

### Tabela financiare (Financial)
16. **student_invoices** - Faturat e studentëve
17. **salary_statements** - Pagat e profesorëve

## 🔑 Indexes të Rëndësishëm

### Performance Indexes
- `idx_activity_admin` - Shpejton query-t për activity logs
- `idx_login_identifier_time` - Rate limiting i shpejtë
- `idx_invoice_class_month` - Query-t për faturat
- `idx_salary_prof_month` - Query-t për pagat
- `idx_pin_entity_action` - Kontrolli i shpejtë i lejeve

### Unique Constraints
- Të gjitha `public_id` janë unique
- `username` dhe `email` janë unique për admins
- `national_id` është unique për students
- `email` është unique për professors

## 🔗 Foreign Keys

### Cascade Behavior
**ON DELETE RESTRICT:**
- courses → classes (nuk fshihet kursi nëse ka klasa)
- students/professors → class_students/class_professors
- Parandalon fshirjen e gabuar të të dhënave

**ON DELETE SET NULL:**
- admins → confirmed_by (fshirja e adminit nuk ndikon faturat)

**ON DELETE CASCADE:**
- admins → tokens (fshirja e adminit fshin edhe tokens)

## 📝 Deployment Instructions

### Deployment i Ri (Fresh Install)
```bash
# Hapi 1: Krijo databazën
mysql -u username -p -e "CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# Hapi 2: Importo schema e plotë
mysql -u username -p bts_ms < database/schema_complete.sql

# Hapi 3: Krijo admin user
php create_admin.php

# MBAROI! Të gjitha tabelat dhe default data janë gati.
```

### Update i Databazës Ekzistuese
Nëse ke databazë ekzistuese dhe do të përditësosh:
```bash
# Ekzekuto migrations në rend
mysql -u username -p bts_ms < database/migrations/001_add_security_features.sql
mysql -u username -p bts_ms < database/migrations/002_prevent_cascade_deletes.sql
mysql -u username -p bts_ms < database/migrations/003_pin_permissions.sql
mysql -u username -p bts_ms < database/migrations/004_add_invoice_salary_permissions.sql
```

## ⚠️ TË RËNDËSISHME

### 1. Collation
Të gjitha tabelat përdorin `utf8mb4_unicode_ci` për mbështetje të plotë Unicode.

### 2. Engine
Të gjitha tabelat përdorin `InnoDB` për transaction support dhe foreign keys.

### 3. Timestamps
Të gjitha tabelat kanë `created_at` dhe shumica kanë `updated_at` (auto-update).

### 4. JSON Fields
- `schedule` në classes
- `notes` në invoices
- `context` në activity_logs
- `metadata` në pin_audit_logs

### 5. DECIMAL për Para
Të gjitha fushat për para përdorin `DECIMAL(10,2)` për precision të saktë.

## 🔍 Verifikimi pas Importit

```sql
-- Kontrollo që të gjitha tabelat janë krijuar
SHOW TABLES;

-- Duhet të ketë 17 tabela
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'bts_ms';

-- Kontrollo foreign keys
SELECT 
  TABLE_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'bts_ms' 
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Kontrollo indexes
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  SEQ_IN_INDEX,
  COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'bts_ms'
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
```

## 📦 Backup dhe Restore

### Backup
```bash
# Backup i plotë
mysqldump -u username -p bts_ms > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup pa të dhëna (vetëm struktura)
mysqldump -u username -p --no-data bts_ms > backup_structure_only.sql
```

### Restore
```bash
mysql -u username -p bts_ms < backup_file.sql
```

## 🚀 Ready for Production

Schema është e optimizuar dhe e testuar për production:
- ✅ Të gjitha foreign keys janë të sakta
- ✅ Indexes për performance
- ✅ UTF-8 support i plotë
- ✅ Transaction support (InnoDB)
- ✅ Audit logging i plotë
- ✅ Security features të integruara
- ✅ Default data për të filluar shpejt

