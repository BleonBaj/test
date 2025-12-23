# BTS Management System

Sistem menaxhimi për kurset e fizikës - i sigurt, i thjeshtë, dhe i gatshëm për production.

## 🎯 Përmbledhje

Aplikacion PHP për menaxhimin e:
- Kurseve dhe klasave
- Studentëve dhe profesorëve
- Faturave dhe pagesave
- Pagave të profesorëve
- Cilësimeve dhe lejeve

## ✨ Veçoritë Kryesore

### Siguria
- ✅ Login me 2FA (kodi dërgohet në email)
- ✅ Rate limiting për login
- ✅ Account locking pas tentativave të dështuara
- ✅ PIN verification për veprime kritike
- ✅ Audit logs për të gjitha veprimet
- ✅ CSRF protection
- ✅ Prepared statements (SQL injection protection)

### Funksionalitetet
- ✅ CRUD për të gjitha entitetet
- ✅ Menaxhimi i pagesave dhe faturave
- ✅ Menaxhimi i pagave
- ✅ Sistema e lejeve (PIN permissions)
- ✅ Shumëgjuhësi (Shqip/Anglisht)
- ✅ Email notifications automatike

## 📚 Dokumentacioni

### Për Development
- **`ARCHITECTURE.md`** - Struktura e projektit dhe si funksionon
- **`SETUP.md`** - Konfigurimi lokal (SMTP, environment variables)

### Për Deployment
- **`QUICK_DEPLOY.md`** ⭐ - Deploy në 5 minuta (filloni këtu!)
- **`DEPLOYMENT.md`** - Udhëzues i plotë për deployment
- **`PRODUCTION_CHECKLIST.md`** - Lista kontrolluese para deployment-it
- **`database/SCHEMA_INFO.md`** - Info për databazën

### Scripts
- **`check_ready_for_deploy.php`** - Verifikon që projekti është gati
- **`create_admin.php`** - Krijon përdoruesin admin
- **`run_migration.php`** - Ekzekuton migrations (opsionale)

## 🚀 Quick Start (Local)

### 1. Klono projektin
```bash
git clone your-repo-url
cd bts-ms
```

### 2. Konfiguro databazën
```bash
# Krijo databazën
mysql -u root -p -e "CREATE DATABASE bts_ms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

# Importo schema-n
mysql -u root -p bts_ms < database/schema_complete.sql

# Krijo admin
php scripts/create_admin.php
```

### 3. Konfiguro config.php
```bash
cp config/config.php.example config/config.php
# Edito config.php me DB credentials dhe SMTP settings
```

### 4. Hap në browser
```
http://localhost/bts-ms/public/index.php
```

Login:
- Username: `admin`
- Password: `[your_password]`

## 🌐 Deployment në Production

### Metoda 1: Deploy i Shpejtë (5 minuta)
Shiko: **`QUICK_DEPLOY.md`**

### Metoda 2: Deploy i Plotë
Shiko: **`DEPLOYMENT.md`**

### Verifikimi Para Deployment
```bash
php check_ready_for_deploy.php
```

## 🔧 Teknologjitë

- **Backend:** PHP 7.4+ (PDO për databazë)
- **Frontend:** JavaScript vanilla (pa frameworks)
- **Database:** MySQL 5.7+ / MariaDB 10.2+
- **CSS:** Custom CSS me CSS Variables
- **Icons:** Lucide Icons
- **Email:** SMTP (Gmail, Outlook, etj.)

## 📁 Struktura e Projektit

```
bts-ms/
├── config/              # Konfigurimet
├── includes/            # PHP backend logic
├── partials/            # PHP templates (header, nav, footer)
├── public/              # Frontend (index.php, dashboard.php, assets/)
│   ├── api/            # API endpoints
│   └── assets/         # CSS dhe JavaScript
├── database/            # Schema dhe migrations
└── storage/             # Sesionet dhe uploads
```

## 🔐 Kredencialet Default

**Local Development:**
- Username: `admin`
- Password: `loniloni123` (ose çfarë vendosësh në `create_admin.php`)
- Email: Vendos email-in tënd për të marrë kodet

