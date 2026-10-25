// composables/useAdForm.spec.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import dayjs from 'dayjs';
import { useAdForm } from '@/composables/useAdForm.js';

describe('useAdForm', () => {
    let api;

    beforeEach(() => {
        api = useAdForm();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getInitialFormData', () => {
        it('returns a fresh default form object each call', () => {
            const a = api.getInitialFormData();
            const b = api.getInitialFormData();

            expect(a).not.toBe(b);
            expect(a.images).not.toBe(b.images);
            expect(a).toEqual({
                title: '',
                businessId: '',
                description: '',
                campaignId: '',
                imageUrl: '',
                imageBase64: '',
                images: [],
                linkUrl: '',
                videoUrl: '',
                videoBase64: '',
                videoFile: null,
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
        });
    });

    describe('initial reactive state', () => {
        it('exposes default state', () => {
            expect(api.form.value).toEqual(api.getInitialFormData());
            expect(api.selectedPlacement.value).toBeNull();
            expect(api.isValidUrl.value).toBe(true);
            expect(api.validationErrors.value).toEqual({});
        });
    });

    describe('populateForm', () => {
        it('resets to initial data when ad is falsy', () => {
            // mutate first so we can prove a reset happened
            api.form.value.title = 'dirty';
            api.populateForm(null);
            expect(api.form.value).toEqual(api.getInitialFormData());
        });

        it('populates from a fully-specified ad (primary-side branches)', () => {
            const ad = {
                title: 'My Ad',
                business: { id: 'biz-1' },
                description: 'desc',
                campaign: { id: 'camp-1' },
                total_cost: 150,
                image_url: 'http://img',
                click_url: 'http://click',
                video_url: 'http://video',
                placement_id: 'place-1',
                image: { file: 'base64data' },
                images: ['a', 'b'],
                placement_date: '2026-01-01',
                expiry_date: '2026-01-08',
                status: 'active',
                tags: [{ id: 't1' }, { id: 't2' }],
                payment_info: { something: true },
                payment: {
                    payment_method: 'card',
                    amount: 99,
                    status: 'COMPLETE',
                    eft_reference: 'EFT123',
                },
            };

            api.populateForm(ad);

            expect(api.form.value.title).toBe('My Ad');
            expect(api.form.value.businessId).toBe('biz-1');
            expect(api.form.value.description).toBe('desc');
            expect(api.form.value.campaignId).toBe('camp-1');
            expect(api.form.value.totalCost).toBe(150);
            expect(api.form.value.imageUrl).toBe('http://img');
            expect(api.form.value.linkUrl).toBe('http://click');
            expect(api.form.value.videoUrl).toBe('http://video');
            expect(api.form.value.placementId).toBe('place-1');
            expect(api.form.value.imageBase64).toBe('base64data');
            expect(api.form.value.images).toEqual(['a', 'b']);
            expect(api.form.value.startTime).toBe('2026-01-01');
            expect(api.form.value.endTime).toBe('2026-01-08');
            expect(api.form.value.enabled).toBe(true);
            expect(api.form.value.tags).toEqual(['t1', 't2']);
            expect(api.form.value.showPaymentInfo).toBe(true);
            expect(api.form.value.paymentMethod).toBe('card');
            expect(api.form.value.paymentInfo).toEqual({
                amount: 99,
                status: 'COMPLETE',
                reference: 'EFT123',
            });
        });

        it('falls back to *_id fields and image.file as the single image (secondary branches)', () => {
            const ad = {
                // title omitted -> ''
                business_id: 'biz-2',
                // description omitted -> ''
                campaign_id: 'camp-2',
                // total_cost omitted -> 0
                image: { file: 'imgfile' },
                // images omitted -> derived from image.file
                // placement_date / expiry_date omitted -> ''
                status: 'pending', // -> enabled false
                // tags omitted -> []
                // payment_info omitted -> showPaymentInfo false
                payment: {
                    // payment_method omitted -> 'eft'
                    // amount omitted -> ''
                    // status omitted -> 'PENDING'
                    pf_payment_id: 'PF999', // eft_reference falsy -> use pf_payment_id
                },
            };

            api.populateForm(ad);

            expect(api.form.value.title).toBe('');
            expect(api.form.value.businessId).toBe('biz-2');
            expect(api.form.value.description).toBe('');
            expect(api.form.value.campaignId).toBe('camp-2');
            expect(api.form.value.totalCost).toBe(0);
            expect(api.form.value.imageUrl).toBe('');
            expect(api.form.value.linkUrl).toBe('');
            expect(api.form.value.videoUrl).toBe('');
            expect(api.form.value.placementId).toBe('');
            expect(api.form.value.imageBase64).toBe('imgfile');
            expect(api.form.value.images).toEqual(['imgfile']);
            expect(api.form.value.startTime).toBe('');
            expect(api.form.value.endTime).toBe('');
            expect(api.form.value.enabled).toBe(false);
            expect(api.form.value.tags).toEqual([]);
            expect(api.form.value.showPaymentInfo).toBe(false);
            expect(api.form.value.paymentMethod).toBe('eft');
            expect(api.form.value.paymentInfo).toEqual({
                amount: '',
                status: 'PENDING',
                reference: 'PF999',
            });
        });

        it('handles an empty ad object (deepest fallbacks: no image, no payment)', () => {
            api.populateForm({});

            expect(api.form.value.imageBase64).toBe('');
            // ad.image?.file is undefined -> images []
            expect(api.form.value.images).toEqual([]);
            // ad.tags?.map undefined -> []
            expect(api.form.value.tags).toEqual([]);
            // ad.payment?.* undefined -> defaults
            expect(api.form.value.paymentMethod).toBe('eft');
            expect(api.form.value.paymentInfo).toEqual({
                amount: '',
                status: 'PENDING',
                reference: '',
            });
            expect(api.form.value.enabled).toBe(false);
        });
    });

    describe('formatPlacement', () => {
        it('returns empty string when placement is falsy', () => {
            expect(api.formatPlacement(null)).toBe('');
        });

        it('uses name and includes aspect ratio when present', () => {
            const result = api.formatPlacement({
                name: 'Home Banner',
                aspect_ratio: '16:9',
                fee: 100,
                billing_unit: 'WEEK',
            });
            expect(result).toBe('Home Banner (16:9) - R100/WEEK');
        });

        it('derives location from location field when name missing and omits aspect ratio/fee/unit', () => {
            const result = api.formatPlacement({
                // name missing
                location: 'top_banner',
                // aspect_ratio missing -> ''
                // fee missing -> 0
                // billing_unit missing -> ''
            });
            expect(result).toBe('TOP BANNER  - R0/');
        });

        it('falls back to empty location when both name and location are missing', () => {
            const result = api.formatPlacement({
                fee: 50,
                billing_unit: 'DAY',
            });
            // location resolves to '' (the final || ''), aspect_ratio missing -> ''
            expect(result).toBe('  - R50/DAY');
        });
    });

    describe('calculateDates', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-10T00:00:00.000Z'));
        });

        it('does nothing when placement is falsy', () => {
            api.calculateDates(null);
            expect(api.selectedPlacement.value).toBeNull();
            expect(api.form.value.startTime).toBe('');
            expect(api.form.value.endTime).toBe('');
        });

        it('MONTH: end is one month minus a day from tomorrow', () => {
            api.calculateDates({ billing_unit: 'MONTH' });
            const tomorrow = dayjs().add(1, 'day');
            expect(api.selectedPlacement.value).toEqual({ billing_unit: 'MONTH' });
            expect(api.form.value.startTime).toBe(tomorrow.format('YYYY-MM-DD'));
            expect(api.form.value.endTime).toBe(
                tomorrow.add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD')
            );
        });

        it('WEEK: end is six days after tomorrow', () => {
            api.calculateDates({ billing_unit: 'WEEK' });
            const tomorrow = dayjs().add(1, 'day');
            expect(api.form.value.endTime).toBe(tomorrow.add(6, 'day').format('YYYY-MM-DD'));
        });

        it('default unit: end equals tomorrow', () => {
            api.calculateDates({ billing_unit: 'DAY' });
            const tomorrow = dayjs().add(1, 'day');
            expect(api.form.value.startTime).toBe(tomorrow.format('YYYY-MM-DD'));
            expect(api.form.value.endTime).toBe(tomorrow.format('YYYY-MM-DD'));
        });
    });

    describe('calculateEndDateFromStart', () => {
        it('does nothing when startDate is falsy', () => {
            api.selectedPlacement.value = { billing_unit: 'WEEK' };
            api.form.value.endTime = 'unchanged';
            api.calculateEndDateFromStart('');
            expect(api.form.value.endTime).toBe('unchanged');
        });

        it('does nothing when no placement is selected', () => {
            api.selectedPlacement.value = null;
            api.form.value.endTime = 'unchanged';
            api.calculateEndDateFromStart('2026-06-10');
            expect(api.form.value.endTime).toBe('unchanged');
        });

        it('does nothing when the start date is invalid', () => {
            api.selectedPlacement.value = { billing_unit: 'WEEK' };
            api.form.value.endTime = 'unchanged';
            api.calculateEndDateFromStart('not-a-date');
            expect(api.form.value.endTime).toBe('unchanged');
        });

        it('MONTH: end is one month minus a day from start', () => {
            api.selectedPlacement.value = { billing_unit: 'MONTH' };
            api.calculateEndDateFromStart('2026-06-10');
            expect(api.form.value.endTime).toBe(
                dayjs('2026-06-10').add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD')
            );
        });

        it('WEEK: end is six days after start', () => {
            api.selectedPlacement.value = { billing_unit: 'WEEK' };
            api.calculateEndDateFromStart('2026-06-10');
            expect(api.form.value.endTime).toBe(
                dayjs('2026-06-10').add(6, 'day').format('YYYY-MM-DD')
            );
        });

        it('default unit: end equals start', () => {
            api.selectedPlacement.value = { billing_unit: 'DAY' };
            api.calculateEndDateFromStart('2026-06-10');
            expect(api.form.value.endTime).toBe(
                dayjs('2026-06-10').format('YYYY-MM-DD')
            );
        });
    });

    describe('getMinStartDate', () => {
        it('returns tomorrow formatted', () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-10T00:00:00.000Z'));
            expect(api.getMinStartDate()).toBe(dayjs().add(1, 'day').format('YYYY-MM-DD'));
        });
    });

    describe('calculateCost', () => {
        it('sets cost to 0 when no placement selected', () => {
            api.selectedPlacement.value = null;
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-06-12';
            api.calculateCost();
            expect(api.form.value.totalCost).toBe(0);
        });

        it('sets cost to 0 when start date is invalid', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'DAY', fee: 10 };
            api.form.value.startTime = 'bad';
            api.form.value.endTime = '2026-06-12';
            api.calculateCost();
            expect(api.form.value.totalCost).toBe(0);
        });

        it('sets cost to 0 when end date is invalid', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'DAY', fee: 10 };
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = 'bad';
            api.calculateCost();
            expect(api.form.value.totalCost).toBe(0);
        });

        it('does not change cost when fee_type is not FIXED', () => {
            api.selectedPlacement.value = { fee_type: 'VARIABLE', billing_unit: 'DAY', fee: 10 };
            api.form.value.totalCost = 'sentinel';
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-06-12';
            api.calculateCost();
            // The if (FIXED) block is skipped, totalCost untouched
            expect(api.form.value.totalCost).toBe('sentinel');
        });

        it('FIXED + DAY: multiplier is the number of days', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'DAY', fee: 10 };
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-06-12'; // 3 days inclusive
            api.calculateCost();
            expect(api.form.value.totalCost).toBe('30.00');
        });

        it('FIXED + WEEK: multiplier is ceil(days/7)', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'WEEK', fee: 20 };
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-06-18'; // 9 days -> ceil(9/7)=2
            api.calculateCost();
            expect(api.form.value.totalCost).toBe('40.00');
        });

        it('FIXED + MONTH: multiplier is ceil((days-1)/30)', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'MONTH', fee: 100 };
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-07-10'; // 31 days -> ceil(30/30)=1
            api.calculateCost();
            expect(api.form.value.totalCost).toBe('100.00');
        });

        it('FIXED with unknown billing unit keeps multiplier 1 and defaults fee to 0', () => {
            api.selectedPlacement.value = { fee_type: 'FIXED', billing_unit: 'YEAR' };
            api.form.value.startTime = '2026-06-10';
            api.form.value.endTime = '2026-06-20';
            api.calculateCost();
            // fee falsy -> Number(0) * 1
            expect(api.form.value.totalCost).toBe('0.00');
        });
    });

    describe('validateDates', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
        });

        it('errors when start date is invalid', () => {
            api.form.value.startTime = 'bad';
            api.form.value.endTime = '2026-06-12';
            expect(api.validateDates()).toBe('Please enter valid dates.');
        });

        it('errors when end date is invalid', () => {
            api.form.value.startTime = '2026-06-12';
            api.form.value.endTime = 'bad';
            expect(api.validateDates()).toBe('Please enter valid dates.');
        });

        it('errors when start date is before tomorrow', () => {
            api.form.value.startTime = '2026-06-10'; // today, before tomorrow
            api.form.value.endTime = '2026-06-15';
            expect(api.validateDates()).toBe('Start date must be at least tomorrow.');
        });

        it('errors when end date is before start date', () => {
            api.form.value.startTime = '2026-06-15';
            api.form.value.endTime = '2026-06-12';
            expect(api.validateDates()).toBe('End date must be after start date.');
        });

        it('returns null for a valid range', () => {
            api.form.value.startTime = '2026-06-11'; // tomorrow
            api.form.value.endTime = '2026-06-15';
            expect(api.validateDates()).toBeNull();
        });
    });

    describe('validateUrl', () => {
        it('treats empty url as valid', () => {
            api.isValidUrl.value = false;
            expect(api.validateUrl('')).toBe(true);
            expect(api.isValidUrl.value).toBe(true);
        });

        it('accepts a well-formed url', () => {
            api.isValidUrl.value = false;
            expect(api.validateUrl('https://example.com')).toBe(true);
            expect(api.isValidUrl.value).toBe(true);
        });

        it('rejects a malformed url and flips isValidUrl', () => {
            api.isValidUrl.value = true;
            expect(api.validateUrl('not a url')).toBe(false);
            expect(api.isValidUrl.value).toBe(false);
        });
    });

    describe('formatUrl', () => {
        it('returns empty string for falsy url', () => {
            expect(api.formatUrl('')).toBe('');
        });

        it('prepends https:// when scheme is missing', () => {
            expect(api.formatUrl('example.com')).toBe('https://example.com');
        });

        it('leaves a url with an http(s) scheme untouched', () => {
            expect(api.formatUrl('http://example.com')).toBe('http://example.com');
            expect(api.formatUrl('https://example.com')).toBe('https://example.com');
        });
    });

    describe('validateForm', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
        });

        const fillValidForm = () => {
            api.form.value.title = 'A title';
            api.form.value.businessId = 'biz';
            api.form.value.description = 'A description';
            api.form.value.placementId = 'place';
            api.form.value.campaignId = 'camp';
            api.form.value.images = ['img'];
            api.form.value.imageBase64 = '';
            api.form.value.videoUrl = '';
            api.form.value.startTime = '2026-06-11';
            api.form.value.endTime = '2026-06-15';
            api.form.value.linkUrl = '';
        };

        it('passes for a fully valid image-based form', () => {
            fillValidForm();
            expect(api.validateForm()).toBe(true);
            expect(api.validationErrors.value).toEqual({});
        });

        it('passes for a fully valid video-based form (no image)', () => {
            fillValidForm();
            api.form.value.images = [];
            api.form.value.imageBase64 = '';
            api.form.value.videoUrl = 'https://youtu.be/xyz';
            expect(api.validateForm()).toBe(true);
            expect(api.validationErrors.value).toEqual({});
        });

        it('collects required-field errors when everything is empty', () => {
            // default form: title '', businessId '', etc., no media, dates invalid
            api.form.value = api.getInitialFormData();
            expect(api.validateForm()).toBe(false);
            const errs = api.validationErrors.value;
            expect(errs.title).toBe('Title is required');
            expect(errs.businessId).toBe('Business is required');
            expect(errs.description).toBe('Description is required');
            expect(errs.placementId).toBe('Placement is required');
            expect(errs.campaignId).toBe('Campaign is required');
            expect(errs.media).toBe('Either one image or one YouTube video URL is required');
            expect(errs.dates).toBe('Please enter valid dates.');
        });

        it('treats whitespace-only title and description as missing', () => {
            fillValidForm();
            api.form.value.title = '   ';
            api.form.value.description = '   ';
            expect(api.validateForm()).toBe(false);
            expect(api.validationErrors.value.title).toBe('Title is required');
            expect(api.validationErrors.value.description).toBe('Description is required');
        });

        it('handles null title/description via optional chaining', () => {
            fillValidForm();
            api.form.value.title = null;
            api.form.value.description = null;
            expect(api.validateForm()).toBe(false);
            expect(api.validationErrors.value.title).toBe('Title is required');
            expect(api.validationErrors.value.description).toBe('Description is required');
        });

        it('errors when both image and video are provided', () => {
            fillValidForm();
            api.form.value.images = ['img'];
            api.form.value.videoUrl = 'https://youtu.be/xyz';
            expect(api.validateForm()).toBe(false);
            expect(api.validationErrors.value.media).toBe(
                'Please provide either one image or one video, not both'
            );
        });

        it('uses imageBase64 to satisfy the image requirement', () => {
            fillValidForm();
            api.form.value.images = [];
            api.form.value.imageBase64 = 'base64';
            api.form.value.videoUrl = '';
            expect(api.validateForm()).toBe(true);
            expect(api.validationErrors.value.media).toBeUndefined();
        });

        it('errors when more than one image is supplied', () => {
            fillValidForm();
            api.form.value.images = ['a', 'b'];
            expect(api.validateForm()).toBe(false);
            expect(api.validationErrors.value.media).toBe('Only one image is allowed per ad');
        });

        it('errors when linkUrl is present but invalid', () => {
            fillValidForm();
            api.form.value.linkUrl = 'not a url';
            expect(api.validateForm()).toBe(false);
            expect(api.validationErrors.value.linkUrl).toBe('Please enter a valid URL');
        });

        it('accepts a valid linkUrl', () => {
            fillValidForm();
            api.form.value.linkUrl = 'https://example.com';
            expect(api.validateForm()).toBe(true);
            expect(api.validationErrors.value.linkUrl).toBeUndefined();
        });
    });

    describe('preparePayload', () => {
        const baseForm = (overrides = {}) => ({
            ...api.getInitialFormData(),
            businessId: 'biz',
            placementId: 'place',
            campaignId: 'camp',
            title: 'T',
            description: 'D',
            totalCost: 50,
            imageUrl: 'http://img',
            videoUrl: 'http://video',
            enabled: true,
            linkUrl: 'http://link',
            startTime: '2026-06-11',
            endTime: '2026-06-15',
            tags: ['t1', '', 't2', null],
            paymentMethod: 'eft',
            paymentInfo: { amount: 10, status: 'COMPLETE', reference: 'R1' },
            ...overrides,
        });

        it('default args (no edit): uses imageBase64, status active, real dates', () => {
            api.form.value = baseForm({ imageBase64: 'b64', images: [] });
            api.selectedPlacement.value = { name: 'P', fee: 5, billing_unit: 'WEEK' };

            const payload = api.preparePayload();

            expect(payload.business_id).toBe('biz');
            expect(payload.placement_id).toBe('place');
            expect(payload.campaign_id).toBe('camp');
            expect(payload.title).toBe('T');
            expect(payload.description).toBe('D');
            expect(payload.total_cost).toBe(50);
            expect(payload.placement_info).toBe('P  - R5/WEEK');
            expect(payload.imageUrl).toBe('http://img');
            expect(payload.videoUrl).toBe('http://video');
            expect(payload.status).toBe('active');
            expect(payload.clickUrl).toBe('http://link');
            expect(payload.placementDate).toEqual(new Date('2026-06-11'));
            expect(payload.expiryDate).toEqual(new Date('2026-06-15'));
            expect(payload.imageBase64).toBe('b64');
            expect(payload.images).toEqual(['b64']);
            expect(payload.tags).toEqual(['t1', 't2']);
            expect(payload.payment_method).toBe('eft');
            expect(payload.payment_info).toEqual({
                amount: 10,
                status: 'COMPLETE',
                reference: 'R1',
                paymentMethod: 'eft',
                customerName: '',
                customerEmail: '',
            });
        });

        it('uses existing images array when present, ignoring base64 fallback', () => {
            api.form.value = baseForm({ images: ['existing'], imageBase64: 'b64' });
            api.selectedPlacement.value = null;
            const payload = api.preparePayload();
            // formatPlacement(null) -> ''
            expect(payload.placement_info).toBe('');
            expect(payload.images).toEqual(['existing']);
            expect(payload.imageBase64).toBe('existing');
        });

        it('produces empty images and null imageBase64 when no media at all', () => {
            api.form.value = baseForm({ images: [], imageBase64: '' });
            const payload = api.preparePayload();
            expect(payload.images).toEqual([]);
            expect(payload.imageBase64).toBeNull();
        });

        it('status pending and null dates when disabled and dates empty', () => {
            api.form.value = baseForm({
                enabled: false,
                startTime: '',
                endTime: '',
                images: [],
                imageBase64: '',
            });
            const payload = api.preparePayload();
            expect(payload.status).toBe('pending');
            expect(payload.placementDate).toBeNull();
            expect(payload.expiryDate).toBeNull();
        });

        it('edit mode with imageUpdated true: keeps imageBase64', () => {
            api.form.value = baseForm({ imageBase64: 'newb64', images: [] });
            const payload = api.preparePayload(true, true);
            expect(payload.images).toEqual(['newb64']);
            expect(payload.imageBase64).toBe('newb64');
        });

        it('edit mode with imageUpdated true but null imageBase64: nullish coalesces to null', () => {
            // data.imageBase64 ?? null -> null when undefined
            api.form.value = baseForm({ imageBase64: undefined, images: [] });
            const payload = api.preparePayload(true, true);
            expect(payload.images).toEqual([]);
            expect(payload.imageBase64).toBeNull();
        });

        it('edit mode with imageUpdated false: base64 forced to null', () => {
            api.form.value = baseForm({ imageBase64: 'ignored', images: [] });
            const payload = api.preparePayload(false, true);
            expect(payload.images).toEqual([]);
            expect(payload.imageBase64).toBeNull();
        });

        it('includes customerName/customerEmail when present on the form', () => {
            api.form.value = baseForm({
                images: ['x'],
                customerName: 'Jane',
                customerEmail: 'jane@example.com',
            });
            const payload = api.preparePayload();
            expect(payload.payment_info.customerName).toBe('Jane');
            expect(payload.payment_info.customerEmail).toBe('jane@example.com');
        });
    });

    describe('resetForm', () => {
        it('restores all reactive state to defaults', () => {
            api.form.value.title = 'dirty';
            api.selectedPlacement.value = { billing_unit: 'WEEK' };
            api.isValidUrl.value = false;
            api.validationErrors.value = { title: 'err' };

            api.resetForm();

            expect(api.form.value).toEqual(api.getInitialFormData());
            expect(api.selectedPlacement.value).toBeNull();
            expect(api.isValidUrl.value).toBe(true);
            expect(api.validationErrors.value).toEqual({});
        });
    });
});
