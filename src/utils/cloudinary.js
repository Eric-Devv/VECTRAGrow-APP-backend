const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'vectragrow',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'webm'],
    resource_type: 'auto'
  }
});

// Create multer upload instance
const upload = multer({ storage: storage });

// Upload file to Cloudinary
async function uploadToCloudinary(file, folder) {
  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder: `vectragrow/${folder}`,
      resource_type: 'auto'
    });
    return result;
  } catch (error) {
    console.error('Cloudinary upload failed:', error);
    throw error;
  }
}

// Delete file from Cloudinary
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Cloudinary deletion failed:', error);
    throw error;
  }
}

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary
}; 