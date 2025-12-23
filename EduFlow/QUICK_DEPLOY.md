# 🚀 Quick Deploy Guide - 5 Minuta

Deployment i shpejtë në 5 hapa.

## ⚡ Hapa të shpejtë

### 1. Upload Files (1 min)
```bash
# Përmes FTP/SFTP, upload të gjithë projektin
# OSE përmes Git:
git clone your-repo-url
cd bts-ms
```

### 2. Databaza (2 min)
```bash
# Krijo databazën
mysql -u username -p -e "CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# Importo schema-n e plotë (përfshin të gjitha migrations)
mysql -u username -p bts_ms < database/schema_complete.sql

# Krijo admin
php create_admin.php
```

Kur të pyet për credentials, vendos:
- Email: `your-email@example.com`
- Password: `your_secure_password`
- Name: `Administrator`

### 3. Config (1 min)
Edito `config/config.php`:

```php
'db' => [
    'host' => 'localhost',
    'name' => 'bts_ms',
    'user' => 'db_username',
    'pass' => 'db_password',
],

'email' => [
    'smtp_enabled' => true,
    'smtp_host' => 'smtp.gmail.com',
    'smtp_username' => 'your-email@gmail.com',
    'smtp_password' => 'your-app-password',  // Google App Password
],

'app' => [
    'admin_email' => 'your-email@example.com',  // Duhet të përputhet me email në DB
],
```

### 4. Permissions (30 sek)
```bash
chmod 755 storage/sessions/
chmod 755 public/uploads/
```

### 5. Test (30 sek)
Hap në browser:
```
https://your-domain.com/public/index.php
```

Login:
- Username: `admin`
- Password: `your_secure_password`
- Kodi vjen në email

---

## ✅ Done!

Nëse gjithçka funksionon:
- ✅ Login successful
- ✅ Email-et po vijnë
- ✅ Dashboard hapet

## ❌ Probleme?

### Email-et nuk po vijnë
1. Kontrollo SMTP credentials në `config.php`
2. Verifiko Google App Password
3. Kontrollo që email-i në DB përputhet me config

### Database connection error
1. Verifiko credentials në `config.php`
2. Provo: `mysql -u username -p bts_ms`
3. Kontrollo që MySQL është i kyçur

### 401 Unauthorized
1. Kontrollo që `storage/sessions/` është writable
2. Testo: `ls -la storage/sessions/`

---

## 📞 Mbështetje

Shiko dokumentet e plota:
- `DEPLOYMENT.md` - Udhëzues i plotë
- `PRODUCTION_CHECKLIST.md` - Lista kontrolluese
- `database/SCHEMA_INFO.md` - Info për databazën

**Happy Deploying! 🎉**

