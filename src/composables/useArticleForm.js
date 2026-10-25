// composables/useArticleForm.js
import { ref, computed } from 'vue';

export function useArticleForm() {
    // Initial form data structure
    const getInitialData = () => ({
        title: '',
        slug: '',
        summary: '',
        content: '',
        thumbnailUrl: '',
        coverImage: '',
        thumbnailImage: '',
        categoryId: '',
        articleType: 'featured',
        archived: false,
        status: 'published',
        scheduledFor: null,
        authorId: null,
        notify: false,
        tags: [],
        sourceId: null,
    });

    // Form state
    const article = ref(getInitialData());
    const validationErrors = ref({});

    // Validation rules
    const validationRules = {
        title: {
            required: true,
            minLength: 3,
            maxLength: 255
        },
        slug: {
            required: true,
            pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
            maxLength: 255
        },
        summary: {
            required: true,
            minLength: 10,
            maxLength: 500
        },
        content: {
            required: true,
            minLength: 50
        },
        categoryId: {
            required: false // Made optional based on commented code
        },
        scheduledFor: {
            requiredIf: (article) => article.status === 'scheduled',
            futureDate: true
        }
    };

    // Validate single field
    const validateField = (fieldName, value, article) => {
        const rules = validationRules[fieldName];
        if (!rules) return null;

        if (rules.required && !value?.trim()) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }

        if (rules.requiredIf && rules.requiredIf(article) && !value) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`;
        }

        if (rules.minLength && value?.length < rules.minLength) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must be at least ${rules.minLength} characters`;
        }

        if (rules.maxLength && value?.length > rules.maxLength) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} must not exceed ${rules.maxLength} characters`;
        }

        if (rules.pattern && !rules.pattern.test(value)) {
            return `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} format is invalid`;
        }

        if (rules.futureDate && value) {
            const date = new Date(value);
            if (date <= new Date()) {
                return 'Date must be in the future';
            }
        }

        return null;
    };

    // Validate entire form
    const validateForm = (coverImage = null) => {
        const errors = {};

        // Validate each field
        Object.keys(validationRules).forEach(fieldName => {
            const error = validateField(fieldName, article.value[fieldName], article.value);
            if (error) {
                errors[fieldName] = error;
            }
        });

        // Custom validation for cover image
        if (!coverImage) {
            errors.coverImage = 'Please include an image';
        }

        validationErrors.value = errors;
        return Object.keys(errors).length === 0;
    };

    // Generate slug from title
    const generateSlug = (title) => {
        if (!title) return '';

        return title
            .toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove special chars
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/-+/g, '-') // Remove consecutive dashes
            .trim()
            .substring(0, 255); // Respect DB limit
    };

    // Reset form to initial state
    const resetForm = () => {
        article.value = getInitialData();
        validationErrors.value = {};
    };

    // Set article data
    const setArticleData = (data) => {
        article.value = {
            ...getInitialData(),
            ...data
        };
    };

    // Process content with sources
    const processContentWithSources = (content, sources) => {
        if (!sources || sources.length === 0) {
            return content;
        }

        let processedContent = content || '';
        processedContent += '<hr>';
        processedContent += '<h3>Sources:</h3>';
        processedContent += '<ul>';
        sources.forEach(source => {
            processedContent += `<li>${source}</li>`;
        });
        processedContent += '</ul>';

        return processedContent;
    };

    // Prepare article for submission
    const prepareForSubmission = (coverBase64, thumbnailBase64) => {
        const data = {
            ...article.value,
            coverImage: coverBase64 || '',
            thumbnailImage: thumbnailBase64 || '',
            scheduledFor:
                article.value.status === 'draft'
                    ? null
                    : article.value.scheduledFor || new Date().toISOString(),
        };

        // Clean up unnecessary fields
        delete data.sourceId;

        return data;
    };

    return {
        article,
        validationErrors,
        validateForm,
        validateField,
        generateSlug,
        resetForm,
        setArticleData,
        processContentWithSources,
        prepareForSubmission,
        getInitialData
    };
}