<?php
// Settings Page - Application settings and configuration
$currentPage = $_GET['page'] ?? 'dashboard';
$isActive = ($currentPage === 'settings');
?>
<section class="section <?php echo $isActive ? 'active' : ''; ?>" data-section="settings" style="<?php echo $isActive ? 'display: block;' : 'display: none;'; ?>">
    <div class="section-header">
        <button type="button" class="sidebar-toggle">
            <i data-lucide="menu"></i>
        </button>
        <div>
            <h2 data-i18n="settings-title">Cilësime</h2>
            <p class="section-sub" data-i18n="settings-subtitle">Personalizo preferencat e platformës.</p>
        </div>
    </div>
    <div class="settings-container">
        <form id="settings-main" class="settings-form">
            <div class="settings-section">
                <h3 data-i18n="settings-business-title">Të dhënat e biznesit</h3>
                <div class="form-grid">
                    <div class="form-field">
                        <label data-i18n="label-company-name">Emri i kompanisë</label>
                        <input type="text" name="company_name" placeholder="Emri i kompanisë"
                            data-i18n-placeholder="placeholder-company-name">
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-address">Adresa</label>
                        <textarea name="company_address" rows="2" placeholder="Rruga, Qyteti, Kodi postar"
                            data-i18n-placeholder="placeholder-address"></textarea>
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-phone">Telefoni</label>
                        <input type="text" name="company_phone" placeholder="+355 ..."
                            data-i18n-placeholder="placeholder-phone">
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-email">Email</label>
                        <input type="email" name="company_email" placeholder="info@example.com"
                            data-i18n-placeholder="placeholder-email">
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-tax-id">NIPT / Nr. fiskal</label>
                        <input type="text" name="company_tax_id" placeholder="NIPT"
                            data-i18n-placeholder="placeholder-tax-id">
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-logo-url">Logo (URL ose rrugë relative)</label>
                        <input type="text" name="company_logo_url" placeholder="p.sh. uploads/logo.png"
                            data-i18n-placeholder="placeholder-logo-url">
                    </div>
                    <div class="form-field">
                        <label data-i18n="label-company-logo-upload">Logo (ngarko skedar)</label>
                        <input type="file" name="company_logo_file" accept="image/*,.svg">
                        <div class="upload-actions">
                            <button type="button" class="secondary" data-upload-logo
                                data-i18n="action-upload-logo">Ngarko logon</button>
                            <small class="help" data-i18n="help-logo-upload">Zgjidh skedarin dhe kliko "Ngarko
                                logon"</small>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3 data-i18n="settings-users-title">Përdoruesit dhe Kërkesat</h3>
                <div class="card">
                    <div class="card-header">
                        <div>
                            <h4>Kërkesat për regjistrim</h4>
                            <p class="text-muted">Aprovo ose refuzo kërkesat për llogari të reja</p>
                        </div>
                    </div>
                    <div class="table-wrapper">
                        <table id="signup-requests-table">
                            <thead>
                                <tr>
                                    <th>Emri</th>
                                    <th>Email</th>
                                    <th>Data</th>
                                    <th>Veprime</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="4" class="no-data">Nuk ka kërkesa në pritje</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div class="settings-actions">
                <button type="submit" class="primary" data-i18n="action-save-settings">Ruaj ndryshimet</button>
            </div>
        </form>

        <div class="settings-extra">
            <button type="button" class="btn-pin-management" id="btn-open-pin-management">
                <span class="btn-icon">🔐</span>
                <span data-i18n="btn-pin-management">Menaxhimi i PASSCODE (PIN)</span>
            </button>
        </div>
    </div>
</section>
