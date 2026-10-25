// composables/useImageHandling.spec.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- Mock external boundaries the source imports ----
vi.mock('@/features/articles/ArticlesService', () => ({
    generateArticleThumbnail: vi.fn(),
    getPrompts: vi.fn(),
}));

vi.mock('sweetalert2', () => ({
    default: { fire: vi.fn() },
}));

import { useImageHandling } from '@/composables/useImageHandling';
import { generateArticleThumbnail, getPrompts } from '@/features/articles/ArticlesService';
import Swal from 'sweetalert2';

// ---------------------------------------------------------------------------
// Controllable fake Image. Each instance records itself so the test can drive
// onload / onerror deterministically, and can simulate different dimensions.
// ---------------------------------------------------------------------------
let imageInstances = [];
class FakeImage {
    constructor() {
        this._src = '';
        this.onload = null;
        this.onerror = null;
        this.width = 0;
        this.height = 0;
        imageInstances.push(this);
    }
    set src(v) {
        this._src = v;
    }
    get src() {
        return this._src;
    }
}

// ---------------------------------------------------------------------------
// Controllable fake FileReader.
// ---------------------------------------------------------------------------
let readerInstances = [];
class FakeFileReader {
    constructor() {
        this.onload = null;
        this.onerror = null;
        this.result = null;
        this.readAsDataURL = vi.fn();
        readerInstances.push(this);
    }
}

