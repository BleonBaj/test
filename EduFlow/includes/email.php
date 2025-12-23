<?php

require_once __DIR__ . '/db.php';

/**
 * Send email using PHP mail() function or SMTP
 * For production, configure SMTP settings in config.php
 */
function send_email(string $to, string $subject, string $message, string $htmlMessage = null): bool
{
    $config = get_config();
    $emailConfig = $config['email'] ?? [];
    
    // Auto-enable SMTP if credentials are provided (even if smtp_enabled is false)
    $smtpEnabled = !empty($emailConfig['smtp_enabled']) && $emailConfig['smtp_enabled'] === true;
    $hasSmtpCredentials = !empty($emailConfig['smtp_host']) && 
                          !empty($emailConfig['smtp_username']) && 
                          !empty($emailConfig['smtp_password']);
    
    // Log email attempt
    error_log("Email send attempt to: {$to}, Subject: {$subject}");
    error_log("SMTP enabled: " . ($smtpEnabled ? 'yes' : 'no') . ", Has credentials: " . ($hasSmtpCredentials ? 'yes' : 'no'));
    
    // If SMTP is enabled or credentials are provided, use SMTP
    if ($smtpEnabled || $hasSmtpCredentials) {
        error_log("Using SMTP to send email to: {$to}");
        $result = send_email_smtp($to, $subject, $message, $htmlMessage, $emailConfig);
        if ($result) {
            error_log("Email sent successfully via SMTP to: {$to}");
        } else {
            error_log("Email sending failed via SMTP to: {$to}");
        }
        return $result;
    }
    
    error_log("Using PHP mail() function to send email to: {$to}");
    
    // Otherwise use PHP mail() function
    error_log("WARNING: No SMTP configuration found. Using PHP mail() which may not work on XAMPP/localhost.");
    error_log("To enable email sending, configure SMTP settings in config.php with smtp_host, smtp_username, and smtp_password");
    
    $headers = [];
    $headers[] = 'From: ' . ($emailConfig['from_email'] ?? 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $headers[] = 'Reply-To: ' . ($emailConfig['reply_to'] ?? $emailConfig['from_email'] ?? 'noreply@' . ($_SERVER['HTTP_HOST'] ?? 'localhost'));
    $headers[] = 'X-Mailer: PHP/' . phpversion();
    
    if ($htmlMessage) {
        $boundary = uniqid('boundary_');
        $headers[] = 'MIME-Version: 1.0';
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';
        
        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $message . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $htmlMessage . "\r\n";
        $body .= "--{$boundary}--\r\n";
        
        $result = @mail($to, $subject, $body, implode("\r\n", $headers));
        error_log("PHP mail() result: " . ($result ? 'success' : 'failed'));
        return $result;
    }
    
    $headers[] = 'Content-Type: text/plain; charset=UTF-8';
    $result = @mail($to, $subject, $message, implode("\r\n", $headers));
    error_log("PHP mail() result: " . ($result ? 'success' : 'failed'));
    return $result;
}

/**
 * Send email using SMTP
 */
function send_email_smtp(string $to, string $subject, string $message, ?string $htmlMessage, array $config): bool
{
    $host = $config['smtp_host'] ?? 'localhost';
    $port = (int) ($config['smtp_port'] ?? 587);
    $username = $config['smtp_username'] ?? '';
    $password = $config['smtp_password'] ?? '';
    $encryption = $config['smtp_encryption'] ?? 'tls'; // 'tls' or 'ssl'
    // Use from_email if set, otherwise use smtp_username as fallback
    $fromEmail = !empty($config['from_email']) ? $config['from_email'] : $username;
    $fromName = $config['from_name'] ?? 'BTS Management System';
    
    error_log("SMTP attempt: Connecting to {$host}:{$port} with encryption: {$encryption}");
    error_log("SMTP username: {$username}");
    
    // Use socket connection for SMTP
    $smtp = @fsockopen(
        ($encryption === 'ssl' ? 'ssl://' : '') . $host,
        $port,
        $errno,
        $errstr,
        30
    );
    
    if (!$smtp) {
        error_log("SMTP connection failed: {$errstr} ({$errno})");
        error_log("SMTP connection details: host={$host}, port={$port}, encryption={$encryption}");
        return false;
    }
    
    error_log("SMTP connection established successfully");
    
    // Read server greeting
    $response = fgets($smtp, 515);
    if (substr($response, 0, 3) !== '220') {
        error_log("SMTP greeting failed: {$response}");
        fclose($smtp);
        return false;
    }
    
    // Send EHLO
    fputs($smtp, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
    $response = '';
    while ($line = fgets($smtp, 515)) {
        $response .= $line;
        if (substr($line, 3, 1) === ' ') break;
    }
    
    // Start TLS if needed
    if ($encryption === 'tls' && $port === 587) {
        fputs($smtp, "STARTTLS\r\n");
        $response = fgets($smtp, 515);
        if (substr($response, 0, 3) !== '220') {
            error_log("STARTTLS failed: {$response}");
            fclose($smtp);
            return false;
        }
        stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        fputs($smtp, "EHLO " . ($_SERVER['HTTP_HOST'] ?? 'localhost') . "\r\n");
        $response = '';
        while ($line = fgets($smtp, 515)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
    }
    
    // Authenticate if credentials provided
    if (!empty($username) && !empty($password)) {
        error_log("SMTP: Attempting authentication with username: {$username}");
        fputs($smtp, "AUTH LOGIN\r\n");
        $response = fgets($smtp, 515);
        if (substr($response, 0, 3) !== '334') {
            error_log("AUTH LOGIN failed: {$response}");
            fclose($smtp);
            return false;
        }
        
        error_log("SMTP: Sending username");
        fputs($smtp, base64_encode($username) . "\r\n");
        $response = fgets($smtp, 515);
        if (substr($response, 0, 3) !== '334') {
            error_log("Username authentication failed: {$response}");
            fclose($smtp);
            return false;
        }
        
        error_log("SMTP: Sending password");
        fputs($smtp, base64_encode($password) . "\r\n");
        $response = fgets($smtp, 515);
        if (substr($response, 0, 3) !== '235') {
            error_log("Password authentication failed: {$response}");
            fclose($smtp);
            return false;
        }
        error_log("SMTP: Authentication successful");
    } else {
        error_log("SMTP: No credentials provided, skipping authentication");
    }
    
    // Set FROM - must match SMTP username for Gmail
    // Gmail requires that the FROM address matches the authenticated user
    $mailFrom = $username; // Always use SMTP username as FROM for Gmail compatibility
    fputs($smtp, "MAIL FROM: <{$mailFrom}>\r\n");
    $response = fgets($smtp, 515);
    if (substr($response, 0, 3) !== '250') {
        error_log("MAIL FROM failed: {$response} (tried: {$mailFrom})");
        fclose($smtp);
        return false;
    }
    
    // Set TO
    fputs($smtp, "RCPT TO: <{$to}>\r\n");
    $response = fgets($smtp, 515);
    if (substr($response, 0, 3) !== '250') {
        error_log("RCPT TO failed: {$response}");
        fclose($smtp);
        return false;
    }
    
    // Send DATA
    fputs($smtp, "DATA\r\n");
    $response = fgets($smtp, 515);
    if (substr($response, 0, 3) !== '354') {
        error_log("DATA command failed: {$response}");
        fclose($smtp);
        return false;
    }
    
    // Build email headers and body
    // For Gmail, FROM header can be different from MAIL FROM, but MAIL FROM must match username
    $displayFrom = !empty($config['from_email']) ? $config['from_email'] : $username;
    $headers = [];
    $headers[] = "From: {$fromName} <{$displayFrom}>";
    $headers[] = "To: <{$to}>";
    $headers[] = "Subject: {$subject}";
    $headers[] = "MIME-Version: 1.0";
    
    if ($htmlMessage) {
        $boundary = uniqid('boundary_');
        $headers[] = "Content-Type: multipart/alternative; boundary=\"{$boundary}\"";
        $body = "--{$boundary}\r\n";
        $body .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $message . "\r\n";
        $body .= "--{$boundary}\r\n";
        $body .= "Content-Type: text/html; charset=UTF-8\r\n";
        $body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
        $body .= $htmlMessage . "\r\n";
        $body .= "--{$boundary}--\r\n";
    } else {
        $headers[] = "Content-Type: text/plain; charset=UTF-8";
        $body = $message;
    }
    
    $emailContent = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.\r\n";
    
    error_log("SMTP: Sending email content");
    fputs($smtp, $emailContent);
    $response = fgets($smtp, 515);
    error_log("SMTP: Server response after sending email: {$response}");
    
    // Quit
    fputs($smtp, "QUIT\r\n");
    fclose($smtp);
    
    if (substr($response, 0, 3) === '250') {
        error_log("SMTP: Email sent successfully to {$to}");
        return true;
    }
    
    error_log("SMTP: Email sending failed. Response: {$response}");
    return false;
}

