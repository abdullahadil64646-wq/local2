const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const axios = require('axios');
const sharp = require('sharp');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload file from buffer
const uploadFromBuffer = async (buffer, folder = 'general', publicId = null, tags = []) => {
  try {
    // Create a readable stream from the buffer
    const stream = Readable.from(buffer);
    
    // Create upload promise
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `saas-local/${folder}`,
          public_id: publicId,
          tags: tags,
          resource_type: 'auto'
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );
      
      stream.pipe(uploadStream);
    });
    
    const result = await uploadPromise;
    
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      resourceType: result.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Upload file from URL
const uploadFromUrl = async (url, folder = 'general', publicId = null, tags = []) => {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: `saas-local/${folder}`,
      public_id: publicI