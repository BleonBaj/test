# Udhëzues për Deployment - BTS Management System

## 📋 Checklist para Deployment

- [ ] Konfigurimi i databazës
- [ ] Konfigurimi i SMTP për email
- [ ] Sigurimi i kredencialeve
- [ ] Upload të skedarëve në server
- [ ] Testimi i funksioneve kryesore

---

## 1️⃣ PËRGATITJA E SERVERIT

### A. Kërkesat e Serverit
- **PHP:** 7.4 ose më i ri
- **MySQL/MariaDB:** 5.7+ / 10.2+
- **Extensions PHP:** PDO, PDO_MySQL, mbstring, json
- **HTTPS:** Rekomandohet (por funksionon edhe me HTTP)

### B. Struktura e folderave
```
public_html/
├── config/
├── includes/
├── database/
├── partials/
├── storage/
│   └── sessions/       (duhet të jetë writable)
└── public/
    ├── api/
    ├── assets/
    └── uploads/        (duhet të jetë writable)
```

---

## 2️⃣ KONFIGURIMI I DATABAZËS

### Hapi 1: Krijo databazën
Në phpMyAdmin ose MySQL command line:

```sql
CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Hapi 2: Importo schema-n e plotë
**REKOMANDIM:** Përdor `schema_complete.sql` (përfshin të gjitha migrations):

```bash
mysql -u username -p bts_ms < database/schema_complete.sql
```

Ose përmes phpMyAdmin:
1. Hap phpMyAdmin
2. Zgjedh databazën `bts_ms`
3. Shko në tab "Import"
4. Zgjedh `database/schema_complete.sql`
5. Kliko "Go"

**SHËNIM:** `schema_complete.sql` përfshin të gjitha tabelat dhe default data. NUK duhen migrations të veçanta!

### Hapi 3: Krijo përdoruesin admin
```bash
php create_admin.php
```

Ose manualisht në MySQL:
```sql
INSERT INTO admins (public_id, username, name, email, password_hash, management_pin_hash)
VALUES (
    'A00001',
    'admin',
    'Administrator',
    'your-email@example.com',
    -- Password: your_password (hash me password_hash në PHP)
    '$2y$10$...',
    -- PIN: your_pin (hash me password_hash në PHP)
    '$2y$10$...'
);
```

---

## 3️⃣ KONFIGURIMI I config.php

### A. Databaza
Edito `config/config.php`:

```php
'db' => [
    'host' => 'localhost',           // Ose adresa e DB serverit
    'port' => 3306,
    'name' => 'bts_ms',              // Emri i databazës
    'user' => 'db_username',         // Username për MySQL
    'pass' => 'db_password',         // Password për MySQL
    'charset' => 'utf8mb4',
],
```

### B. SMTP Configuration (PËR EMAIL)

**SHUMË E RËNDËSISHME:** Për të dërguar email-e, konfiguro SMTP:

```php
'email' => [
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',              // Ose SMTP i tjetër
    'smtp_port' => 587,                           // 587 për TLS, 465 për SSL
    'smtp_encryption' => 'tls',                   // 'tls' ose 'ssl'
    'smtp_username' => 'your-email@gmail.com',    // Email për SMTP
    'smtp_password' => 'your-app-password',       // App Password (Google)
    'from_email' => '',                           // Bosh = përdor smtp_username
    'from_name' => 'BTS Management System',
],
```

#### Si të merrësh Google App Password:
1. Shko në: https://myaccount.google.com/apppasswords
2. Zgjedh "Mail" dhe "Other device"
3. Emërto: "BTS Management System"
4. Kopjo password-in 16-shifror
5. Vendose në `smtp_password`

**KUJDES:** MOS e vendos password-in direkt në kod nëse projekti është në Git!
Përdor environment variables:
```apache
SetEnv SMTP_PASSWORD "your-app-password"
```

### C. Siguria (Production Settings)

```php
'security' => [
    'account_lock_enabled' => true,    // AKTIVIZO në production
    'account_lock_minutes' => 30,
    'rate_limit_enabled' => true,      // AKTIVIZO në production
    'rate_limit_max_attempts' => 5,
],
```

### D. Admin Email
```php
'app' => [
    'admin_email' => 'your-email@example.com',  // Email ku dërgohen kodet
],
```

**KUJDES:** Ky email duhet të përputhet me email-in e adminit në databazë!

---

## 4️⃣ UPLOAD I SKEDARËVE NË SERVER

### Metoda 1: FTP/SFTP
1. Upload të gjithë folderët dhe skedarët
2. **MOS upload-o:** `node_modules/`, `cypress/`, `.git/`
3. **Përjashto:** `config/config.php` (konfiguro direkt në server)

### Metoda 2: Git (nëse serveri ka SSH)
```bash
git clone your-repo-url
cd bts-ms
cp config/config.php.example config/config.php
# Edito config.php me kredencialet e serverit
nano config/config.php
```

---

## 5️⃣ PERMISSIONS I FOLDERAVE

Në server, vendos permissions:

```bash
# Storage dhe uploads duhet të jenë writable
chmod 755 storage/
chmod 755 storage/sessions/
chmod 755 public/uploads/

