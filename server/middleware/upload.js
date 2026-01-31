const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Create uploads directory if it doesn't exist
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

// Middleware to compress images after upload
const compressImage = async (req, res, next) => {
  if (!req.file) {
    return next();
  }

  // Only compress images, not PDFs
  const isImage = /jpeg|jpg|png/.test(path.extname(req.file.originalname).toLowerCase());
  
  if (!isImage) {
    // For PDFs, save directly
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(req.file.originalname);
    const name = path.basename(req.file.originalname, ext);
    const filename = name + '-' + uniqueSuffix + ext;
    const filepath = path.join(uploadsDir, filename);
    
    fs.writeFileSync(filepath, req.file.buffer);
    req.file.filename = filename;
    req.file.path = filepath;
    return next();
  }

  try {
    // Create unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const name = path.basename(req.file.originalname, path.extname(req.file.originalname));
    const filename = name + '-' + uniqueSuffix + '.jpg';
    const filepath = path.join(uploadsDir, filename);

    // Compress and resize image
    await sharp(req.file.buffer)
      .resize(1920, 1920, { // Max 1920x1920, maintain aspect ratio
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ 
        quality: 85, // Good quality, smaller size
        progressive: true 
      })
      .toFile(filepath);

    // Update req.file with processed file info
    req.file.filename = filename;
    req.file.path = filepath;
    
    // Get file stats
    const stats = fs.statSync(filepath);
    req.file.size = stats.size;

    console.log(`✅ Image compressed: ${req.file.originalname} → ${filename} (${(stats.size / 1024).toFixed(1)}KB)`);
    
    next();
  } catch (error) {
    console.error('❌ Image compression error:', error);
    next(error);
  }
};

// Export both middleware
module.exports = {
  single: (fieldName) => [upload.single(fieldName), compressImage],
  compressImage
};
