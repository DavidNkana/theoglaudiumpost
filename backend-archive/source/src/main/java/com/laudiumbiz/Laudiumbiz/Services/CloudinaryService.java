package com.laudiumbiz.Laudiumbiz.Services;

import com.cloudinary.Cloudinary;
import com.cloudinary.Transformation;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Base64;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * PURPOSE: Manages image upload, transformation, and deletion through the Cloudinary CDN service.
 * Handles base64 image uploads, applies default transformations for transparency and quality optimization.
 *
 * KEY METHODS:
 * - uploadImage(String base64Image, String folder, String publicId): Uploads base64 encoded images to Cloudinary
 * - deleteImage(String publicId): Removes images from Cloudinary storage
 * - addScaleAutoTransformation(String imageUrl): Adds responsive scaling transformations to image URLs
 * - getPublicIdFromUrl(String url): Extracts the Cloudinary public ID from an image URL
 *
 * INTEGRATIONS: Cloudinary API (cloud-based image and video management service)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CloudinaryService {
    
    private final Cloudinary cloudinary;

    // Pattern to match segments before and after '/upload/' in a Cloudinary URL
    private static final Pattern CLOUDINARY_UPLOAD = Pattern.compile("(.*?/upload/)(.*)");

    /**
     * Upload an image to Cloudinary from a base64 encoded string
     * 
     * @param base64Image Base64 encoded image string (can include data:image/jpeg;base64, prefix)
     * @param folder Optional folder to upload to
     * @param publicId Optional public ID for the image
     * @return URL of the uploaded image
     * @throws IOException If upload fails
     */
    public String uploadImage(String base64Image, String folder, String publicId) throws IOException {
        try {
            // Remove the base64 prefix if present (e.g., "data:image/jpeg;base64,")
            String imageData = base64Image;
            if (base64Image.contains(",")) {
                imageData = base64Image.substring(base64Image.indexOf(",") + 1);
            }

            // Decode the base64 string to bytes
            byte[] imageBytes = Base64.getDecoder().decode(imageData);

            // Prepare upload parameters
            Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type", "image",
                    "folder", folder
            );

            // Add public_id if provided
            if (publicId != null && !publicId.isEmpty()) {
                params.put("public_id", publicId);
            }

            // Upload the image
            Map<?, ?> uploadResult = cloudinary.uploader().upload(imageBytes, params);

            // Get the secure URL of the uploaded image
            String imageUrl = (String) uploadResult.get("secure_url");
            // Ensure required defaults are applied to all returned URLs
            imageUrl = withTransparencyDefaults(imageUrl);
            log.info("Image uploaded successfully to Cloudinary: {}", imageUrl);
            
            return imageUrl;
        } catch (IOException e) {
            log.error("Error uploading image to Cloudinary", e);
            throw e;
        }
    }

    /**
     * Upload an image to Cloudinary from a base64 encoded string
     * 
     * @param base64Image Base64 encoded image string (can include data:image/jpeg;base64, prefix)
     * @param folder Optional folder to upload to
     * @return URL of the uploaded image
     * @throws IOException If upload fails
     */
    public String uploadImage(String base64Image, String folder) throws IOException {
        return uploadImage(base64Image, folder, null);
    }
    
    /**
     * Upload an image to Cloudinary from a base64 encoded string
     * 
     * @param base64Image Base64 encoded image string
     * @return URL of the uploaded image
     * @throws IOException If upload fails
     */
    public String uploadImage(String base64Image) throws IOException {
        return uploadImage(base64Image, "images", null);
    }
    
    /**
     * Delete an image from Cloudinary
     *
     * @param publicId Public ID of the image to delete
     * @return Result of the deletion (true if successful)
     */
    public boolean deleteImage(String publicId) {
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
            String status = (String) result.get("result");
            return "ok".equals(status);
        } catch (IOException e) {
            log.error("Error deleting image from Cloudinary", e);
            return false;
        }
    }

    /**
     * Upload a video to Cloudinary from a base64 encoded string
     *
     * @param base64Video Base64 encoded video string (can include data:video/mp4;base64, prefix)
     * @param folder Optional folder to upload to
     * @param publicId Optional public ID for the video
     * @return URL of the uploaded video
     * @throws IOException If upload fails
     */
    public String uploadVideo(String base64Video, String folder, String publicId) throws IOException {
        try {
            // Remove the base64 prefix if present (e.g., "data:video/mp4;base64,")
            String videoData = base64Video;
            if (base64Video.contains(",")) {
                videoData = base64Video.substring(base64Video.indexOf(",") + 1);
            }

            // Decode the base64 string to bytes
            byte[] videoBytes = Base64.getDecoder().decode(videoData);

            // Prepare upload parameters for video
            Map<String, Object> params = ObjectUtils.asMap(
                    "resource_type", "video",
                    "folder", folder != null ? folder : "videos"
            );

            // Add public_id if provided
            if (publicId != null && !publicId.isEmpty()) {
                params.put("public_id", publicId);
            }

            // Upload the video
            Map<?, ?> uploadResult = cloudinary.uploader().upload(videoBytes, params);

            // Get the secure URL of the uploaded video
            String videoUrl = (String) uploadResult.get("secure_url");
            log.info("Video uploaded successfully to Cloudinary: {}", videoUrl);

            return videoUrl;
        } catch (IOException e) {
            log.error("Error uploading video to Cloudinary", e);
            throw e;
        }
    }

    /**
     * Upload a video to Cloudinary from a base64 encoded string
     *
     * @param base64Video Base64 encoded video string
     * @return URL of the uploaded video
     * @throws IOException If upload fails
     */
    public String uploadVideo(String base64Video) throws IOException {
        return uploadVideo(base64Video, "videos", null);
    }

    /**
     * Delete a video from Cloudinary
     *
     * @param publicId Public ID of the video to delete
     * @return Result of the deletion (true if successful)
     */
    public boolean deleteVideo(String publicId) {
        try {
            Map<?, ?> result = cloudinary.uploader().destroy(publicId,
                ObjectUtils.asMap("resource_type", "video"));
            String status = (String) result.get("result");
            return "ok".equals(status);
        } catch (IOException e) {
            log.error("Error deleting video from Cloudinary", e);
            return false;
        }
    }
    
    /**
     * Add scale auto transformation to a Cloudinary URL
     * 
     * @param imageUrl Cloudinary URL
     * @return URL with scale auto transformation
     */
    public String addScaleAutoTransformation(String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return imageUrl;
        }
        
        // Pattern to match Cloudinary URLs
        // Group 1: Everything before /upload/
        // Group 2: Everything after /upload/
        Pattern pattern = Pattern.compile("(.*?/upload/)(.*)");
        Matcher matcher = pattern.matcher(imageUrl);
        
        if (matcher.matches()) {
            // Insert c_scale,w_auto,q_auto,f_auto/ between /upload/ and the rest of the URL
            return matcher.group(1) + "c_scale,w_auto,q_auto,f_auto/" + matcher.group(2);
        }
        
        // If the URL doesn't match the expected pattern, return it unchanged
        log.warn("Could not apply transformations to URL: {}", imageUrl);
        return imageUrl;
    }

    /**
     * Inserts a Cloudinary transformation segment immediately after the '/upload/' part.
     * If the URL doesn't follow the expected Cloudinary pattern, it is returned unchanged.
     *
     * @param url        Original Cloudinary URL
     * @param transform  Transformation string (e.g., "e_make_transparent:10,q_auto,f_png")
     * @return URL with the transformation injected or original URL if pattern doesn't match
     */
    private String insertTransformations(String url, String transform) {
        if (url == null || url.isBlank()) return url;
        Matcher m = CLOUDINARY_UPLOAD.matcher(url);
        if (!m.matches()) return url; // Not a Cloudinary upload URL
        return m.group(1) + transform + "/" + m.group(2);
    }

    /**
     * Ensures the returned Cloudinary URL applies background transparency along with sane defaults
     * that preserve the alpha channel and optimize quality.
     *
     * @param url           Original Cloudinary URL
     * @param transparency  Transparency aggressiveness value for e_make_transparent (e.g., 10)
     * @return Transformed URL with transparency effect applied
     */
    private static final String DEFAULT_BG_COLOR = "ead7bd";
    private static final int DEFAULT_TRANSPARENCY = 7;

    /**
     * Ensures the returned Cloudinary URL applies the required transparency and color
     * along with sane defaults that preserve the alpha channel and optimize quality.
     *
     * Always injects: e_make_transparent:5,co_rgb:ead7bd,q_auto,f_png
     */
    private String withTransparencyDefaults(String url) {
        String transform = "e_make_transparent:" + DEFAULT_TRANSPARENCY
                + ",co_rgb:" + DEFAULT_BG_COLOR
                + ",q_auto,f_png";
        return insertTransformations(url, transform);
    }
    
    /**
     * Generate a Cloudinary URL with width and height transformations applied.
     * Returns the URL with c_scale,w_{width},h_{height},q_auto transformations.
     *
     * @param publicId  The Cloudinary public ID of the image
     * @param width     Desired width in pixels
     * @param height    Desired height in pixels
     * @return Transformed URL string
     */
    public String getUrl(String publicId, int width, int height) {
        Transformation transformation = new Transformation()
                .width(width)
                .height(height)
                .crop("scale")
                .quality("auto");
        return cloudinary.url()
                .transformation(transformation)
                .generate(publicId);
    }

    /**
     * Extract the public ID from a Cloudinary URL
     * 
     * @param url Cloudinary URL
     * @return Public ID
     */
    public String getPublicIdFromUrl(String url) {
        if (url == null || url.isEmpty()) {
            return null;
        }
        
        // Example URL: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/image.jpg
        // Public ID: folder/image
        
        String[] parts = url.split("/upload/");
        if (parts.length < 2) {
            return null;
        }
        
        String afterUpload = parts[1];
        // Remove version if present
        if (afterUpload.startsWith("v")) {
            afterUpload = afterUpload.replaceFirst("v\\d+/", "");
        }
        
        // Remove file extension
        int lastDotIndex = afterUpload.lastIndexOf(".");
        if (lastDotIndex > 0) {
            afterUpload = afterUpload.substring(0, lastDotIndex);
        }
        
        return afterUpload;
    }
}