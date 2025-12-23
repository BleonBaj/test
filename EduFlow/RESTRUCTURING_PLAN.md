# Project Restructuring Plan

## Goal
Split the monolithic structure into modular, page-based architecture where each page has its own HTML, CSS, and JS files.

## Current Structure
- `public/dashboard.php` - Single file with all 6 sections
- `public/assets/js/app.js` - 270KB monolithic JavaScript file
- `public/assets/css/style.css` - Single CSS file

## New Structure

```
public/
├── pages/
│   ├── dashboard/
│   │   ├── index.php      # Dashboard HTML
│   │   ├── dashboard.css  # Dashboard-specific styles
│   │   └── dashboard.js   # Dashboard-specific JavaScript
│   ├── reports/
│   │   ├── index.php
│   │   ├── reports.css
│   │   └── reports.js
│   ├── management/
│   │   ├── index.php
│   │   ├── management.css
│   │   └── management.js
│   ├── payments/
│   │   ├── index.php
│   │   ├── payments.css
│   │   └── payments.js
│   ├── salaries/
│   │   ├── index.php
│   │   ├── salaries.css
│   │   └── salaries.js
│   ├── settings/
│   │   ├── index.php
│   │   ├── settings.css
│   │   └── settings.js
│   └── login/
│       ├── index.php      # Login page (from public/index.php)
│       ├── login.css
│       └── login.js
│
├── assets/
│   ├── shared/           # Shared resources
│   │   ├── common.js     # Shared utilities, state, API functions
│   │   ├── modals.js     # Modal management
│   │   ├── forms.js      # Form handling
│   │   ├── tables.js     # Table rendering
│   │   └── i18n.js       # Translations
│   ├── css/
│   │   ├── common.css    # Base styles, layout, variables
│   │   ├── components.css # Buttons, cards, modals, etc.
│   │   └── pages/        # Page-specific CSS
│   │       ├── dashboard.css
│   │       ├── reports.css
│   │       └── ...
│   └── js/
│       └── (deprecated - moved to pages/)
│
├── dashboard.php         # Main router that loads pages
└── index.php             # Login redirect

```

## Extraction Plan

### Phase 1: Shared Assets
1. Extract common JavaScript (state, API, utilities)
2. Extract common CSS (variables, base styles, components)

### Phase 2: Page Extraction
For each page (dashboard, reports, management, payments, salaries, settings):
1. Extract HTML section from dashboard.php
2. Extract related JavaScript from app.js
3. Extract related CSS from style.css
4. Create page folder with all three files

### Phase 3: Modals & Components
1. Extract modals to shared/components/
2. Create reusable components

### Phase 4: Router Update
1. Update dashboard.php to act as router
2. Update navigation to load page-specific assets
3. Update header/footer partials

## Files to Extract

### Pages:
- Dashboard (lines 9-79)
- Reports (lines 82-200)
- Management (lines 202-335)
- Payments (lines 337-369)
- Salaries (lines 371-410)
- Settings (lines 412-512)

### Modals (in shared/components/):
- modal-course, modal-class, modal-student, modal-professor
- modal-invoice, modal-salary
- modal-class-details, modal-student-details, modal-professor-details
- modal-invoice-details, modal-salary-details
- modal-settings-unlock, modal-pin-verify, modal-action-pin, modal-pin-management

### JavaScript Functions to Extract:
- State management → common.js
- API functions → common.js
- i18n/translations → i18n.js
- Modal management → modals.js
- Form handling → forms.js
- Table rendering → tables.js
- Page-specific logic → respective page JS files