# Nëse nuk mjafton, provo:
chmod 777 storage/sessions/
chmod 777 public/uploads/
```

**KUJDES:** `chmod 777` është më pak i sigurt, përdore vetëm nëse `755` nuk funksionon.

---

## 6️⃣ DOCUMENT ROOT (Shumë e rëndësishme!)

### A. Nëse mund ta ndryshosh Document Root
Vendos Document Root në `/path/to/bts-ms/public/`

Në `.htaccess` ose konfigurimin e Apache/Nginx:
```apache
DocumentRoot /home/username/public_html/bts-ms/public
```

### B. Nëse NUK mund ta ndryshosh Document Root
Nëse projekti është në subfolder (p.sh. `example.com/bts-ms/`):

1. **Kontrollo që URL-et funksionojnë:**
   - Login: `example.com/bts-ms/public/index.php`
   - Dashboard: `example.com/bts-ms/public/dashboard.php`

2. **Opsionale:** Krijo `.htaccess` në root:
```apache
# Redirect nga root në public/
RewriteEngine On
RewriteRule ^$ public/ [L]
RewriteRule (.*) public/$1 [L]
```

---

## 7️⃣ TESTIMI PAS DEPLOYMENT

### A. Testo Login-in
1. Hap: `your-domain.com/public/index.php`
2. Shkruaj:
   - Username: `admin`
   - Password: `your_password`
3. Duhet të vij kodi në email
4. Shkruaj kodin dhe kompleton login-in

### B. Testo Email Sending
Nëse email-et NUK po vijnë:
1. Kontrollo SMTP config në `config/config.php`
2. Kontrollo error logs në server:
   ```bash
   tail -f /var/log/apache2/error.log
   # Ose
   tail -f /var/log/php-fpm/error.log
   ```
3. Verifiko që Google App Password është i saktë
4. Testo SMTP me një script të thjeshtë

### C. Testo Permissions
1. Shko në Settings
2. Kliko "Menaxhimi i PASSCODE"
3. Shkruaj username: `admin`
4. Duhet të vij kodi në email
5. Shkruaj kodin dhe testo ndryshimin e lejeve

---

## 8️⃣ SIGURIA (Production)

### A. Mbrojtja e config.php
1. **Sigurohu që `.gitignore` e përjashton `config/config.php`**
2. **MOS e vendos kurrë në Git me kredenciale të vërteta**
3. Përdor environment variables për credentials të ndjeshme

### B. HTTPS (E rekomanduar)
Instalo SSL certificate:
- **Falas:** Let's Encrypt (përmes Certbot)
- **Hosting:** Shumica e hosting providers ofrojnë SSL falas

### C. Permissions i skedarëve
```bash
# Skedarët readonly
find . -type f -exec chmod 644 {} \;

# Folderët executable
find . -type d -exec chmod 755 {} \;

# Writable folders
chmod 755 storage/sessions/
chmod 755 public/uploads/
```

### D. Fshij skedarë test
```bash
rm -f public/test_*.php
rm -f check_admin.php
rm -f update_*.php
```

---

## 9️⃣ ENVIRONMENT VARIABLES (Opsionale, por i rekomanduar)

### Në .htaccess ose httpd.conf:
```apache
SetEnv DB_HOST "localhost"
SetEnv DB_NAME "bts_ms"
SetEnv DB_USER "db_username"
SetEnv DB_PASS "db_password"

SetEnv SMTP_HOST "smtp.gmail.com"
SetEnv SMTP_USERNAME "your-email@gmail.com"
SetEnv SMTP_PASSWORD "your-app-password"

