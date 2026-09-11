<#
.SYNOPSIS
    Script สำหรับ Admin ใช้ตรวจสอบสถานะ SMTP AUTH ของ Microsoft 365 ทั้งระดับ User และระดับ Tenant (ทั้งองค์กร)
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     MICROSOFT 365 SMTP CONFIGURATION AUDIT SCRIPT        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$Email = Read-Host "กรุณากรอก Email บัญชีที่ต้องการตรวจสอบ (เช่น user@domain.com)"

Write-Host ""
Write-Host "[*] กำลังตรวจสอบ Exchange Online PowerShell Module..." -ForegroundColor Yellow
if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
    Write-Host "[!] ไม่พบโมดูล ExchangeOnlineManagement กำลังติดตั้ง..." -ForegroundColor Yellow
    Install-Module -Name ExchangeOnlineManagement -Force -AllowClobber -Scope CurrentUser
}

Write-Host "[*] กำลังเชื่อมต่อเข้าสู่ Exchange Online (จะมีหน้าต่าง Login ของ Microsoft เด้งขึ้นมา)..." -ForegroundColor Yellow
Connect-ExchangeOnline

Write-Host ""
Write-Host "--- 1. ตรวจสอบระดับ Tenant (ทั้งองค์กร) ---" -ForegroundColor Cyan
$Transport = Get-TransportConfig | Select-Object SmtpClientAuthenticationDisabled
if ($Transport.SmtpClientAuthenticationDisabled -eq $true) {
    Write-Host "[ALERT] ระดับทั้งองค์กรถูกสั่ง ปิด SMTP ไว้อยู่! (SmtpClientAuthenticationDisabled = True)" -ForegroundColor Red
    Write-Host "        ต้องสั่งเปิดด้วย: Set-TransportConfig -SmtpClientAuthenticationDisabled `$false" -ForegroundColor Yellow
} else {
    Write-Host "[OK] ระดับทั้งองค์กร: อนุญาตให้ใช้ SMTP AUTH ได้ (SmtpClientAuthenticationDisabled = False/Default)" -ForegroundColor Green
}

Write-Host ""
Write-Host "--- 2. ตรวจสอบระดับบุคคล ($Email) ---" -ForegroundColor Cyan
$Mailbox = Get-CASMailbox -Identity $Email | Select-Object SmtpClientAuthenticationDisabled
Write-Host "ค่า SmtpClientAuthenticationDisabled ของ $Email คือ: $($Mailbox.SmtpClientAuthenticationDisabled)" -ForegroundColor White

if ($Mailbox.SmtpClientAuthenticationDisabled -eq $true) {
    Write-Host "[ALERT] บัญชีนี้ถูกระบุ ปิด SMTP ไว้อยู่!" -ForegroundColor Red
    $Fix = Read-Host "ต้องการให้ Script สั่งเปิดใช้งานให้ทันทีหรือไม่? (Y/N)"
    if ($Fix -eq 'Y' -or $Fix -eq 'y') {
        Set-CASMailbox -Identity $Email -SmtpClientAuthenticationDisabled $false
        Write-Host "[SUCCESS] สั่งเปิด SmtpClientAuthenticationDisabled = `$false เรียบร้อยแล้ว!" -ForegroundColor Green
    }
} elseif ($Mailbox.SmtpClientAuthenticationDisabled -eq $false) {
    Write-Host "[OK] บัญชีนี้ได้รับสิทธิ์เปิด Authenticated SMTP ชัดเจนแล้ว!" -ForegroundColor Green
} else {
    Write-Host "[INFO] ค่าเป็น Null (ใช้ค่าตาม Tenant) แนะนำให้สั่ง Explicit Enabled เพื่อความแน่นอน:" -ForegroundColor Yellow
    $Fix = Read-Host "ต้องการสั่ง Force Enable ให้บัญชีนี้เลยหรือไม่? (Y/N)"
    if ($Fix -eq 'Y' -or $Fix -eq 'y') {
        Set-CASMailbox -Identity $Email -SmtpClientAuthenticationDisabled $false
        Write-Host "[SUCCESS] สั่งเปิดเรียบร้อยแล้ว!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "--- 3. คำแนะนำเพิ่มเติมเรื่องรหัสผ่าน ---" -ForegroundColor Cyan
Write-Host "หากค่าทั้ง 2 ข้อเป็น [OK] แล้ว แต่ยังเจอ Error 535:" -ForegroundColor Yellow
Write-Host ">> สาเหตุ 100% คือ 'บัญชีติด MFA' ทำให้ระบบไม่รับรหัสผ่านธรรมดา" -ForegroundColor White
Write-Host "   ต้องเข้าเว็บ https://mysignins.microsoft.com/security-info เพื่อสร้าง 'App password' 16 หลักมาใส่แทน" -ForegroundColor White

Write-Host ""
Write-Host "เสร็จสิ้นการตรวจสอบ กด Enter เพื่อปิด"
