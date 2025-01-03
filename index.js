import express from 'express';
import dotenv from 'dotenv';
import { createClient } from 'webdav';
import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

const webdav = createClient(
    process.env.WEBDAV_URL,
    {
        username: process.env.WEBDAV_USERNAME,
        password: process.env.WEBDAV_PASSWORD
    }
);

const TEMP_DIR = './temp';
fs.mkdir(TEMP_DIR, { recursive: true })
  .catch(console.error);

const clients = new Set();

app.get('/status', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    clients.add(res);
    
    req.on('close', () => clients.delete(res));
});

function broadcast(data) {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

app.post('/convert', async (req, res) => {
    const { epubUrl } = req.body;
    const fileName = path.basename(epubUrl);
    const tempPath = path.join(TEMP_DIR, fileName);
    const pdfPath = tempPath.replace('.epub', '.pdf');

    try {
        broadcast({ step: 1, status: 'downloading' });
        const response = await fetch(epubUrl);
        const buffer = await response.buffer();
        await fs.writeFile(tempPath, buffer);
        broadcast({ step: 2, status: 'downloaded' });

        broadcast({ step: 3, status: 'converting' });
        await new Promise((resolve, reject) => {
            exec(`ebook-convert "${tempPath}" "${pdfPath}"`, (error) => {
                if (error) reject(error);
                resolve();
            });
        });

        broadcast({ step: 4, status: 'uploading' });
        const pdfContent = await fs.readFile(pdfPath);
        await webdav.putFileContents(`/${path.basename(pdfPath)}`, pdfContent);

        broadcast({ step: 5, status: 'cleaning' });
        await fs.unlink(tempPath);
        await fs.unlink(pdfPath);

        broadcast({ status: 'complete' });
        res.json({ status: 'success' });
    } catch (error) {
        broadcast({ status: 'error', message: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));