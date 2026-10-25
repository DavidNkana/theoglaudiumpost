/**
 * utils/index.js
 *
 * General utility functions for the Laudium Biz application.
 *
 * This module:
 * - Defines constants for ad placements and dimensions
 * - Provides date and time formatting utilities
 * - Contains helper functions for UI elements like badges and status indicators
 * - Includes utilities for processing article content and AI responses
 * - Offers general-purpose utility functions used throughout the application
 */

// Ad placement location constants
export const HOME_BANNER = "home_banner";
export const FIXED_BOTTOM = "fixed_bottom";
export const IN_ARTICLE_TOP = "in_article_top";
export const IN_ARTICLE_MID = "in_article_mid";
export const IN_ARTICLE_BOTTOM = "in_article_bottom";
export const SIDEBAR_TOP = "sidebar_top";
export const SIDEBAR_BOTTOM = "sidebar_bottom";
export const SIDEBAR_MID = "sidebar_mid";

/**
 * Returns the recommended dimensions for a given ad placement
 *
 * @param {string} placement - The ad placement location key
 * @returns {string} - Dimensions in the format "widthxheight"
 */
// export function getAdDimensions(placement) {
//   switch (placement) {
//     case HOME_BANNER:
//       // return { width: 1200, height: 300 }; // Large desktop banner
//       return "1200x300"; // Large desktop banner

//     case IN_ARTICLE_TOP:
//     case IN_ARTICLE_MID:
//     case IN_ARTICLE_BOTTOM:
//       // return { width: 728, height: 90 }; // Medium rectangle or leaderboard size
//       return "728x90";

//     case SIDEBAR:
//       // return { width: 300, height: 600 }; // Skyscraper
//       return "300x600";

//     default:
//       // return { width: 728, height: 90 }; // fallback default
//       return "728x90";
//   }
// }
// export function getAdAspectRatio(placement) {
export function getAdDimensions(placement) {
    switch (placement) {
        case FIXED_BOTTOM:
            // Wide horizontal banner
            return "6:1";
        case HOME_BANNER:
            // Wide horizontal banner
            return "6:1";
        case IN_ARTICLE_TOP:
        case IN_ARTICLE_MID:
        case IN_ARTICLE_BOTTOM:
            // Leaderboard or rectangle
            return "16:9";

        case SIDEBAR_TOP:
        case SIDEBAR_MID:
        case SIDEBAR_BOTTOM:
            // Tall vertical ad
            return "1:1";

        default:
            return "4:3"; // fallback
    }
}

/**
 * Removes Markdown code block markers from text
 *
 * Used to clean up AI-generated content that may contain
 * code block markers (```html, ```) around HTML content.
 *
 * @param {string} text - The text to process
 * @returns {string} - The text with code block markers removed
 */
