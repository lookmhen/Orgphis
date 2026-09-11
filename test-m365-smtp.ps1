<#
.SYNOPSIS
    Script ทดสอบการเชื่อมต่อ Authenticated SMTP กับ Microsoft 365 (smtp.office365.com)
    พร้อมแสดง Error Response อย่างละเอียดว่า Microsoft ปฏิเสธด้วยสาเหตุใด
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$SmtpServer = "smtp.office365.com",

    [Parameter(Mandatory=$false)]
    [int]$Port = 587
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     MICROSOFT 365 SMTP AUTHENTICATION TEST TOOL          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$Email = Read-Host "1. กรุณากรอก Email ที่ใช้ส่ง (Username เช่น user@domain.com)"
$Password = Read-Host "2. กรุณากรอก Password (หรือ App Password)" -AsSecureString
$TargetEmail = Read-Host "3. กรุณากรอก Email ผู้รับปลายทางที่จะลองส่งทดสอบ"

$PlainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password))

Write-Host ""
Write-Host "[*] กำลังเริ่มขั้นตอนทดสอบการเชื่อมต่อกับ $SmtpServer บนพอร์ต $Port (STARTTLS)..." -ForegroundColor Yellow

try {
    # สร้าง Mail Message
    $Mail = New-Object System.Net.Mail.MailMessage
    $Mail.From = New-Object System.Net.Mail.MailAddress($Email)
    $Mail.To.Add($TargetEmail)
    $Mail.Subject = "[PhishCentral] ทดสอบการส่งผ่าน Microsoft 365 Authenticated SMTP"
    $Mail.Body = "การทดสอบเชื่อมต่อ Authenticated SMTP สำเร็จแล้ว! เวลาที่ทดสอบ: $(Get-Date -Format 'dd/MM/yyyy HH:mm:ss')"
    $Mail.IsBodyHtml = $false

    # สร้าง Smtp Client
    $Smtp = New-Object System.Net.Mail.SmtpClient($SmtpServer, $Port)
    $Smtp.EnableSsl = $true
    $Smtp.Timeout = 15000
    $Smtp.DeliveryMethod = [System.Net.Mail.SmtpDeliveryMethod]::Network
    $Smtp.UseDefaultCredentials = $false
    $Smtp.Credentials = New-Object System.Net.NetworkCredential($Email, $PlainPassword)

    Write-Host "[*] กำลังทำ TLS Handshake และส่ง Authentication Payload..." -ForegroundColor Yellow
    $Smtp.Send($Mail)

    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host " SUCCESS: ล็อกอินและส่งอีเมลทดสอบผ่าน Microsoft 365 สำเร็จ 100%!" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Green
    Write-Host "กรุณาตรวจสอบ Inbox ของ $TargetEmail" -ForegroundColor White
}
catch {
    Write-Host ""
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host " FAILED: การเชื่อมต่อถูกปฏิเสธโดย Microsoft 365!" -ForegroundColor Red
    Write-Host "==========================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "รายละเอียด Error จากเซิร์ฟเวอร์:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor White

    if ($_.Exception.InnerException) {
        Write-Host ""
        Write-Host "Inner Exception:" -ForegroundColor Red
        Write-Host $_.Exception.InnerException.Message -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "--- แนวทางวิเคราะห์จาก Microsoft 365 ---" -ForegroundColor Cyan
    if ($_.Exception.Message -match "535 5.7.3" -or $_.Exception.InnerException.Message -match "535 5.7.3") {
        Write-Host "[!] Error 535 5.7.3 Authentication unsuccessful ชี้ชัดว่า:" -ForegroundColor Yellow
        Write-Host "    1. บัญชีนี้มี MFA (เปิด 2-Step Verification) จึงใช้รหัสผ่านปกติไม่ได้ ต้องใช้ 'App Password' 16 หลัก" -ForegroundColor White
        Write-Host "    2. หรือ รหัสผ่านพิมพ์ผิด / บัญชีติด Conditional Access Policy ใน Entra ID" -ForegroundColor White
        Write-Host "    3. หรือ ค่า SmtpClientAuthenticationDisabled บน Exchange Online ยังไม่ได้เป็น `$false" -ForegroundColor White
    }
}
finally {
    if ($Mail) { $Mail.Dispose() }
    if ($Smtp) { $Smtp.Dispose() }
}
