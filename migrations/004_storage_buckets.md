# Supabase Storage Configuration

## Overview
Configure Supabase Storage for handling product images, store logos, and other file uploads.

## Storage Buckets to Create

### 1. Product Images Bucket
```sql
-- Create product-images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);
```

### 2. Store Assets Bucket
```sql
-- Create store-assets bucket for logos, banners, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'store-assets',
  'store-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

### 3. Documents Bucket
```sql
-- Create documents bucket for receipts, invoices, etc.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false, -- Private bucket
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
);
```

## Row Level Security Policies

### Product Images Policies
```sql
-- Allow public read access to product images
CREATE POLICY "Public can view product images" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Allow authenticated users to upload product images
CREATE POLICY "Authenticated users can upload product images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'product-images' 
  AND auth.role() = 'authenticated'
);

-- Allow store owners to update their product images
CREATE POLICY "Store owners can update their product images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow store owners to delete their product images
CREATE POLICY "Store owners can delete their product images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'product-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Store Assets Policies
```sql
-- Allow public read access to store assets
CREATE POLICY "Public can view store assets" ON storage.objects
FOR SELECT USING (bucket_id = 'store-assets');

-- Allow store owners to manage their assets
CREATE POLICY "Store owners can manage store assets" ON storage.objects
FOR ALL USING (
  bucket_id = 'store-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### Documents Policies
```sql
-- Allow users to view their own documents
CREATE POLICY "Users can view own documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to upload their own documents
CREATE POLICY "Users can upload own documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Frontend Integration

### React Upload Component
```jsx
// components/ImageUpload.jsx
import { useState } from 'react'
import { supabase } from '../config/supabase'

function ImageUpload({ bucket, folder, onUpload }) {
  const [uploading, setUploading] = useState(false)

  const uploadImage = async (event) => {
    try {
      setUploading(true)
      
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file)

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      onUpload(publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={uploadImage}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  )
}
```

### Image URL Helper
```javascript
// utils/storage.js
import { supabase } from '../config/supabase'

export const getImageUrl = (bucket, path) => {
  if (!path) return null
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  
  return data.publicUrl
}

export const uploadImage = async (bucket, folder, file) => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${folder}/${Date.now()}.${fileExt}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file)

  if (error) throw error

  return {
    path: fileName,
    url: getImageUrl(bucket, fileName)
  }
}

export const deleteImage = async (bucket, path) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path])

  if (error) throw error
}
```

## File Organization Structure

```
product-images/
├── {store_id}/
│   ├── products/
│   │   ├── {product_id}/
│   │   │   ├── main.jpg
│   │   │   ├── gallery1.jpg
│   │   │   └── gallery2.jpg
│   │   └── categories/
│   │       ├── fruits.jpg
│   │       └── vegetables.jpg

store-assets/
├── {store_id}/
│   ├── logo.png
│   ├── banner.jpg
│   └── favicon.ico

documents/
├── {user_id}/
│   ├── orders/
│   │   ├── receipt_{order_id}.pdf
│   │   └── invoice_{order_id}.pdf
│   └── business/
│       ├── license.pdf
│       └── tax_certificate.pdf
```

## Image Optimization

### Automatic Image Transformation
```javascript
// utils/imageTransform.js
export const getOptimizedImageUrl = (originalUrl, options = {}) => {
  const {
    width = 800,
    height = 600,
    quality = 80,
    format = 'webp'
  } = options

  // Use Supabase image transformation (if available)
  // or implement using external service like Cloudinary
  return `${originalUrl}?width=${width}&height=${height}&quality=${quality}&format=${format}`
}

// Usage in components
const optimizedUrl = getOptimizedImageUrl(product.image, {
  width: 400,
  height: 300,
  quality: 85
})
```

## CLI Commands for Setup

```bash
# Create buckets via Supabase CLI
supabase storage create product-images --public
supabase storage create store-assets --public
supabase storage create documents --private

# Apply RLS policies
psql -h db.your-project.supabase.co -U postgres -d postgres -f storage_policies.sql
```

## Best Practices

1. **File Naming**: Use timestamp-based naming to avoid conflicts
2. **Folder Structure**: Organize files by store/user for easy management
3. **File Validation**: Always validate file types and sizes on upload
4. **Image Optimization**: Compress images before upload
5. **Cleanup**: Implement cleanup for orphaned files
6. **CDN**: Consider using a CDN for better performance
7. **Backup**: Regular backup of important assets

## Monitoring and Analytics

```sql
-- Query to monitor storage usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_size
FROM storage.objects 
GROUP BY bucket_id;

-- Query to find large files
SELECT 
  name, 
  bucket_id,
  (metadata->>'size')::bigint as size_bytes,
  created_at
FROM storage.objects 
WHERE (metadata->>'size')::bigint > 5242880 -- Files larger than 5MB
ORDER BY size_bytes DESC;
```