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

console.log('WebDAV client initialized with URL:', process.env.WEBDAV_URL);

const TEMP_DIR = './temp';
fs.mkdir(TEMP_DIR, { recursive: true })
  .then(() => console.log('Temp directory created/verified at:', TEMP_DIR))
  .catch(console.error);

const clients = new Set();

app.get('/status', (req, res) => {
    console.log('New client connected for status updates');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    clients.add(res);
    
    req.on('close', () => {
        console.log('Client disconnected from status updates');
        clients.delete(res);
    });
});

function broadcast(data) {
    console.log('Broadcasting status:', data);
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

app.post('/convert', async (req, res) => {
    const { epubUrl } = req.body;
    console.log('Received conversion request for:', epubUrl);

    const fileName = path.basename(epubUrl);
    const tempPath = path.join(TEMP_DIR, fileName);
    const pdfPath = tempPath.replace('.epub', '.pdf');

    try {
        broadcast({ step: 1, status: 'downloading' });
        console.log('Downloading EPUB from:', epubUrl);
        const response = await fetch(epubUrl);
        const buffer = await response.buffer();
        await fs.writeFile(tempPath, buffer);
        console.log('EPUB downloaded to:', tempPath);
        broadcast({ step: 2, status: 'downloaded' });

        broadcast({ step: 3, status: 'converting' });
        console.log('Converting EPUB to PDF...');
        await new Promise((resolve, reject) => {
            exec(`ebook-convert "${tempPath}" "${pdfPath}"`, (error) => {
                if (error) {
                    console.error('Conversion error:', error);
                    reject(error);
                }
                console.log('Conversion complete:', pdfPath);
                resolve();
            });
        });

        broadcast({ step: 4, status: 'uploading' });
        console.log('Uploading PDF to WebDAV...');
        const pdfContent = await fs.readFile(pdfPath);
        await webdav.putFileContents(`/${path.basename(pdfPath)}`, pdfContent);
        console.log('PDF uploaded successfully');

        broadcast({ step: 5, status: 'cleaning' });
        console.log('Cleaning up temporary files...');
        await fs.unlink(tempPath);
        await fs.unlink(pdfPath);
        console.log('Cleanup complete');

        broadcast({ status: 'complete' });
        res.json({ status: 'success' });
    } catch (error) {
        console.error('Error during conversion:', error);
        broadcast({ status: 'error', message: error.message });
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));