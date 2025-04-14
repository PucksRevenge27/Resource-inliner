const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const inliner = require('web-resource-inliner');

const app = express();
const upload = multer({ dest: 'uploads/' }); // Temporary upload folder

// Serve a simple HTML upload form
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Upload HTML or Folder</title>
    </head>
    <body>
      <h1>Upload an HTML File or a Folder</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept=".html" required />
        <button type="submit">Upload File</button>
      </form>
      <form action="/upload-folder" method="post" enctype="multipart/form-data">
        <input type="file" name="folder" webkitdirectory directory required />
        <button type="submit">Upload Folder</button>
      </form>
    </body>
    </html>
  `);
});

// Handle single file upload and process with web-resource-inliner
app.post('/upload', upload.single('file'), (req, res) => {
  const uploadedFilePath = req.file.path;

  // Read the uploaded file
  fs.readFile(uploadedFilePath, 'utf8', (err, htmlContent) => {
    if (err) {
      return res.status(500).send('Error reading uploaded file.');
    }

    // Process the HTML file with web-resource-inliner
    inliner.html(
      { fileContent: htmlContent, relativeTo: path.dirname(uploadedFilePath) },
      (err, inlinedHtml) => {
        if (err) {
          return res.status(500).send('Error inlining resources: ' + err.message);
        }

        // Clean up the temporary uploaded file
        fs.unlink(uploadedFilePath, () => {
          res.send(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Processed HTML</title>
            </head>
            <body>
              <h1>Inlined HTML</h1>
              <textarea style="width: 100%; height: 400px;">${inlinedHtml}</textarea>
              <br />
              <a href="/">Upload Another File</a>
            </body>
            </html>
          `);
        });
      }
    );
  });
});

// Handle folder uploads
app.post('/upload-folder', upload.array('folder'), (req, res) => {
  const files = req.files;

  if (!files || files.length === 0) {
    return res.status(400).send('No files uploaded.');
  }

  const processedFiles = [];

  files.forEach(file => {
    const filePath = file.path;

    // Only process HTML files
    if (path.extname(file.originalname) === '.html') {
      const htmlContent = fs.readFileSync(filePath, 'utf8');

      inliner.html(
        { fileContent: htmlContent, relativeTo: path.dirname(filePath) },
        (err, inlinedHtml) => {
          if (err) {
            console.error(`Error processing file ${file.originalname}:`, err);
          } else {
            processedFiles.push({ name: file.originalname, content: inlinedHtml });
          }

          // Clean up the temporary file
          fs.unlinkSync(filePath);
        }
      );
    } else {
      // Clean up non-HTML files
      fs.unlinkSync(filePath);
    }
  });

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Processed Folder</title>
    </head>
    <body>
      <h1>Processed HTML Files</h1>
      ${processedFiles.map(file => `
        <h2>${file.name}</h2>
        <textarea style="width: 100%; height: 200px;">${file.content}</textarea>
      `).join('')}
      <a href="/">Upload Another Folder</a>
    </body>
    </html>
  `);
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
