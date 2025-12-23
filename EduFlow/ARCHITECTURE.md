# Arkitektura e Projektit BTS-MS

Ky dokument përshkruan strukturën e projektit dhe si funksionon çdo pjesë.

## 📁 Struktura e Folderve

```
bts-ms/
│
├── 📂 config/              # Konfigurim i aplikacionit
│   └── config.php          # Kredencialet e DB dhe cilësimet
│
├── 📂 includes/            # Backend Logic (PHP Functions)
│   ├── auth.php            # Autentifikim dhe autorizim
│   ├── db.php              # Lidhja me databazën
│   ├── entities.php        # CRUD operacione (kurset, klasat, etj.)
│   ├── helpers.php         # Funksione ndihmëse
│   ├── permissions.php     # Sistemi i lejeve të PIN-it
│   ├── password_reset.php  # Reset i fjalëkalimit
│   └── session.php         # Menaxhimi i sesioneve
│
├── 📂 partials/            # PHP Templates (Header, Footer, Nav)
│   ├── header.php         # HTML head dhe meta tags
│   ├── footer.php         # JavaScript includes
│   └── nav.php            # Navigacioni
│
├── 📂 public/              # Frontend + API Endpoints
│   ├── index.php          # Faqja e login-it
│   ├── dashboard.php      # Dashboard kryesore
│   ├── permissions.php    # Verifikim me email për lejet
│   │
│   ├── 📂 api/            # API Endpoints (Backend)
│   │   ├── auth.php       # Login/Logout
│   │   ├── registrations.php  # CRUD për kurset, klasat, studentët, profesorët
│   │   ├── management.php     # Statistikat dhe të dhënat
│   │   ├── payments.php       # Pagesat
│   │   ├── salaries.php       # Pagat
│   │   ├── settings.php       # Cilësimet
│   │   ├── permissions.php    # Lejet e PIN-it
│   │   ├── upload.php         # Ngarkimi i skedarëve
│   │   └── class-details.php  # Detajet e klasës
│   │
│   └── 📂 assets/         # Frontend Resources
│       ├── css/
│       │   ├── style.css      # Stilizimi kryesor
│       │   └── invoice.css    # Stilizimi për faturat
│       └── js/
│           └── app.js          # JavaScript kryesor (të gjitha funksionet)
│
├── 📂 database/            # Migracione dhe Schema
│   ├── schema.sql         # Struktura e tabelave
│   ├── seed.sql           # Të dhëna fillestare
│   └── migrations/        # Migracione të ndryshme
│
├── 📂 storage/             # Skedarët e ruajtura
│   └── sessions/          # Sesionet PHP
│
└── 📂 public/uploads/      # Skedarët e ngarkuar (logo, etj.)
```

## 🔄 Si Funksionon Aplikacioni

### 1. **Login (index.php)**
- Përdoruesi hyn me email/username dhe password
- `public/api/auth.php` verifikon kredencialet
- Nëse sukses, krijon sesion dhe ridrejton në dashboard

### 2. **Dashboard (dashboard.php)**
- Faqja kryesore pas login-it
- Shfaq statistikat dhe listat e entiteteve
- Përdor JavaScript (`app.js`) për të bërë API calls

### 3. **API Endpoints (public/api/)**
- Të gjitha endpoint-et marrin kërkesa dhe kthejnë JSON
- Përdorin funksionet nga `includes/` për logjikën e biznesit
- Kërkojnë autentifikim për shumicën e operacioneve

### 4. **Frontend (assets/js/app.js)**
- Një fajll i madh JavaScript që menaxhon të gjithë frontend-in
- Bën API calls, menaxhon formet, shfaq modalet, etj.

## 🔐 Siguria

- **Autentifikim**: Çdo API endpoint kontrollon nëse përdoruesi është i kyçur
- **PIN i Menaxhimit**: Disa veprime kërkojnë PIN shtesë
- **Sesionet**: Përdoren për të mbajtur përdoruesin të kyçur
- **Prepared Statements**: Të gjitha query-t përdorin prepared statements për të parandaluar SQL injection

## 📝 Si të Shtosh Funksionalitet të Ri

### Shto një API Endpoint të ri:
1. Krijo fajll në `public/api/emri_endpoint.php`
2. Përdor funksionet nga `includes/` për logjikën
3. Kthe JSON me `json_response()`

### Shto një funksion backend:
1. Shto në fajllin e duhur në `includes/`
2. Ose krijo një fajll të ri nëse është logjikë e re

### Shto UI të ri:
1. Shto HTML në `dashboard.php` ose krijo një fajll të ri në `public/`
2. Shto JavaScript në `app.js` për të menaxhuar UI-në
3. Shto CSS në `style.css` për stilizim

## 🗄️ Databaza

- Të gjitha migracionet janë në `database/migrations/`
- Schema fillestare është në `database/schema.sql`
- Të dhënat fillestare (opsionale) janë në `database/seed.sql`

## ⚙️ Konfigurimi

- Kredencialet e databazës dhe cilësimet e tjera janë në `config/config.php`
- **MOS** vendos kredenciale në kod - përdor `config/config.php`

## 🚀 Deployment

1. Upload të gjithë fajllat në server
2. Konfiguro `config/config.php` me kredencialet e prodhimit
3. Importo databazën (`database/schema.sql`)
4. Sigurohu që `storage/` dhe `public/uploads/` janë writable
5. Ndrysho `public/` si document root në server


