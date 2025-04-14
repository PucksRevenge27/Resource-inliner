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
      <title>Upload HTML File</title>
    </head>
    <body>
      <h1>Upload an HTML File</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept=".html" required />
        <button type="submit">Upload and Process</button>
      </form>
    </body>
    </html>
  `);
});

// Handle file upload and process with web-resource-inliner
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
              <a href="/">Upload Another File</a>
            </body>
            </html>
          `);
        });
      }
    );
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});