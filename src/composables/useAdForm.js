// composables/useAdForm.js
import { ref } from 'vue';
import dayjs from 'dayjs';

export function useAdForm() {
    // Initial form data structure
    const getInitialFormData = () => ({
        title: '',
        businessId: '',
        description: '',
        campaignId: '',
        imageUrl: '',
        imageBase64: '',
        images: [],
        linkUrl: '',
        videoUrl: '', // Video URL for video ads (Pinterest-style autoplay)
        videoBase64: '', // Base64 encoded video for upload
        videoFile: null, // Video file object for preview
        placementId: '',
        startTime: '',
        endTime: '',
        enabled: true,
        tags: [],
        file: '',
        totalCost: 0,
        showPaymentInfo: false,
        paymentMethod: 'eft',
        paymentInfo: {
            amount: '',
            status: 'COMPLETE',
            reference: '',
        },
    });

    // State
    const form = ref(getInitialFormData());
    const selectedPlacement = ref(null);
    const isValidUrl = ref(true);
    const validationErrors = ref({});

    // Populate form from ad data
    const populateForm = (ad) => {
        if (!ad) {
            form.value = getInitialFormData();
            return;
        }

        form.value = {
            title: ad.title || '',
            businessId: ad.business?.id || ad.business_id || '',
            description: ad.description || '',
            // @ModifiedByJunie 2025-12-10 - Added campaignId to populateForm
            campaignId: ad.campaign?.id || ad.campaign_id || '',
            totalCost: ad.total_cost || 0,
            imageUrl: ad.image_url || '',
            linkUrl: ad.click_url || '',
            videoUrl: ad.video_url || '', // Video URL for video ads
            placementId: ad.placement_id || '',
            imageBase64: ad.image?.file || '',
            images: ad.images || (ad.image?.file ? [ad.image.file] : []),
            startTime: ad.placement_date ? dayjs(ad.placement_date).format('YYYY-MM-DD') : '',
            endTime: ad.expiry_date ? dayjs(ad.expiry_date).format('YYYY-MM-DD') : '',
            enabled: ad.status === 'active',
            tags: ad.tags?.map((tag) => tag.id) || [],
            showPaymentInfo: !!ad.payment_info,
            paymentMethod: ad.payment?.payment_method || 'eft',
            paymentInfo: {
                amount: ad.payment?.amount || '',
                status: ad.payment?.status || 'PENDING',
                reference: ad.payment?.eft_reference || ad.payment?.pf_payment_id || '',
            },
        };
    };

    // Format placement display text
    const formatPlacement = (placement) => {
        if (!placement) return '';

        const location = placement.name || placement.location?.replace(/_/g, ' ').toUpperCase() || '';
        const aspectRatio = placement.aspect_ratio ? `(${placement.aspect_ratio})` : '';
        const fee = placement.fee || 0;
        const billingUnit = placement.billing_unit || '';

        return `${location} ${aspectRatio} - R${fee}/${billingUnit}`;
    };

    // Calculate dates based on placement
    // For weekly placements: starts tomorrow, runs for exactly 7 days
    const calculateDates = (placement) => {
        if (!placement) return;

        selectedPlacement.value = placement;
        const tomorrow = dayjs().add(1, 'day');
        let endDate;

        switch (placement.billing_unit) {
            case 'MONTH':
                endDate = tomorrow.add(1, 'month').subtract(1, 'day');
                break;
            case 'WEEK':
                // 7 days total: tomorrow + 6 more days
                endDate = tomorrow.add(6, 'day');
                break;
            default:
                endDate = tomorrow;
        }

        form.value.startTime = tomorrow.format('YYYY-MM-DD');
        form.value.endTime = endDate.format('YYYY-MM-DD');
    };

    // Calculate end date from start date (enforces 7-day duration for weekly placements)
    const calculateEndDateFromStart = (startDate) => {
        if (!startDate || !selectedPlacement.value) return;

        const start = dayjs(startDate);
        if (!start.isValid()) return;

        let endDate;
        switch (selectedPlacement.value.billing_unit) {
            case 'MONTH':
                endDate = start.add(1, 'month').subtract(1, 'day');
                break;
            case 'WEEK':
                // Exactly 7 days: start + 6 more days
                endDate = start.add(6, 'day');
                break;
            default:
                endDate = start;
        }

        form.value.endTime = endDate.format('YYYY-MM-DD');
    };

    // Get minimum start date (tomorrow)
    const getMinStartDate = () => {
        return dayjs().add(1, 'day').format('YYYY-MM-DD');
    };

    // Calculate cost based on dates and placement
    const calculateCost = () => {
        const start = dayjs(form.value.startTime);
        const end = dayjs(form.value.endTime);
        const placement = selectedPlacement.value;

        if (!placement || !start.isValid() || !end.isValid()) {
            form.value.totalCost = 0;
            return;
        }

        const days = end.diff(start, 'day') + 1;

        if (placement.fee_type === 'FIXED') {
            const unit = placement.billing_unit;
            let multiplier = 1;

            if (unit === 'DAY') {
                multiplier = days;
            } else if (unit === 'WEEK') {
                multiplier = Math.ceil(days / 7);
            } else if (unit === 'MONTH') {
                multiplier = Math.ceil((days - 1) / 30);
            }

            form.value.totalCost = (Number(placement.fee || 0) * multiplier).toFixed(2);
        }
    };

    // Validate dates
    const validateDates = () => {
        const start = dayjs(form.value.startTime);
        const end = dayjs(form.value.endTime);
        const tomorrow = dayjs().add(1, 'day').startOf('day');

        if (!start.isValid() || !end.isValid()) {
            return 'Please enter valid dates.';
        }

        // Start date must be at least tomorrow
        if (start.startOf('day').isBefore(tomorrow)) {
            return 'Start date must be at least tomorrow.';
        }

        if (end.isBefore(start)) {
            return 'End date must be after start date.';
        }

        return null;
    };

    // Validate URL
    const validateUrl = (url) => {
        if (!url) {
            isValidUrl.value = true;
            return true;
        }

        try {
            new URL(url);
            isValidUrl.value = true;
            return true;
        } catch {
            isValidUrl.value = false;
            return false;
        }
    };

    // Auto-format URL
    const formatUrl = (url) => {
        if (!url) return '';
        if (!/^https?:\/\//i.test(url)) {
            return 'https://' + url;
        }
        return url;
    };

    // Validate entire form
    const validateForm = () => {
        const errors = {};

        if (!form.value.title?.trim()) {
            errors.title = 'Title is required';
        }

        if (!form.value.businessId) {
            errors.businessId = 'Business is required';
        }

        if (!form.value.description?.trim()) {
            errors.description = 'Description is required';
        }

        if (!form.value.placementId) {
            errors.placementId = 'Placement is required';
        }

        // @ModifiedByJunie 2025-12-10 - Added campaignId validation
        if (!form.value.campaignId) {
            errors.campaignId = 'Campaign is required';
        }

        // @ModifiedByJunie 2025-12-10 - Only 1 image OR 1 video (YouTube URL) allowed per ad (not both)
        const hasVideo = !!form.value.videoUrl;
        const hasImage = form.value.images.length > 0 || form.value.imageBase64;
        if (!hasImage && !hasVideo) {
            errors.media = 'Either one image or one YouTube video URL is required';
        }
        if (hasImage && hasVideo) {
            errors.media = 'Please provide either one image or one video, not both';
        }
        if (form.value.images.length > 1) {
            errors.media = 'Only one image is allowed per ad';
        }

        const dateError = validateDates();
        if (dateError) {
            errors.dates = dateError;
        }

        if (form.value.linkUrl && !validateUrl(form.value.linkUrl)) {
            errors.linkUrl = 'Please enter a valid URL';
        }

        validationErrors.value = errors;
        return Object.keys(errors).length === 0;
    };

    // Prepare payload for submission
    const preparePayload = (imageUpdated = false, isEdit = false) => {
        const data = form.value;

        // Handle images
        const base64 = !isEdit
            ? data.imageBase64
            : imageUpdated
                ? (data.imageBase64 ?? null)
                : null;

        const images = data.images && data.images.length > 0
            ? data.images
            : base64
                ? [base64]
                : [];

        return {
            business_id: data.businessId,
            placement_id: data.placementId,
            // @ModifiedByJunie 2025-12-10 - Added campaign_id to payload
            campaign_id: data.campaignId,
            title: data.title,
            description: data.description,
            total_cost: data.totalCost,
            placement_info: formatPlacement(selectedPlacement.value),
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl, // YouTube video URL for video ads
            /*Removed as it is not used anywhere including backend*/
            // type: selectedPlacement.value?.location,
            status: data.enabled ? 'active' : 'pending',
            clickUrl: data.linkUrl,
            placementDate: data.startTime ? new Date(data.startTime) : null,
            expiryDate: data.endTime ? new Date(data.endTime) : null,
            imageBase64: images[0] || null,
            images: images,
            tags: data.tags.filter(tag => !!tag),
            payment_method: data.paymentMethod,
            payment_info: {
                ...data.paymentInfo,
                paymentMethod: data.paymentMethod,
                customerName: data.customerName || '',
                customerEmail: data.customerEmail || '',
            },
        };
    };

    // Reset form
    const resetForm = () => {
        form.value = getInitialFormData();
        selectedPlacement.value = null;
        isValidUrl.value = true;
        validationErrors.value = {};
    };

    return {
        // State
        form,
        selectedPlacement,
        isValidUrl,
        validationErrors,

        // Methods
        populateForm,
        formatPlacement,
        calculateDates,
        calculateEndDateFromStart,
        getMinStartDate,
        calculateCost,
        validateDates,
        validateUrl,
        formatUrl,
        validateForm,
        preparePayload,
        resetForm,
        getInitialFormData,
    };
}