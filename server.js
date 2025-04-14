const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const inliner = require('web-resource-inliner');
const { v4: uuidv4 } = require('uuid'); // For generating unique file names

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
      <h1>Upload an HTML File</h1>
      <form action="/upload" method="post" enctype="multipart/form-data">
        <input type="file" name="file" accept=".html" required />
        <button type="submit">Upload File</button>
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

        // Write the processed file to a temporary location
        const resultFileName = `${uuidv4()}.html`;
        const resultFilePath = path.join(__dirname, 'uploads', resultFileName);
        fs.writeFileSync(resultFilePath, inlinedHtml, 'utf8');

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
              <a href="/download/${resultFileName}" download>
                <button>Download Processed File</button>
              </a>
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

// Handle file download
app.get('/download/:fileName', (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, 'uploads', fileName);

  // Check if the file exists
  if (fs.existsSync(filePath)) {
    res.download(filePath, (err) => {
      if (err) {
        console.error('Error during file download:', err);
        res.status(500).send('Error downloading the file.');
      }

      // Delete the file after download
      fs.unlinkSync(filePath);
    });
  } else {
    res.status(404).send('File not found.');
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
