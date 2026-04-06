import crypto from 'crypto';
import { put } from '@vercel/blob';
import path from 'path';
import fs from 'fs';

/**
 * Upload file to Vercel Blob (production) or local storage (development)
 * @param {File} file - File object from form data
 * @param {String} folder - Folder path
 * @returns {Object} Upload result with filename and URL
 */
export async function uploadFileToS3(file, folder = 'uploads') {
  try {
    // Check if we're in development
    if (process.env.NODE_ENV === 'development') {
      return uploadFileLocally(file, folder);
    }

    // Production: Use Vercel Blob
    return uploadToVercelBlob(file, folder);

  } catch (error) {
    console.error('File upload error:', error);
    throw new Error(`File upload failed: ${error.message}`);
  }
}

/**
 * Upload file to Vercel Blob Storage
 */
async function uploadToVercelBlob(file, folder = 'uploads') {
  if (!file || file.size === 0) {
    throw new Error('No file provided or file is empty');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds maximum limit of 10MB');
  }

  // Validate file type (allowed types)
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only PDF, JPEG, PNG, and Word documents are allowed');
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const filename = `${folder}/${timestamp}-${randomString}.${fileExtension}`;

  console.log('[BLOB] Uploading file to Vercel Blob:', filename);

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Upload to Vercel Blob
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType: file.type,
  });

  console.log('[BLOB] ✅ File uploaded successfully:', blob.url);

  return {
    filename: filename,
    s3Url: blob.url,
    s3Key: filename,
    originalName: file.name,
    mimeType: file.type,
    size: file.size
  };
}

/**
 * Upload file locally (for development)
 */
async function uploadFileLocally(file, folder = 'uploads') {
  if (!file || file.size === 0) {
    throw new Error('No file provided or file is empty');
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('File size exceeds maximum limit of 10MB');
  }

  // Generate unique filename
  const fileExtension = file.name.split('.').pop();
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  const safeFilename = `${timestamp}-${randomString}.${fileExtension}`;

  // Create uploads directory structure
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', folder);

  try {
    await fs.promises.mkdir(uploadsDir, { recursive: true });
  } catch (err) {
    console.log('Directory already exists or created:', uploadsDir);
  }

  // Convert file to buffer and save
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const filePath = path.join(uploadsDir, safeFilename);

  await fs.promises.writeFile(filePath, buffer);

  // Return URL that can be accessed from browser
  const fileUrl = `/uploads/${folder}/${safeFilename}`;

  console.log('[LOCAL] File uploaded:', fileUrl);

  return {
    filename: safeFilename,
    s3Url: fileUrl,
    s3Key: `${folder}/${safeFilename}`,
    originalName: file.name,
    mimeType: file.type,
    size: file.size
  };
}

/**
 * Generate a signed URL for private files (Vercel Blob handles this automatically with public access)
 */
export async function generateSignedUrl(fileKey) {
  // For Vercel Blob with public access, the URL is already accessible
  return fileKey;
}

/**
 * Delete file from storage
 */
export async function deleteFile(fileKey) {
  try {
    if (process.env.NODE_ENV === 'development') {
      // Delete local file
      const filePath = path.join(process.cwd(), 'public', fileKey);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      return { success: true };
    }

    // For Vercel Blob, use the del function
    const { del } = await import('@vercel/blob');
    await del(fileKey);
    return { success: true };
  } catch (error) {
    console.error('Delete file error:', error);
    return { success: false, error: error.message };
  }
}

export default {
  uploadFileToS3,
  generateSignedUrl,
  deleteFile
};