export function stripCodeBlockMarkers(text) {
    return text
        .replace(/^```html\s*/i, "") // remove opening ```html (case-insensitive)
        .replace(/^```/, "") // just in case it's ``` without 'html'
        .replace(/```$/, ""); // remove closing ```
}

/**
 * Parses AI-generated article responses to extract HTML content and summary
 *
 * @param {string} responseText - The raw response text from the AI
 * @returns {Object} - Object containing html and summary properties
 */
export function parseArticleResponse(responseText) {
    const summaryMarker = "Summary:";
    const parts = responseText.split(summaryMarker);

    if (parts.length < 2) {
        // Fallback if the expected format is missing
        return {
            html: responseText.trim(),
            summary: "",
        };
    }

    return {
        html: parts[0].trim(),
        summary: parts[1].trim(),
    };
}

/**
 * Formats a date as a relative time string (e.g., "2 hours ago")
 *
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted relative time string
 */
export const formatTimeAgo = (date) => {
    if (!date) return "Unknown time";

    const now = new Date();
    const targetDate = new Date(date);
    const isFuture = targetDate > now;

    let diffInMilliseconds = Math.abs(now - targetDate);

    const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);

    const label = (value, unit) => `${value} ${unit}${value !== 1 ? "s" : ""}`;

    let result;
    if (diffInSeconds < 60) {
        result = "a few seconds";
    } else if (diffInMinutes < 60) {
        result = label(diffInMinutes, "minute");
    } else if (diffInHours < 24) {
        result = label(diffInHours, "hour");
    } else if (diffInDays < 7) {
        result = label(diffInDays, "day");
    } else if (diffInWeeks < 5) {
        result = label(diffInWeeks, "week");
    } else if (diffInMonths < 12) {
        result = label(diffInMonths, "month");
    } else {
        result = label(diffInYears, "year");
    }

    return isFuture ? `Due in ${result}` : `${result} ago`;
};

/**
 * Formats a date as a full date and time string
 *
 * @param {Date|string} date - The date to format
 * @returns {string} - Formatted date string with weekday, date, and time
 */
export const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-ZA", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

/**
 * Formats a date as a long date string without time
 *
 * @param {Date|string} dateInput - The date to format
 * @returns {string} - Formatted date string (e.g., "January 1, 2025")
 */
export const formatDateToLongString = (dateInput) => {
    const date = new Date(dateInput);
    return date.toLocaleDateString("en-ZA", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

/**
 * Sets a default image when an image fails to load
 *
 * @param {Event} event - The error event from the img element
 */
export const setDefaultImage = (event) => {
    event.target.src =
        "https://placehold.co/800x450?text=Laudium+POST+News";
};

/**
 * Returns the appropriate Bootstrap badge class for a given status
 *
 * @param {string|number} status - The status value
 * @returns {string} - CSS class for the badge
 */
export const getStatusBadgeClass = (status) => {
    switch (status) {
        case "published":
        case "active":
        case 1:
            return "badge bg-success";

        case "draft":
        case "pending":
        case 0:
            return "badge bg-info";

        case "archived":
        case "failed":
            return "badge bg-danger";

        case "scheduled":
            return "badge bg-warning";

        default:
            return "badge bg-secondary";
    }
    // const classes = {
    //   published: "badge bg-success",
    //   draft: "badge bg-info",
    //   scheduled: "badge bg-warning",
    //   archived: "badge bg-danger",
    // };

    // return classes[status] || "badge bg-secondary";
};

/**
 * Returns the appropriate Bootstrap badge class for an ad location
 *
 * @param {string} location - The ad location key
 * @returns {string} - CSS class for the badge
 */
export const getAdLocationBadgeClass = (location) => {
    const badgeMap = {
        home_banner: "badge bg-primary",
        in_article_top: "badge bg-success",
        in_article_mid: "badge bg-info",
        in_article_bottom: "badge bg-warning",
        sidebar: "badge bg-secondary",
    };

    return badgeMap[location] || "badge bg-dark";
};

/**
 * Formats an ad location key as a human-readable string
 *
 * @param {string} location - The ad location key (e.g., "home_banner")
 * @returns {string} - Formatted location (e.g., "Home Banner")
 */
export const formatAdLocation = (location) => {
    if (!location) return "";

    return location
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

/**
 * Creates a promise that resolves after the specified delay
 *
 * @param {number} ms - The delay in milliseconds
 * @returns {Promise} - Promise that resolves after the delay
 */
export const delay = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Processes an image for ad placement:
 * - Fits to the specified aspect ratio (default: crop/cover; optional: contain)
 * - Resizes to target width (optional)
 * - Compresses the image
 *
 * @param {File|string} imageInput - The image file or data URL to process
 * @param {string} aspectRatio - The target aspect ratio (e.g., "4:1", "16:9")
 * @param {Object} options - Processing options
 * @param {number} [options.targetWidth] - Target width in pixels (optional)
 * @param {number} [options.quality] - JPEG quality (0-1, default: 0.8)
 * @param {string} [options.format] - Output format ('jpeg', 'png', default: 'jpeg')
 * @param {string} [options.outputType] - Output type ('base64', 'blob', default: 'base64')
 * @param {string} [options.fit] - How to fit the image ('cover' crops, 'contain' pads), default: 'cover'
 * @param {string} [options.backgroundColor] - Background color for padding when fit='contain' (used for jpeg), default: '#ffffff'
 * @returns {Promise<string|Blob>} - Processed image as base64 string or Blob
 */
export const processImageForAd = async (
    imageInput,
    aspectRatio,
    options = {}
) => {
    // Default options
    const {
        targetWidth = null,
        quality = 0.8,
        format = "jpeg",
        outputType = "base64",
        fit = "cover",
        backgroundColor = "#ffffff",
    } = options;

    // Create a promise to handle image loading
    return new Promise(async (resolve, reject) => {
        try {
            // Create an image element to load the input
            const img = new Image();

            // Set up image load handler
            img.onload = () => {
                // Parse aspect ratio (e.g., "4:1" -> 4/1)
                const [widthRatio, heightRatio] = aspectRatio.split(":").map(Number);
                const targetAspectRatio = widthRatio / heightRatio;

                const imgAspectRatio = img.width / img.height;

                // Create canvas for processing
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Convert to desired format
                const mimeType = format === "png" ? "image/png" : "image/jpeg";

                // Fit the image into the target aspect ratio without cropping
                if (fit === "contain") {
                    let finalWidth;
                    let finalHeight;

                    // Apply target width if specified
                    if (targetWidth) {
                        finalWidth = targetWidth;
                        finalHeight = finalWidth / targetAspectRatio;
                    } else if (imgAspectRatio > targetAspectRatio) {
                        // Image is wider than target ratio - add vertical padding
                        finalWidth = img.width;
                        finalHeight = finalWidth / targetAspectRatio;
                    } else {
                        // Image is taller than target ratio - add horizontal padding
                        finalHeight = img.height;
                        finalWidth = finalHeight * targetAspectRatio;
                    }

                    canvas.width = Math.round(finalWidth);
                    canvas.height = Math.round(finalHeight);

                    // JPEG can't represent transparency; fill padded areas with a background color.
                    if (mimeType === "image/jpeg") {
                        ctx.fillStyle = backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    } else {
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }

                    // Scale the image to fit entirely inside the canvas (contain)
                    const scale = Math.min(
                        canvas.width / img.width,
                        canvas.height / img.height
                    );
                    const drawWidth = img.width * scale;
                    const drawHeight = img.height * scale;
                    const offsetX = (canvas.width - drawWidth) / 2;
                    const offsetY = (canvas.height - drawHeight) / 2;

                    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
                } else {
                    // Default behavior: crop/cover to fill the target aspect ratio
                    let cropWidth,
                        cropHeight,
                        offsetX = 0,
                        offsetY = 0;

                    if (imgAspectRatio > targetAspectRatio) {
                        // Image is wider than target ratio - crop width
                        cropHeight = img.height;
                        cropWidth = cropHeight * targetAspectRatio;
                        offsetX = (img.width - cropWidth) / 2;
                    } else {
                        // Image is taller than target ratio - crop height
                        cropWidth = img.width;
                        cropHeight = cropWidth / targetAspectRatio;
                        offsetY = (img.height - cropHeight) / 2;
                    }

                    // Calculate final dimensions
                    let finalWidth = cropWidth;
                    let finalHeight = cropHeight;

                    // Apply target width if specified
                    if (targetWidth) {
                        finalWidth = targetWidth;
                        finalHeight = finalWidth / targetAspectRatio;
                    }

                    canvas.width = Math.round(finalWidth);
                    canvas.height = Math.round(finalHeight);

                    // Draw cropped and resized image
                    ctx.drawImage(
                        img,
                        offsetX,
                        offsetY,
                        cropWidth,
                        cropHeight,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );
                }

                if (outputType === "blob") {
                    // Return as Blob
                    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
                } else {
                    // Return as base64 string
                    const dataUrl = canvas.toDataURL(mimeType, quality);
                    resolve(dataUrl);
                }
            };

            // Handle load errors
            img.onerror = () => reject(new Error("Failed to load image"));

            // Load the image
            if (typeof imageInput === "string" && imageInput.startsWith("data:")) {
                // Input is already a data URL
                img.src = imageInput;
            } else if (typeof imageInput === "string") {
                // Input is a URL
                img.crossOrigin = "anonymous";
                img.src = imageInput;
            } else {
                // Input is a File object
                const reader = new FileReader();
                reader.onload = (e) => {
                    img.src = e.target.result;
                };
                reader.onerror = () => reject(new Error("Failed to read file"));
                reader.readAsDataURL(imageInput);
            }
        } catch (error) {
            reject(error);
        }
    });
}
/*
* Detects if the current device is a mobile device
*
* @returns {boolean} - True if the device is mobile, false otherwise
*/
export const isMobileDevice = () => {
    // Check if window is defined (for SSR compatibility)
    if (typeof window === 'undefined') return false;

    // Use matchMedia to check if the viewport width is less than 768px
    return window.matchMedia('(max-width: 767px)').matches ||
        // Fallback to user agent detection if matchMedia is not available
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}
