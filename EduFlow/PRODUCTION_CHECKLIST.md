# Production Checklist ✅

Përdor këtë checklist para se të bësh deployment.

## 📦 Para Upload-it

- [ ] Testo lokalisht që të gjitha funksionojnë
- [ ] Kontrollo që nuk ka passwords/credentials në kod
- [ ] Verifiko që `.gitignore` përfshin `config/config.php`
- [ ] Hiq skedarë test: `test_*.php`, `check_*.php`, `update_*.php`
- [ ] Backup i databazës lokale (nëse ka të dhëna të rëndësishme)

## 🗄️ Databaza në Server

- [ ] Krijo databazën: `CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
- [ ] Importo `database/schema_complete.sql` (përfshin të gjitha migrations)
- [ ] Krijo admin user: `php create_admin.php`
- [ ] Verifiko që username është: `admin`
- [ ] Verifiko që email-i në databazë është i saktë
- [ ] Kontrollo që 17 tabela janë krijuar: `SHOW TABLES;`

## ⚙️ Konfigurimi

- [ ] Kopjo `config/config.php.example` në `config/config.php`
- [ ] Vendos DB credentials (host, name, user, pass)
- [ ] Vendos SMTP credentials (host, port, username, password)
- [ ] Vendos email-in e duhur në `admin_email`
- [ ] Aktivizo: `account_lock_enabled` => `true`
- [ ] Aktivizo: `rate_limit_enabled` => `true`
- [ ] MOS e vendos SMTP password direkt — përdor environment variables

## 📁 Permissions (në server)

- [ ] `chmod 755 storage/`
- [ ] `chmod 755 storage/sessions/`
- [ ] `chmod 755 public/uploads/`
- [ ] Verifiko që `storage/sessions/` është writable
- [ ] Verifiko që `public/uploads/` është writable

## 🔐 Siguria

- [ ] HTTPS aktivizuar (SSL certificate)
- [ ] Password i fortë për admin
- [ ] PIN i fortë për admin (jo i njëjtë me password)
- [ ] SMTP password i sigurt (App Password për Gmail)
- [ ] Kontrollo që `config.php` nuk është i aksesuar publikisht
- [ ] Verifiko që `.htaccess` bllokon aksesin në folderat e ndjeshëm

## ✉️ Email Testing

- [ ] Testo login — duhet të vij kodi në email
- [ ] Testo reset password — duhet të vij kodi
- [ ] Testo permissions — duhet të vij kodi
- [ ] Nëse email-et nuk vijnë, kontrollo SMTP config dhe logs

## 🧪 Testimi Funksional

- [ ] Login me username `admin` funksionon
- [ ] 2FA code vjen në email dhe funksionon
- [ ] Dashboard shfaqet pas login-it
- [ ] Settings mund të hapen dhe ruhen
- [ ] Permissions mund të hapen me verifikim
- [ ] PIN mund të nderrohet nga Permissions
- [ ] CRUD operations funksionojnë për:
  - [ ] Kurse
  - [ ] Klasa
  - [ ] Studentë
  - [ ] Profesorë
  - [ ] Faturat
  - [ ] Pagat

## 📊 Monitorimi

- [ ] Error logs vendosur dhe të aksesueshëm
- [ ] Activity logs regjistrohen në databazë
- [ ] Backup automatik i databazës konfiguruar
- [ ] Plan për përditsime dhe maintenance

## ⚡ Performance

- [ ] PHP opcache aktivizuar (nëse disponohet)
- [ ] Database indexes ekzistojnë (nga migrations)
- [ ] Session cleanup konfiguruar
- [ ] Old login_attempts pastrohen periodikisht

## 🔄 Post-Deployment

- [ ] Ndryshoni password-in default
- [ ] Ndryshoni PIN-in default
- [ ] Vendosni informacionin e kompanisë në Settings
- [ ] Upload-oni logo-n e kompanisë
- [ ] Konfiguroni lejet sipas nevojës
- [ ] Testoni të gjitha funksionalitetet një herë të fundit

---

## ❌ PROBLEME TË ZAKONSHME

### Email-et nuk po vijnë
✅ Kontrollo SMTP credentials
✅ Verifiko App Password për Gmail
✅ Kontrollo që email-i në databazë është i saktë
✅ Shiko error logs për SMTP errors

### Database connection error
✅ Verifiko credentials në config.php
✅ Kontrollo që databaza ekziston
✅ Provo connection me MySQL command line

### 401 Unauthorized
✅ Shiko që sessions funksionojnë
✅ Verifiko që `storage/sessions/` është writable
✅ Kontrollo që cookies pranohen

### CSRF Token errors
✅ Verifiko që sessions funksionojnë
✅ Kontrollo që `/api/csrf.php` është i aksesuar

---

## 📞 Kontakt për Probleme

Nëse ke probleme serioze:
1. Merr backup të databazës
2. Ruaj error logs
3. Shkruaj detajet e problemit
4. Kontakto support

**Projekti është gati për production! 🚀**

