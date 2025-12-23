# Project Structure Guide

## 📁 Directory Organization

```
bts-master/
│
├── 📂 config/                    # Configuration files
│   ├── config.php               # Main config (NOT in git)
│   └── config.php.example       # Template for config
│
├── 📂 includes/                  # PHP Backend Logic
│   ├── auth.php                 # Authentication & authorization
│   ├── csrf.php                 # CSRF protection
│   ├── db.php                   # Database connection
│   ├── email.php                # Email functionality
│   ├── entities.php             # CRUD operations
│   ├── helpers.php              # Helper functions
│   ├── password_reset.php       # Password reset logic
│   ├── permissions.php          # PIN permissions system
│   └── session.php              # Session management
│
├── 📂 partials/                  # PHP Templates
│   ├── header.php               # HTML head, meta tags
│   ├── footer.php               # Script includes
│   └── nav.php                  # Navigation sidebar
│
├── 📂 public/                    # Public-facing files (Document Root)
│   │
│   ├── 📂 api/                   # API Endpoints (JSON responses)
│   │   ├── auth.php             # Login/logout, 2FA
│   │   ├── class-details.php    # Class detail endpoints
│   │   ├── csrf.php             # CSRF token generation
│   │   ├── index.php            # API index/info
│   │   ├── management.php       # Management stats
│   │   ├── payments.php         # Invoice/payment operations
│   │   ├── permissions.php      # PIN permission management
│   │   ├── registrations.php    # CRUD for courses/classes/students/professors
│   │   ├── reports.php          # Reports & analytics
│   │   ├── salaries.php         # Salary operations
│   │   ├── settings.php         # Settings management
│   │   ├── upload.php           # File uploads
│   │   └── whoami.php           # Current user info
│   │
│   ├── 📂 assets/                # Frontend Resources
│   │   ├── 📂 css/
│   │   │   ├── style.css        # Main stylesheet
│   │   │   └── invoice.css      # Invoice/receipt styles
│   │   ├── 📂 img/
│   │   │   └── login-bg.png     # Login background image
│   │   └── 📂 js/
│   │       ├── app.js           # Main application JavaScript (large file)
│   │       └── reports.js       # Reports-specific JavaScript
│   │
│   ├── 📂 uploads/               # User-uploaded files
│   │   └── .gitkeep             # Keep directory in git
│   │
│   ├── dashboard.php             # Main dashboard page
│   ├── index.php                 # Login page
│   ├── invoice.html              # Invoice template
│   ├── permissions.php           # PIN permissions verification page
│   └── salary.html               # Salary statement template
│
├── 📂 scripts/                   # Utility PHP Scripts
│   ├── check_ready_for_deploy.php    # Pre-deployment checks
│   ├── create_admin.php              # Create admin user
│   ├── run_migration.php             # Run database migrations
│   └── seed_sample_data.php          # Seed sample data
│
├── 📂 database/                  # Database Files
│   ├── schema_complete.sql      # Complete database schema
│   └── SCHEMA_INFO.md           # Database documentation
│
├── 📂 storage/                   # Application Storage
│   └── 📂 sessions/              # PHP session files
│       └── .gitkeep             # Keep directory in git
│
├── 📂 cypress/                   # E2E Tests (optional)
│   ├── fixtures/
│   └── support/
│
├── 📄 Documentation Files
│   ├── README.md                # Main documentation
│   ├── ARCHITECTURE.md          # Architecture overview
│   ├── DEPLOYMENT.md            # Deployment guide
│   ├── PRODUCTION_CHECKLIST.md  # Pre-deployment checklist
│   ├── QUICK_DEPLOY.md          # Quick deployment guide
│   ├── SETUP.md                 # Local setup guide
│   ├── STRATEGIC_ROADMAP.md     # Feature roadmap
│   └── PROJECT_STRUCTURE.md     # This file
│
├── 📄 Root Files
│   ├── login.php                # Root redirect to public/index.php
│   ├── package.json             # Node.js dependencies (if any)
│   ├── cypress.config.js        # Cypress configuration
│   └── .gitignore               # Git ignore rules
│
└── 📄 CHANGELOG.md              # Version history
```

---

## 🎯 Key Principles

### 1. **Public Directory Structure**
- The `public/` directory should be your document root in production
- All public-facing files are in `public/`
- API endpoints are in `public/api/`

### 2. **Code Organization**
- **Backend Logic**: All in `includes/`
- **API Endpoints**: All in `public/api/`
- **Frontend**: All in `public/assets/`
- **Templates**: All in `partials/`

### 3. **Security**
- `config/config.php` is **NOT** in git (contains credentials)
- Always use `config.php.example` as template
- Session files in `storage/sessions/`
- User uploads in `public/uploads/`

### 4. **Utility Scripts**
- All setup/deployment scripts in `scripts/`
- Run from command line: `php scripts/script_name.php`

---

## 📝 File Naming Conventions

### PHP Files
- **kebab-case**: `create_admin.php`, `password_reset.php`
- **Descriptive names**: Clear purpose from filename

### JavaScript Files
- **kebab-case**: `app.js`, `reports.js`
- One main file per feature area

### CSS Files
- **kebab-case**: `style.css`, `invoice.css`

### API Endpoints
- **kebab-case**: `class-details.php`, `password-reset.php` (if needed)
- **Noun-based**: Represents resource or action

---

## 🔄 Data Flow

1. **User Request** → `public/dashboard.php` or `public/index.php`
2. **Page Load** → Includes `partials/header.php` and `partials/nav.php`
3. **Frontend JS** → `public/assets/js/app.js` handles UI
4. **API Calls** → `public/api/*.php` endpoints
5. **Backend Logic** → Functions from `includes/*.php`
6. **Database** → MySQL via PDO in `includes/db.php`

---

## 🚀 Quick Reference

### Where to add new features?

- **New API endpoint**: Create in `public/api/new-feature.php`
- **New backend function**: Add to appropriate file in `includes/` or create new file
- **New UI component**: Add to `dashboard.php` and handle in `app.js`
- **New CSS styles**: Add to `public/assets/css/style.css`
- **New utility script**: Add to `scripts/`

### Important Files

- **Main Dashboard**: `public/dashboard.php`
- **Login Page**: `public/index.php`
- **Main JS**: `public/assets/js/app.js`
- **Main CSS**: `public/assets/css/style.css`
- **Database Config**: `config/config.php`
- **API Base**: `includes/db.php` (connection) + `includes/auth.php` (authentication)

---

## 📦 Future Improvements

### JavaScript Modularization (Planned)
The `app.js` file (270KB) could be split into:
```
public/assets/js/
├── app.js                 # Main entry point
├── modules/
│   ├── state.js          # State management
│   ├── api.js            # API functions
│   ├── i18n.js           # Translations
│   ├── ui.js             # UI helpers
│   ├── forms.js          # Form handling
│   ├── tables.js         # Table rendering
│   ├── modals.js         # Modal management
│   ├── dashboard.js      # Dashboard rendering
│   └── charts.js         # Chart initialization
└── reports.js            # Reports (already separate)
```

### Suggested for Future:
- Component-based architecture
- ES6 modules with import/export
- Build process (webpack/vite) for optimization

---

## ✅ Current Status

- ✅ Well-organized file structure
- ✅ Clear separation of concerns
- ✅ Security best practices
- ⚠️ JavaScript could be modularized (future improvement)
- ✅ Good documentation structure

---

*Last updated: 2025-01-20*

