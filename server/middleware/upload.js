const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { isBlobStorageEnabled, uploadImageToBlob } = require('../utils/azureBlobStorage');

// Create uploads directory if it doesn't exist (fallback for local storage)
const uploadsDir = path.join(__dirname, '../../uploads/proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage - use memory storage for processing
const storage = multer.memoryStorage();

// File filter - only allow images and PDFs
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only images (JPG, PNG) and PDF files are allowed!'));
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: fileFilter
});

// Middleware to process and upload files (to Blob Storage or local)
const processAndUpload = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const isImage = /jpeg|jpg|png/.test(path.extname(req.file.originalname).toLowerCase());
    const useBlobStorage = isBlobStorageEnabled();

    if (useBlobStorage) {
      // Upload to Azure Blob Storage
      const blobUrl = await uploadImageToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      
      // Store blob URL in req.file for consistency
      req.file.blobUrl = blobUrl;
      req.file.path = blobUrl; // For compatibility with existing code
      
      console.log(`✅ File uploaded to Azure Blob Storage: ${req.file.originalname}`);
    } else {
      // Fallback to local storage
      if (!isImage) {
        // For PDFs, save directly
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(req.file.originalname);
        const name = path.basename(req.file.originalname, ext);
        const filename = name + '-' + uniqueSuffix + ext;
        const filepath = path.join(uploadsDir, filename);
        
        fs.writeFileSync(filepath, req.file.buffer);
        req.file.filename = filename;
        req.file.path = '/uploads/proofs/' + filename; // Web-accessible path
        
        console.log(`✅ PDF saved locally: ${filename}`);
      } else {
        // Compress and save images locally
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const name = path.basename(req.file.originalname, path.extname(req.file.originalname));
        const filename = name + '-' + uniqueSuffix + '.jpg';
        const filepath = path.join(uploadsDir, filename);

        // Compress and resize image
        await sharp(req.file.buffer)
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ 
            quality: 85,
            progressive: true 
          })
          .toFile(filepath);

        req.file.filename = filename;
        req.file.path = '/uploads/proofs/' + filename; // Web-accessible path
        
        const stats = fs.statSync(filepath);
        req.file.size = stats.size;

        console.log(`✅ Image compressed and saved locally: ${req.file.originalname} → ${filename} (${(stats.size / 1024).toFixed(1)}KB)`);
      }
    }
    
    next();
  } catch (error) {
    console.error('❌ File processing error:', error);
    next(error);
  }
};

// Export middleware
module.exports = {
  single: (fieldName) => [upload.single(fieldName), processAndUpload],
  processAndUpload
};