// composables/useImageHandling.js
import { ref } from 'vue';
import { generateArticleThumbnail, getPrompts } from '@/features/articles/ArticlesService';
import Swal from 'sweetalert2';

export function useImageHandling() {
    // State
    const coverBase64 = ref('');
    const thumbnailBase64 = ref('');
    const isGeneratingThumbnail = ref(false);
    const cachedPrompts = ref(null);

    // Generate thumbnail from uploaded image
    const generateThumbnailFromImage = (base64) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64;

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    const maxWidth = 200;
                    const maxHeight = 200;
                    let { width, height } = img;

                    // Calculate new dimensions maintaining aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Return compressed thumbnail
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => {
                reject(new Error('Failed to load image'));
            };
        });
    };

    // Handle file upload
    const handleImageUpload = async (file) => {
        if (!file) return false;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            Swal.fire({
                title: 'Invalid File Type',
                text: 'Please upload a valid image file (JPEG, PNG, GIF, or WebP)',
                icon: 'error',
                confirmButtonText: 'OK',
            });
            return false;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            Swal.fire({
                title: 'File Too Large',
                text: 'Please upload an image smaller than 10MB',
                icon: 'error',
                confirmButtonText: 'OK',
            });
            return false;
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async () => {
                try {
                    coverBase64.value = reader.result;
                    thumbnailBase64.value = await generateThumbnailFromImage(reader.result);
                    resolve(true);
                } catch (error) {
                    console.error('Error processing image:', error);
                    Swal.fire({
                        title: 'Error',
                        text: 'Failed to process image. Please try again.',
                        icon: 'error',
                        confirmButtonText: 'OK',
                    });
                    reject(error);
                }
            };

            reader.onerror = () => {
                console.error('Error reading file');
                Swal.fire({
                    title: 'Error',
                    text: 'Failed to read image file. Please try again.',
                    icon: 'error',
                    confirmButtonText: 'OK',
                });
                reject(new Error('Failed to read file'));
            };

            reader.readAsDataURL(file);
        });
    };

    // Generate AI thumbnail
    const generateAIThumbnail = async (title, summary, articleType) => {
        if (!title || !articleType) {
            Swal.fire({
                title: 'Missing Information',
                text: 'Please add a title and select an article type first',
                icon: 'warning',
                confirmButtonText: 'OK',
            });
            return false;
        }

        try {
            isGeneratingThumbnail.value = true;

            // Fetch prompts if not cached
            if (!cachedPrompts.value) {
                const res = await getPrompts();
                if (res.status !== 200 || !res.data) {
                    throw new Error('Failed to fetch prompts');
                }

                const prompts = res.data;
                const thumbnailPrompt = prompts.find(
                    (prompt) => prompt.active && prompt.type === 'thumbnail'
                );

                cachedPrompts.value = {
                    thumbnail:
                        thumbnailPrompt?.content ||
                        'Generate image based on the title: {{topic}} and summary: {{summary}}',
                };
            }

            // Prepare prompt text
            let promptText = cachedPrompts.value.thumbnail;
            promptText = promptText
                .replace('{{topic}}', title)
                .replace('{{summary}}', summary || '');

            // Generate thumbnail
            const response = await generateArticleThumbnail(promptText);

            if (!response.data) {
                throw new Error('No image data received');
            }

            // Set the generated images
            coverBase64.value = 'data:image/png;base64,' + response.data;
            thumbnailBase64.value = await generateThumbnailFromImage(coverBase64.value);

            Swal.fire({
                title: 'Success!',
                text: 'Thumbnail generated successfully!',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false,
            });

            return true;
        } catch (error) {
            console.error('Error generating AI thumbnail:', error);

            Swal.fire({
                title: 'Generation Failed',
                text: 'Failed to generate thumbnail. Please try again or upload an image manually.',
                icon: 'error',
                confirmButtonText: 'OK',
            });

            return false;
        } finally {
            isGeneratingThumbnail.value = false;
        }
    };

    // Remove current images
    const removeImages = () => {
        coverBase64.value = '';
        thumbnailBase64.value = '';
    };

    // Set images programmatically
    const setImages = (cover, thumbnail) => {
        if (cover) coverBase64.value = cover;
        if (thumbnail) thumbnailBase64.value = thumbnail;
    };

    // Validate images
    const hasValidImages = () => {
        return Boolean(coverBase64.value && thumbnailBase64.value);
    };

    // Convert image URL to base64
    const urlToBase64 = async (url) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();

            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error('Error converting URL to base64:', error);
            return null;
        }
    };

    // Get image dimensions
    const getImageDimensions = (base64) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = base64;
            img.onload = () => {
                resolve({
                    width: img.width,
                    height: img.height,
                    aspectRatio: img.width / img.height
                });
            };
            img.onerror = () => {
                resolve(null);
            };
        });
    };

    return {
        // State
        coverBase64,
        thumbnailBase64,
        isGeneratingThumbnail,

        // Methods
        generateThumbnailFromImage,
        handleImageUpload,
        generateAIThumbnail,
        removeImages,
        setImages,
        hasValidImages,
        urlToBase64,
        getImageDimensions,
    };
}