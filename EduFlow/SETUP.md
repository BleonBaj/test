# Udhëzues për Konfigurimin e BTS-MS

## Konfigurimi i SMTP Password

Për arsye sigurie, SMTP password nuk duhet të jetë hardcoded në kod. Përdor environment variables.

### Metoda 1: Environment Variables në Server

Vendos environment variable në server:

**Linux/Apache:**
```bash
# Në .htaccess ose në konfigurimin e Apache
SetEnv SMTP_PASSWORD "tqaiampehyytmdcn"
```

**Windows/XAMPP:**
```apache
# Në httpd.conf ose .htaccess
SetEnv SMTP_PASSWORD "tqaiampehyytmdcn"
```

**Nginx:**
```nginx
fastcgi_param SMTP_PASSWORD "tqaiampehyytmdcn";
```

### Metoda 2: .env File (Nëse përdor një library për .env)

Krijo një `.env` file në root të projektit:
```
SMTP_PASSWORD=tqaiampehyytmdcn
```

Dhe modifiko `config/config.php` për të lexuar nga `.env` file.

### Metoda 3: Vendos direkt në config.php (VETËM për development lokal)

Nëse je në development lokal dhe nuk ke environment variables, mund ta vendosësh direkt në `config/config.php`:

```php
'smtp_password' => $env('SMTP_PASSWORD', 'tqaiampehyytmdcn'), // VETËM për development
```

**Kujdes:** Mos e commit-o këtë në Git nëse password është i vërtetë!

## Veçoritë e Sigurisë

Projekti tani ka aktivizuar veçoritë e sigurisë si default:

- **Account Locking**: Aktivizohet pas tentativave të dështuara të login-it
- **Rate Limiting**: Kufizon numrin e tentativave të login-it

Për të çaktivizuar në development lokal, vendos environment variables:
```
ACCOUNT_LOCK_ENABLED=false
RATE_LIMIT_ENABLED=false
```

## Checklist për Deployment

- [ ] Vendos `SMTP_PASSWORD` në environment variables
- [ ] Verifiko që `config/config.php` nuk është në Git (kontrollo `.gitignore`)
- [ ] Aktivizo veçoritë e sigurisë në prodhim
- [ ] Testo email sending me SMTP
- [ ] Verifiko që të gjitha funksionet punojnë me veçoritë e reja të sigurisë