SetEnv ACCOUNT_LOCK_ENABLED "true"
SetEnv RATE_LIMIT_ENABLED "true"
```

Pastaj në `config.php` (tashmë e konfiguruar):
```php
'host' => $env('DB_HOST', '127.0.0.1'),
'smtp_password' => $env('SMTP_PASSWORD', ''),
```

---

## 🔟 TROUBLESHOOTING

### Problem: Email-et nuk po vijnë
**Zgjidhje:**
1. Kontrollo SMTP credentials në `config.php`
2. Verifiko që email-i i adminit në databazë është i saktë:
   ```sql
   SELECT username, email FROM admins WHERE username = 'admin';
   ```
3. Kontrollo error logs për gabime SMTP
4. Testo me një script të thjeshtë SMTP

### Problem: Database connection error
**Zgjidhje:**
1. Verifiko credentials në `config.php`
2. Sigurohu që databaza ekziston
3. Kontrollo që MySQL është i aksesuar nga host-i
4. Provo: `mysql -u username -p -h localhost bts_ms`

### Problem: Session errors
**Zgjidhje:**
1. Sigurohu që `storage/sessions/` është writable
2. Kontrollo session config në `php.ini`
3. Vendos session path nëse nevojitet

### Problem: 404 Not Found
**Zgjidhje:**
1. Verifiko Document Root
2. Kontrollo që `.htaccess` funksionon (mod_rewrite aktiv)
3. Provo URL-të direkt: `/public/index.php`

---

## 📊 MONITORIMI PAS DEPLOYMENT

### Error Logs
Kontrollo rregullisht:
```bash
tail -f /var/log/apache2/error.log
tail -f /var/log/php-fpm/error.log
```

### Database Backups
Krijo backup automatik:
```bash
# Cron job për backup ditor
0 2 * * * mysqldump -u username -p'password' bts_ms > /backups/bts_ms_$(date +\%Y\%m\%d).sql
```

### Activity Logs
Projekti ruan activity logs në databazë:
```sql
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100;
```

---

## 🚀 DEPLOYMENT I SHPEJTË (Quickstart)

```bash
# 1. Upload files to server
# 2. Create database
mysql -u root -p -e "CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# 3. Import complete schema (includes all migrations)
mysql -u root -p bts_ms < database/schema_complete.sql

# 4. Create admin user
php create_admin.php

# 5. Configure config.php
nano config/config.php
# Update: DB credentials, SMTP credentials, admin email

# 7. Set permissions
chmod 755 storage/sessions/
chmod 755 public/uploads/

# 8. Test login
# Visit: your-domain.com/public/index.php
```

---

## 📝 KREDENCIALET E ADMINIT

Pas deployment-it, ruaj këto info:

```
Username: admin
Password: [password që vendose në create_admin.php]
Email: [email-i në databazë për marrjen e kodeve]
PIN: [PIN që vendose, ose e njëjta me password]
```

**KUJDES:** Ndrysho password-in dhe PIN-in menjëherë pas login-it të parë!

---

## ⚠️ SIGURIA - TË RËNDËSISHME

### 1. MOS vendos credentials në Git
```bash
# Verifiko .gitignore
cat .gitignore | grep config.php
```

### 2. Ndryshoni të gjitha passwords dhe PINs
- Pas deployment-it, ndrysho password-in default
- Vendos PIN të fortë (8+ karaktere)

### 3. Aktivizo veçoritë e sigurisë
Në `config.php`:
```php
'account_lock_enabled' => true,
'rate_limit_enabled' => true,
```

### 4. Vendos email-in tuaj real
Përditëso email-in e adminit në databazë:
```sql
UPDATE admins SET email = 'your-real-email@example.com' WHERE username = 'admin';
```

---

## 📞 MBËSHTETJE

Nëse ke probleme:
1. Kontrollo error logs
2. Verifiko që të gjitha hapat janë ndjekur
3. Testo çdo funksion individualisht

---

## ✅ LISTA E PLOTË E HAPAVE

1. ✅ Upload files në server
2. ✅ Krijo databazën
3. ✅ Importo schema dhe migrations
4. ✅ Krijo admin user
5. ✅ Konfiguro `config.php` (DB + SMTP)
6. ✅ Vendos permissions për `storage/` dhe `uploads/`
7. ✅ Testo login-in
8. ✅ Testo dërgimin e email-it
9. ✅ Ndrysho password dhe PIN
10. ✅ Aktivizo veçoritë e sigurisë

---

## 🎯 DEPLOYMENT I KOMPLETUAR

Pas përfundimit të të gjithë hapave, aplikacioni duhet të funksionojë plotësisht:

- ✅ Login me username + password + 2FA code
- ✅ Email-et dërgohen automatikisht
- ✅ Dashboard me të gjitha funksionalitetet
- ✅ Settings dhe Permissions
- ✅ CRUD për të gjitha entitetet
- ✅ Sistemi i sigurisë aktiv

**Urime! Projekti juaj është live! 🎉**

