
import { createClient , AuthType} from 'webdav';
import { promises as fs } from 'fs';
import path from 'path';





const webdav = createClient(
    process.env.WEBDAV_URL,
    {
        username: process.env.WEBDAV_USERNAME,
        password: process.env.WEBDAV_PASSWORD,
        authType: AuthType.Auto,
        headers: {
            'Depth': '1',
            'Content-Type': 'application/xml',
            'Accept': 'application/xml'
        }
    }
);



const pdfPath = "temp/sample1.epub"

// const pdfContent = await fs.readFile(pdfPath);
// await webdav.putFileContents(`/${path.basename(pdfPath)}`, pdfContent);

await webdav.customRequest('/', { method: 'PROPFIND' })
  .then(response => {
    console.log('Success:', response);
  })
  .catch(error => {
    console.log('Errorrrrrr:', error);
  });


try {
    console.log('Testing WebDAV connection...');
    const status = await webdav.exists('/');
    console.log('WebDAV connection status:', status);
   } catch (error) {
    console.error('WebDAV connection failed:', error);
   }

// First check if we can read the directory
try {
    console.log('Reading WebDAV directory...');
    const items = await webdav.getDirectoryContents('/');
    console.log('Directory contents:', items);
    
    console.log('Uploading file...');
    const pdfContent = await fs.readFile(pdfPath);
    await webdav.putFileContents(`/${path.basename(pdfPath)}`, pdfContent);
    console.log('Upload complete');
   } catch (error) {
    console.error('WebDAV error:', 1);
   }