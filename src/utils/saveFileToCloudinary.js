import cloudinary from 'cloudinary';
import fs from 'fs/promises';

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file to Cloudinary and remove local file
 * @param {string} filePath
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export const saveFileToCloudinary = async (filePath) => {
  const result = await cloudinary.v2.uploader.upload(filePath, {
    folder: 'notes',
  });

  await fs.unlink(filePath);

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
};
