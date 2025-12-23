# Project Restructuring - Completion Guide

## ✅ What's Been Done

1. **Folder Structure Created**
   - `/public/pages/` with folders for: dashboard, reports, management, payments, salaries, settings
   - `/public/assets/shared/` for shared resources
   - `/public/assets/css/pages/` for page-specific CSS

2. **Page HTML Files Extracted** ✅
   - `/public/pages/dashboard/index.php`
   - `/public/pages/reports/index.php`
   - `/public/pages/management/index.php`
   - `/public/pages/payments/index.php`
   - `/public/pages/salaries/index.php`
   - `/public/pages/settings/index.php`

3. **Router Created** ✅
   - Updated `dashboard.php` to load pages dynamically

## 🚧 What Needs To Be Done

### 1. Extract Modals to Partial File
Create `/public/partials/modals.php` with all modals from original `dashboard.php`:
- modal-settings-unlock
- modal-pin-verify
- modal-action-pin
- modal-pin-management
- modal-course
- modal-class
- modal-student
- modal-professor
- modal-invoice
- modal-salary
- modal-class-details
- modal-student-details
- modal-invoice-details
- modal-professor-details
- modal-salary-details

### 2. Create Shared JavaScript Files

From the massive `app.js` (270KB), extract:

#### `/public/assets/shared/common.js`
- State management (`state` object)
- API functions (`apiFetch`, `getCsrfToken`)
- Utility functions (`formatDate`, `formatCurrency`, `debounce`, etc.)

#### `/public/assets/shared/i18n.js`
- Translation object (`i18n`)
- Translation function (`t()`)
- Language management

#### `/public/assets/shared/modals.js`
- Modal management (`openModal`, `closeModal`)
- Modal binding

#### `/public/assets/shared/forms.js`
- Form handling (`bindFormSubmissions`, `handleFormSubmit`)
- Form validation

#### `/public/assets/shared/tables.js`
- Table rendering functions
- Table actions binding

### 3. Create Page-Specific JavaScript

For each page, create `/public/pages/{page}/{page}.js`:

#### `/public/pages/dashboard/dashboard.js`
- Dashboard initialization
- Chart rendering (students-course, monthly-registrations)
- Quick actions binding
- Recent activity loading

#### `/public/pages/reports/reports.js`
- Reports data loading
- Chart rendering (financial-history, top-courses)
- Date range filtering
- (Note: reports.js already exists, may need refactoring)

#### `/public/pages/management/management.js`
- Entity switching (course/class/student/professor)
- Table rendering for each entity
- Stats display

#### `/public/pages/payments/payments.js`
- Payments table rendering
- Filter binding
- Invoice management

#### `/public/pages/salaries/salaries.js`
- Salaries table rendering
- Filter binding
- Salary calculations

#### `/public/pages/settings/settings.js`
- Settings form handling
- PIN management
- Signup requests handling

### 4. Split CSS Files

#### `/public/assets/css/common.css`
- CSS Variables (`:root`)
- Base styles (body, html, layout)
- Sidebar styles
- Navigation styles
- Button styles
- Card styles
- Modal base styles
- Form base styles

#### `/public/assets/css/components.css`
- Button variants
- Card variants
- Modal styles
- Form components
- Table styles
- Utility classes

#### `/public/assets/css/pages/dashboard.css`
- Dashboard-specific styles
- Stats grid
- Charts grid
- Quick actions
- Recent activity

#### `/public/assets/css/pages/reports.css`
- Reports-specific styles
- Summary cards
- Chart containers
- Report tables

#### `/public/assets/css/pages/management.css`
- Entity switcher styles
- Management table styles

#### `/public/assets/css/pages/payments.css`
- Payment table styles
- Filter styles

#### `/public/assets/css/pages/salaries.css`
- Salary table styles

#### `/public/assets/css/pages/settings.css`
- Settings form styles
- PIN management styles

### 5. Update Header/Footer Partials

#### Update `/partials/header.php`:
```php
<!-- Base CSS -->
<link rel="stylesheet" href="assets/css/common.css">
<link rel="stylesheet" href="assets/css/components.css">

<!-- Page-specific CSS -->
<?php if (isset($page)): ?>
    <link rel="stylesheet" href="assets/css/pages/<?php echo $page; ?>.css">
<?php endif; ?>
```

#### Update `/partials/footer.php`:
```php
<!-- Shared JavaScript -->
<script src="assets/shared/i18n.js"></script>
<script src="assets/shared/common.js"></script>
<script src="assets/shared/modals.js"></script>
<script src="assets/shared/forms.js"></script>
<script src="assets/shared/tables.js"></script>

<!-- Page-specific JavaScript -->
<?php if (isset($page)): ?>
    <script src="pages/<?php echo $page; ?>/<?php echo $page; ?>.js"></script>
<?php endif; ?>

<!-- Main app initialization -->
<script src="assets/shared/app.js"></script>
```

### 6. Create Main App Initializer

#### `/public/assets/shared/app.js`
- Main initialization function
- Page detection
- Route page-specific initialization
- Event binding

## 📋 Extraction Checklist

- [ ] Extract modals to `/public/partials/modals.php`
- [ ] Create shared JS files (common, i18n, modals, forms, tables)
- [ ] Create page-specific JS files for each page
- [ ] Split CSS into common, components, and page-specific files
- [ ] Update header.php to load CSS files
- [ ] Update footer.php to load JS files
- [ ] Create main app.js initializer
- [ ] Test each page to ensure functionality

## 🔄 Migration Strategy

**Recommended Approach:**

1. **Keep old structure working** - Don't delete old files yet
2. **Incremental migration** - Move functions one by one
3. **Test after each change** - Ensure functionality isn't broken
4. **Gradual CSS split** - Start with page-specific styles, then components
5. **Final cleanup** - Remove old files only after everything works

## ⚠️ Important Notes

- The `app.js` file is 270KB - splitting it will be time-consuming
- Many functions are interdependent - be careful with dependencies
- Test thoroughly after each extraction
- Keep backups of original files

## 🎯 Quick Start Commands

After completing the split:
1. Test each page individually
2. Check browser console for errors
3. Verify all modals work
4. Test form submissions
5. Verify table rendering
6. Check navigation between pages

---

**This restructuring is complex but will result in a much more maintainable codebase!**
