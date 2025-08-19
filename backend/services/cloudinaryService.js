const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');
const sharp = require('sharp');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload buffer helper
async function uploadFromBuffer(buffer, { folder = 'general', publicId = null, tags = [], resourceType = 'auto', transform = null } = {}) {
  try {
    // Optional transform via sharp before upload
    if (transform) {
      let img = sharp(buffer);
      if (transform.resize) {
        img = img.resize(transform.resize.width, transform.resize.height, { fit: 'inside' });
      }
      if (transform.format) {
        img = img.toFormat(transform.format, { quality: transform.quality || 80 });
      }
      buffer = await img.toBuffer();
    }

    const stream = Readable.from(buffer);
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream({
        folder: `saas-local/${folder}`,
        public_id: publicId || undefined,
        tags,
        resource_type: resourceType
      }, (err, res) => err ? reject(err) : resolve(res));
      stream.pipe(uploadStream);
    });

    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
      resourceType: result.resource_type
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Upload from remote URL
async function uploadFromUrl(url, { folder = 'general', publicId = null, tags = [], resourceType = 'auto' } = {}) {
  try {
    const result = await cloudinary.uploader.upload(url, {
      folder: `saas-local/${folder}`,
      public_id: publicId || undefined,
      tags,
      resource_type: resourceType
    });
    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      format: result.format,
      resourceType: result.resource_type
    };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// Delete asset
async function deleteAsset(publicId, resourceType = 'image') {
  try {
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return { success: res.result === 'ok', result: res.result };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

module.exports = { uploadFromBuffer, uploadFromUrl, deleteAsset };