beforeEach(() => {
    vi.clearAllMocks();
    imageInstances = [];
    readerInstances = [];
    global.Image = FakeImage;
    global.FileReader = FakeFileReader;
    vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Helper: stub document.createElement('canvas') to return a controllable canvas.
function stubCanvas({ ctx = {}, toDataURL = () => 'data:image/jpeg;base64,THUMB' } = {}) {
    const canvas = {
        width: 0,
        height: 0,
        getContext: vi.fn(() => ctx),
        toDataURL: vi.fn(toDataURL),
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
        if (tag === 'canvas') return canvas;
        // Fall back for any other element (none expected in these tests).
        return {};
    });
    return canvas;
}

describe('useImageHandling', () => {
    it('initialises reactive state', () => {
        const { coverBase64, thumbnailBase64, isGeneratingThumbnail } = useImageHandling();
        expect(coverBase64.value).toBe('');
        expect(thumbnailBase64.value).toBe('');
        expect(isGeneratingThumbnail.value).toBe(false);
    });

    // -----------------------------------------------------------------------
    // generateThumbnailFromImage
    // -----------------------------------------------------------------------
    describe('generateThumbnailFromImage', () => {
        it('resolves with a jpeg data URL when width > height and width > maxWidth', async () => {
            const ctx = { drawImage: vi.fn() };
            const canvas = stubCanvas({ ctx });
            const { generateThumbnailFromImage } = useImageHandling();

            const promise = generateThumbnailFromImage('data:image/png;base64,AAA');
            const img = imageInstances[0];
            img.width = 400;
            img.height = 100; // width > height, width > maxWidth(200)
            img.onload();

            await expect(promise).resolves.toBe('data:image/jpeg;base64,THUMB');
            // width scaled to 200, height scaled proportionally: 100 * (200/400) = 50
            expect(canvas.width).toBe(200);
            expect(canvas.height).toBe(50);
            expect(ctx.drawImage).toHaveBeenCalledWith(img, 0, 0, 200, 50);
            expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
        });

        it('keeps dimensions when width > height but width <= maxWidth', async () => {
            const ctx = { drawImage: vi.fn() };
            const canvas = stubCanvas({ ctx });
            const { generateThumbnailFromImage } = useImageHandling();

            const promise = generateThumbnailFromImage('x');
            const img = imageInstances[0];
            img.width = 150;
            img.height = 100; // width > height, width <= maxWidth -> no scaling
            img.onload();

            await promise;
            expect(canvas.width).toBe(150);
            expect(canvas.height).toBe(100);
        });

        it('scales by height when height >= width and height > maxHeight', async () => {
            const ctx = { drawImage: vi.fn() };
            const canvas = stubCanvas({ ctx });
            const { generateThumbnailFromImage } = useImageHandling();

            const promise = generateThumbnailFromImage('x');
            const img = imageInstances[0];
            img.width = 100;
            img.height = 400; // else-branch, height > maxHeight(200)
            img.onload();

            await promise;
            // height scaled to 200, width scaled: 100 * (200/400) = 50
            expect(canvas.width).toBe(50);
            expect(canvas.height).toBe(200);
        });

        it('keeps dimensions when height >= width but height <= maxHeight', async () => {
            const ctx = { drawImage: vi.fn() };
            const canvas = stubCanvas({ ctx });
            const { generateThumbnailFromImage } = useImageHandling();

            const promise = generateThumbnailFromImage('x');
            const img = imageInstances[0];
            img.width = 100;
            img.height = 150; // else-branch, height <= maxHeight -> no scaling
            img.onload();

            await promise;
            expect(canvas.width).toBe(100);
            expect(canvas.height).toBe(150);
        });

        it('rejects when canvas processing throws (catch path)', async () => {
            const boom = new Error('ctx boom');
            // getContext returns ctx whose drawImage throws.
            stubCanvas({ ctx: { drawImage: () => { throw boom; } } });
            const { generateThumbnailFromImage } = useImageHandling();

            const promise = generateThumbnailFromImage('x');
            const img = imageInstances[0];
            img.width = 100;
            img.height = 100;
            img.onload();

            await expect(promise).rejects.toBe(boom);
        });

        it('rejects when the image fails to load (onerror path)', async () => {
            const { generateThumbnailFromImage } = useImageHandling();
            const promise = generateThumbnailFromImage('bad');
            const img = imageInstances[0];
            img.onerror();
            await expect(promise).rejects.toThrow('Failed to load image');
        });
    });

    // -----------------------------------------------------------------------
    // handleImageUpload
    // -----------------------------------------------------------------------
    describe('handleImageUpload', () => {
        it('returns false when no file is provided', async () => {
            const { handleImageUpload } = useImageHandling();
            await expect(handleImageUpload(undefined)).resolves.toBe(false);
            expect(Swal.fire).not.toHaveBeenCalled();
        });

        it('rejects invalid file types with a Swal alert', async () => {
            const { handleImageUpload } = useImageHandling();
            const result = await handleImageUpload({ type: 'application/pdf', size: 1 });
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Invalid File Type', icon: 'error' })
            );
        });

        it('rejects oversized files with a Swal alert', async () => {
            const { handleImageUpload } = useImageHandling();
            const result = await handleImageUpload({
                type: 'image/png',
                size: 10 * 1024 * 1024 + 1,
            });
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'File Too Large', icon: 'error' })
            );
        });

        it('resolves true and sets cover + thumbnail on successful read', async () => {
            const ctx = { drawImage: vi.fn() };
            stubCanvas({ ctx });
            const { handleImageUpload, coverBase64, thumbnailBase64 } = useImageHandling();

            const promise = handleImageUpload({ type: 'image/jpeg', size: 100 });
            const reader = readerInstances[0];
            expect(reader.readAsDataURL).toHaveBeenCalled();
            reader.result = 'data:image/jpeg;base64,COVER';

            // reader.onload is async; trigger it then drive the inner Image.
            const loadDone = reader.onload();
            const img = imageInstances[0];
            img.width = 100;
            img.height = 100;
            img.onload();
            await loadDone;

            await expect(promise).resolves.toBe(true);
            expect(coverBase64.value).toBe('data:image/jpeg;base64,COVER');
            expect(thumbnailBase64.value).toBe('data:image/jpeg;base64,THUMB');
        });

        it('rejects and alerts when thumbnail generation throws inside onload (catch path)', async () => {
            const { handleImageUpload } = useImageHandling();
            const promise = handleImageUpload({ type: 'image/png', size: 100 });
            const reader = readerInstances[0];
            reader.result = 'data:image/png;base64,COVER';

            const loadDone = reader.onload();
            // Make the inner image fail to load so generateThumbnailFromImage rejects.
            const img = imageInstances[0];
            img.onerror();

            // The async onload handler swallows the error (try/catch) and rejects the
            // OUTER promise; the handler itself resolves to undefined.
            await expect(loadDone).resolves.toBeUndefined();
            await expect(promise).rejects.toThrow('Failed to load image');
            expect(console.error).toHaveBeenCalledWith(
                'Error processing image:',
                expect.any(Error)
            );
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Error', icon: 'error' })
            );
        });

        it('rejects and alerts when the reader errors (onerror path)', async () => {
            const { handleImageUpload } = useImageHandling();
            const promise = handleImageUpload({ type: 'image/webp', size: 100 });
            const reader = readerInstances[0];
            reader.onerror();

            await expect(promise).rejects.toThrow('Failed to read file');
            expect(console.error).toHaveBeenCalledWith('Error reading file');
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Error', icon: 'error' })
            );
        });
    });

    // -----------------------------------------------------------------------
    // generateAIThumbnail
    // -----------------------------------------------------------------------
    describe('generateAIThumbnail', () => {
        it('returns false when title is missing', async () => {
            const { generateAIThumbnail } = useImageHandling();
            const result = await generateAIThumbnail('', 'summary', 'top');
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Missing Information', icon: 'warning' })
            );
            expect(getPrompts).not.toHaveBeenCalled();
        });

        it('returns false when articleType is missing', async () => {
            const { generateAIThumbnail } = useImageHandling();
            const result = await generateAIThumbnail('Title', 'summary', '');
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Missing Information' })
            );
        });

        it('fetches prompts, uses the active thumbnail prompt, and generates (full success)', async () => {
            const ctx = { drawImage: vi.fn() };
            stubCanvas({ ctx });
            getPrompts.mockResolvedValue({
                status: 200,
                data: [
                    { active: false, type: 'thumbnail', content: 'IGNORED inactive' },
                    { active: true, type: 'other', content: 'IGNORED wrong type' },
                    { active: true, type: 'thumbnail', content: 'Make {{topic}} :: {{summary}}' },
                ],
            });
            generateArticleThumbnail.mockResolvedValue({ data: 'IMGDATA' });

            const { generateAIThumbnail, coverBase64, thumbnailBase64, isGeneratingThumbnail } =
                useImageHandling();

            const promise = generateAIThumbnail('MyTitle', 'MySummary', 'top');
            // drive the inner thumbnail Image once the cover is set.
            // We must wait a microtask for getPrompts/generateArticleThumbnail to settle.
            await flushUntilImage();
            const img = imageInstances[0];
            img.width = 100;
            img.height = 100;
            img.onload();

            await expect(promise).resolves.toBe(true);
            expect(generateArticleThumbnail).toHaveBeenCalledWith('Make MyTitle :: MySummary');
            expect(coverBase64.value).toBe('data:image/png;base64,IMGDATA');
            expect(thumbnailBase64.value).toBe('data:image/jpeg;base64,THUMB');
            expect(isGeneratingThumbnail.value).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Success!', icon: 'success' })
            );
        });

        it('falls back to default prompt when no active thumbnail prompt and handles missing summary', async () => {
            const ctx = { drawImage: vi.fn() };
            stubCanvas({ ctx });
            getPrompts.mockResolvedValue({ status: 200, data: [] }); // find -> undefined
            generateArticleThumbnail.mockResolvedValue({ data: 'IMG2' });

            const { generateAIThumbnail } = useImageHandling();
            const promise = generateAIThumbnail('OnlyTitle', undefined, 'featured');
            await flushUntilImage();
            const img = imageInstances[0];
            img.width = 50;
            img.height = 50;
            img.onload();

            await expect(promise).resolves.toBe(true);
            // default template: "...title: {{topic}} and summary: {{summary}}" with empty summary
            expect(generateArticleThumbnail).toHaveBeenCalledWith(
                'Generate image based on the title: OnlyTitle and summary: '
            );
        });

        it('caches prompts across calls (second call skips getPrompts)', async () => {
            const ctx = { drawImage: vi.fn() };
            stubCanvas({ ctx });
            getPrompts.mockResolvedValue({
                status: 200,
                data: [{ active: true, type: 'thumbnail', content: '{{topic}}|{{summary}}' }],
            });
            generateArticleThumbnail.mockResolvedValue({ data: 'IMG' });

            const { generateAIThumbnail } = useImageHandling();

            const p1 = generateAIThumbnail('T1', 'S1', 'popular');
            await flushUntilImage();
            imageInstances[imageInstances.length - 1].onload();
            await p1;

            const p2 = generateAIThumbnail('T2', 'S2', 'popular');
            await flushUntilImage();
            imageInstances[imageInstances.length - 1].onload();
            await p2;

            expect(getPrompts).toHaveBeenCalledTimes(1);
            expect(generateArticleThumbnail).toHaveBeenLastCalledWith('T2|S2');
        });

        it('fails (returns false) when getPrompts returns a non-200 status', async () => {
            getPrompts.mockResolvedValue({ status: 500, data: null });
            const { generateAIThumbnail, isGeneratingThumbnail } = useImageHandling();
            const result = await generateAIThumbnail('Title', 'Sum', 'top');
            expect(result).toBe(false);
            expect(isGeneratingThumbnail.value).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Generation Failed', icon: 'error' })
            );
            expect(console.error).toHaveBeenCalledWith(
                'Error generating AI thumbnail:',
                expect.any(Error)
            );
        });

        it('fails when getPrompts returns 200 but no data', async () => {
            getPrompts.mockResolvedValue({ status: 200, data: null });
            const { generateAIThumbnail } = useImageHandling();
            const result = await generateAIThumbnail('Title', 'Sum', 'top');
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Generation Failed' })
            );
        });

        it('fails when generateArticleThumbnail returns no image data', async () => {
            getPrompts.mockResolvedValue({
                status: 200,
                data: [{ active: true, type: 'thumbnail', content: '{{topic}}' }],
            });
            generateArticleThumbnail.mockResolvedValue({ data: null });
            const { generateAIThumbnail } = useImageHandling();
            const result = await generateAIThumbnail('Title', 'Sum', 'top');
            expect(result).toBe(false);
            expect(Swal.fire).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'Generation Failed' })
            );
        });

        it('runs finally on the abrupt-completion path when the catch handler itself throws', async () => {
            // Enter the catch block, then make Swal.fire throw so an exception is
            // in flight when `finally` executes (the abrupt-completion finally branch).
            getPrompts.mockRejectedValue(new Error('prompts down'));
            const swalBoom = new Error('swal exploded');
            Swal.fire.mockImplementationOnce(() => {
                throw swalBoom;
            });

            const { generateAIThumbnail, isGeneratingThumbnail } = useImageHandling();
            await expect(generateAIThumbnail('Title', 'Sum', 'top')).rejects.toBe(swalBoom);
            // finally still ran despite the in-flight exception.
            expect(isGeneratingThumbnail.value).toBe(false);
        });
    });

    // -----------------------------------------------------------------------
    // removeImages / setImages / hasValidImages
    // -----------------------------------------------------------------------
    describe('removeImages', () => {
        it('clears both images', () => {
            const { setImages, removeImages, coverBase64, thumbnailBase64 } = useImageHandling();
            setImages('c', 't');
            removeImages();
            expect(coverBase64.value).toBe('');
            expect(thumbnailBase64.value).toBe('');
        });
    });

    describe('setImages', () => {
        it('sets both when provided', () => {
            const { setImages, coverBase64, thumbnailBase64 } = useImageHandling();
            setImages('cover', 'thumb');
            expect(coverBase64.value).toBe('cover');
            expect(thumbnailBase64.value).toBe('thumb');
        });

        it('sets only cover when thumbnail falsy', () => {
            const { setImages, coverBase64, thumbnailBase64 } = useImageHandling();
            setImages('cover', '');
            expect(coverBase64.value).toBe('cover');
            expect(thumbnailBase64.value).toBe('');
        });

        it('sets only thumbnail when cover falsy', () => {
            const { setImages, coverBase64, thumbnailBase64 } = useImageHandling();
            setImages('', 'thumb');
            expect(coverBase64.value).toBe('');
            expect(thumbnailBase64.value).toBe('thumb');
        });

        it('sets neither when both falsy', () => {
            const { setImages, coverBase64, thumbnailBase64 } = useImageHandling();
            setImages('', '');
            expect(coverBase64.value).toBe('');
            expect(thumbnailBase64.value).toBe('');
        });
    });

    describe('hasValidImages', () => {
        it('returns true only when both images are set', () => {
            const { setImages, hasValidImages } = useImageHandling();
            expect(hasValidImages()).toBe(false);
            setImages('cover', '');
            expect(hasValidImages()).toBe(false);
            setImages('cover', 'thumb');
            expect(hasValidImages()).toBe(true);
        });
    });

    // -----------------------------------------------------------------------
    // urlToBase64
    // -----------------------------------------------------------------------
    describe('urlToBase64', () => {
        it('resolves the data URL on success', async () => {
            const blob = { name: 'blob' };
            global.fetch = vi.fn().mockResolvedValue({ blob: vi.fn().mockResolvedValue(blob) });

            const { urlToBase64 } = useImageHandling();
            const promise = urlToBase64('http://x/img.png');

            // allow fetch + blob() to settle, then drive the reader.
            await flushUntilReader();
            const reader = readerInstances[0];
            expect(reader.readAsDataURL).toHaveBeenCalledWith(blob);
            reader.result = 'data:image/png;base64,URLDATA';
            reader.onload();

            await expect(promise).resolves.toBe('data:image/png;base64,URLDATA');
        });

        it('rejects when the reader errors (onerror is the inner reject)', async () => {
            const blob = { name: 'blob' };
            global.fetch = vi.fn().mockResolvedValue({ blob: vi.fn().mockResolvedValue(blob) });

            const { urlToBase64 } = useImageHandling();
            const promise = urlToBase64('http://x/img.png');

            await flushUntilReader();
            const reader = readerInstances[0];
            const failure = new Error('reader fail');
            reader.onerror(failure);

            // reader.onerror IS the Promise's reject and the inner promise is RETURNED
            // (not awaited) inside the try, so the rejection escapes the outer catch.
            await expect(promise).rejects.toBe(failure);
        });

        it('returns null when fetch rejects (catch path)', async () => {
            global.fetch = vi.fn().mockRejectedValue(new Error('network down'));
            const { urlToBase64 } = useImageHandling();
            const result = await urlToBase64('http://x/img.png');
            expect(result).toBeNull();
            expect(console.error).toHaveBeenCalledWith(
                'Error converting URL to base64:',
                expect.any(Error)
            );
        });
    });

    // -----------------------------------------------------------------------
    // getImageDimensions
    // -----------------------------------------------------------------------
    describe('getImageDimensions', () => {
        it('resolves dimensions and aspect ratio on load', async () => {
            const { getImageDimensions } = useImageHandling();
            const promise = getImageDimensions('data:image/png;base64,AAA');
            const img = imageInstances[0];
            img.width = 800;
            img.height = 400;
            img.onload();
            await expect(promise).resolves.toEqual({
                width: 800,
                height: 400,
                aspectRatio: 2,
            });
        });

        it('resolves null on image error', async () => {
            const { getImageDimensions } = useImageHandling();
            const promise = getImageDimensions('bad');
            const img = imageInstances[0];
            img.onerror();
            await expect(promise).resolves.toBeNull();
        });
    });
});

// ---------------------------------------------------------------------------
// Helpers to wait for async work to reach the point where an Image / FileReader
// instance has been created, without relying on real timers.
// ---------------------------------------------------------------------------
async function flushUntilImage() {
    for (let i = 0; i < 50 && imageInstances.length === 0; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}

async function flushUntilReader() {
    for (let i = 0; i < 50 && readerInstances.length === 0; i++) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
    }
}
