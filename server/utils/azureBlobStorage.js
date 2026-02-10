const { BlobServiceClient } = require('@azure/storage-blob');
const sharp = require('sharp');
const path = require('path');

// Initialize Blob Service Client
let blobServiceClient = null;
let containerClient = null;

const initializeBlobStorage = () => {
  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'proof-images';

    if (!connectionString) {
      console.warn('⚠️  Azure Storage not configured. Using local file storage.');
      return false;
    }

    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);

    console.log('✅ Azure Blob Storage initialized');
    return true;
  } catch (error) {
    console.error('❌ Azure Blob Storage initialization error:', error.message);
    return false;
  }
};

const ensureContainerExists = async () => {
  try {
    if (!containerClient) return false;
    
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create({ access: 'blob' }); // Public read access for blobs
      console.log('✅ Azure Blob container created');
    }
    return true;
  } catch (error) {
    console.error('❌ Error ensuring container exists:', error.message);
    return false;
  }
};

/**
 * Upload image to Azure Blob Storage with compression
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<string>} - Blob URL
 */
const uploadImageToBlob = async (fileBuffer, originalFilename, mimetype) => {
  try {
    if (!containerClient) {
      throw new Error('Azure Blob Storage not initialized');
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const ext = path.extname(originalFilename);
    const blobName = `${path.basename(originalFilename, ext)}-${timestamp}-${randomString}${ext}`;

    // Get block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    let uploadBuffer = fileBuffer;
    let contentType = mimetype;

    // Compress images
    if (mimetype.startsWith('image/')) {
      try {
        const originalSize = fileBuffer.length;
        
        uploadBuffer = await sharp(fileBuffer)
          .resize(1920, 1920, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .jpeg({ quality: 85, progressive: true })
          .toBuffer();

        const compressedSize = uploadBuffer.length;
        console.log(`✅ Image compressed: ${originalFilename} (${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB)`);
        
        contentType = 'image/jpeg';
      } catch (compressionError) {
        console.warn('⚠️  Image compression failed, using original:', compressionError.message);
        uploadBuffer = fileBuffer;
      }
    }

    // Upload to Azure Blob Storage
    await blockBlobClient.uploadData(uploadBuffer, {
      blobHTTPHeaders: {
        blobContentType: contentType,
        blobCacheControl: 'public, max-age=31536000' // Cache for 1 year
      }
    });

    // Return the blob URL
    return blockBlobClient.url;
  } catch (error) {
    console.error('❌ Error uploading to Azure Blob Storage:', error);
    throw error;
  }
};

/**
 * Delete blob from Azure Blob Storage
 * @param {string} blobUrl - Full blob URL
 * @returns {Promise<boolean>}
 */
const deleteBlobFromStorage = async (blobUrl) => {
  try {
    if (!containerClient || !blobUrl) return false;

    // Extract blob name from URL
    const blobName = blobUrl.split('/').pop().split('?')[0]; // Remove query params if any
    
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    await blockBlobClient.deleteIfExists();
    
    console.log(`✅ Blob deleted: ${blobName}`);
    return true;
  } catch (error) {
    console.error('❌ Error deleting blob:', error.message);
    return false;
  }
};

/**
 * Check if Azure Blob Storage is enabled
 * @returns {boolean}
 */
const isBlobStorageEnabled = () => {
  return containerClient !== null;
};

module.exports = {
  initializeBlobStorage,
  ensureContainerExists,
  uploadImageToBlob,
  deleteBlobFromStorage,
  isBlobStorageEnabled
};