**Production:**
- Ndrysho të gjitha passwords dhe PINs menjëherë pas deployment-it!

## 🛠️ Scripts të Dobishme

### Check Deployment Readiness
```bash
php scripts/check_ready_for_deploy.php
```

### Create/Update Admin
```bash
php scripts/create_admin.php
```

### Run Migrations (nëse nevojitet)
```bash
php scripts/run_migration.php
```

### Seed Sample Data
```bash
php scripts/seed_sample_data.php
```

### Check Database Structure
```bash
php database/check_structure.php
```

## 📧 SMTP Configuration

Për të dërguar email-e (2FA codes, password reset), konfiguro SMTP në `config/config.php`:

### Gmail
```php
'smtp_host' => 'smtp.gmail.com',
'smtp_port' => 587,
'smtp_username' => 'your-email@gmail.com',
'smtp_password' => 'your-app-password',  // Jo password i zakonshëm!
```

**Merr Google App Password:** https://myaccount.google.com/apppasswords

### Outlook/Hotmail
```php
'smtp_host' => 'smtp-mail.outlook.com',
'smtp_port' => 587,
'smtp_username' => 'your-email@outlook.com',
'smtp_password' => 'your-password',
```

## 🔒 Siguria

### Features të Sigurisë të Aktivizuara
- 2FA me email (gjithmonë aktiv)
- Rate limiting (5 tentativa në 15 minuta)
- Account locking (30 minuta pas tentativave të dështuara)
- PIN verification për veprime kritike
- CSRF protection për të gjitha POST requests
- Session security (httponly cookies)

### Best Practices
1. ✅ Përdor HTTPS në production
2. ✅ Ndrysho të gjitha passwords default
3. ✅ Vendos SMTP password në environment variables
4. ✅ Backup regular të databazës
5. ✅ Monitoro activity logs

## 📱 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive design)

## 🐛 Troubleshooting

### Email-et nuk po vijnë
1. Kontrollo SMTP config në `config/config.php`
2. Verifiko që email-i në DB është i saktë
3. Kontrollo error logs
4. Testo SMTP credentials

### Database errors
1. Verifiko credentials në `config/config.php`
2. Kontrollo që databaza ekziston
3. Run: `php check_ready_for_deploy.php`

### Session errors
1. Kontrollo që `storage/sessions/` është writable
2. Run: `chmod 755 storage/sessions/`

## 📖 Dokumentacion i Plotë

| Dokumenti | Përmbajtja |
|-----------|------------|
| `QUICK_DEPLOY.md` | Deploy i shpejtë në 5 minuta |
| `DEPLOYMENT.md` | Udhëzues i plotë për deployment |
| `PRODUCTION_CHECKLIST.md` | Lista kontrolluese |
| `ARCHITECTURE.md` | Struktura e projektit |
| `SETUP.md` | Setup lokal dhe SMTP |
| `database/SCHEMA_INFO.md` | Info për databazën |

## 🙋 Pyetje të Shpeshta

**Q: Si të ndërroj email-in ku vijnë kodet?**
A: Përditëso email-in e adminit në databazë:
```sql
UPDATE admins SET email = 'new-email@example.com' WHERE username = 'admin';
```

**Q: Si të ndërroj PIN-in?**
A: Settings → Menaxhimi i PASSCODE (PIN) → Shkruaj username → Merr kodin → Ndrysho PIN-in

**Q: Si të çaktivizoj rate limiting në dev?**
A: Në `config/config.php`:
```php
'rate_limit_enabled' => false,
'account_lock_enabled' => false,
```

**Q: A mund të kem më shumë se një admin?**
A: Po, por sistemi është optimizuar për një admin. Për të shtuar më shumë admins, duhet të modifikosh logjikën në `public/api/auth.php`.

## 📄 License

© 2025 BTS Management System. All rights reserved.

## 🤝 Support

Për probleme ose pyetje, shiko dokumentacionin e plotë ose kontakto support.

---

**Projekti është i gatshëm për production!** 🚀

Lexo `QUICK_DEPLOY.md` për të filluar deployment-in tani.

