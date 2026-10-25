import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useArticleForm } from '@/composables/useArticleForm';

describe('useArticleForm', () => {
    let form;

    beforeEach(() => {
        form = useArticleForm();
    });

    describe('getInitialData / initial state', () => {
        it('returns the initial data structure with all defaults', () => {
            const data = form.getInitialData();
            expect(data).toEqual({
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
        });

        it('seeds article ref from initial data and starts with no validation errors', () => {
            expect(form.article.value).toEqual(form.getInitialData());
            expect(form.validationErrors.value).toEqual({});
        });

        it('returns a fresh object each call (not shared reference)', () => {
            const a = form.getInitialData();
            const b = form.getInitialData();
            expect(a).not.toBe(b);
            expect(a.tags).not.toBe(b.tags);
        });
    });

    describe('validateField', () => {
        it('returns null when there are no rules for the field', () => {
            expect(form.validateField('unknownField', 'anything', {})).toBeNull();
        });

        it('flags a required field that is empty (whitespace-only)', () => {
            expect(form.validateField('title', '   ', {})).toBe('Title is required');
        });

        it('flags a required field when value is undefined (optional chaining short-circuits)', () => {
            // value?.trim() -> undefined -> falsy -> required error
            expect(form.validateField('title', undefined, {})).toBe('Title is required');
        });

        it('passes the required check when a non-empty value is provided', () => {
            // long enough to pass minLength too
            expect(form.validateField('title', 'Valid title', {})).toBeNull();
        });

        it('flags requiredIf when condition is true and value is missing', () => {
            const article = { status: 'scheduled' };
            // value is empty/null -> !value true
            expect(form.validateField('scheduledFor', null, article)).toBe('ScheduledFor is required');
        });

        it('does not flag requiredIf when condition is true but value present (skips to futureDate)', () => {
            const article = { status: 'scheduled' };
            const future = new Date(Date.now() + 86_400_000).toISOString();
            expect(form.validateField('scheduledFor', future, article)).toBeNull();
        });

        it('does not flag requiredIf when condition is false', () => {
            const article = { status: 'published' };
            // requiredIf returns false -> skip; no value so futureDate branch skipped too
            expect(form.validateField('scheduledFor', null, article)).toBeNull();
        });

        it('flags minLength violation', () => {
            expect(form.validateField('title', 'ab', {})).toBe('Title must be at least 3 characters');
        });

        it('passes minLength when length is exactly at the boundary', () => {
            expect(form.validateField('title', 'abc', {})).toBeNull();
        });

        it('skips minLength check when value is undefined (optional chaining)', () => {
            // summary has minLength but required fires first for undefined; use content which also requires.
            // Use a field with minLength where required already short-circuits is required path,
            // so assert minLength branch independently via a value that is non-empty but short handled above.
            // Here ensure value?.length on undefined does not throw and required path returns first.
            expect(form.validateField('summary', undefined, {})).toBe('Summary is required');
        });

        it('flags maxLength violation', () => {
            const tooLong = 'a'.repeat(256);
            expect(form.validateField('title', tooLong, {})).toBe('Title must not exceed 255 characters');
        });

        it('passes maxLength when length is exactly at the boundary', () => {
            const exact = 'a'.repeat(255);
            // title at 255 passes max; also passes min and no pattern
            expect(form.validateField('title', exact, {})).toBeNull();
        });

        it('flags pattern violation for slug', () => {
            expect(form.validateField('slug', 'Invalid Slug!', {})).toBe('Slug format is invalid');
        });

        it('passes pattern for a valid slug', () => {
            expect(form.validateField('slug', 'valid-slug-123', {})).toBeNull();
        });

        it('flags futureDate when date is in the past', () => {
            const article = { status: 'scheduled' };
            const past = new Date(Date.now() - 86_400_000).toISOString();
            expect(form.validateField('scheduledFor', past, article)).toBe('Date must be in the future');
        });

        it('flags futureDate when date equals now (<= boundary)', () => {
            vi.useFakeTimers();
            const now = new Date('2030-01-01T00:00:00.000Z');
            vi.setSystemTime(now);
            const article = { status: 'scheduled' };
            // Provide exactly "now"; date <= new Date() is true
            expect(form.validateField('scheduledFor', now.toISOString(), article)).toBe('Date must be in the future');
            vi.useRealTimers();
        });

        it('passes futureDate when date is in the future', () => {
            const article = { status: 'scheduled' };
            const future = new Date(Date.now() + 86_400_000).toISOString();
            expect(form.validateField('scheduledFor', future, article)).toBeNull();
        });

        it('skips futureDate check when no value (futureDate && value is false)', () => {
            const article = { status: 'published' };
            expect(form.validateField('scheduledFor', null, article)).toBeNull();
        });

        it('returns null for a field that only has required:false (categoryId)', () => {
            // categoryId rules has required:false, no other rules -> all branches false -> null
            expect(form.validateField('categoryId', '', {})).toBeNull();
        });
    });

    describe('validateForm', () => {
        it('returns false and collects field errors plus coverImage error when form is empty', () => {
            const valid = form.validateForm();
            expect(valid).toBe(false);
            expect(form.validationErrors.value).toMatchObject({
                title: 'Title is required',
                slug: 'Slug is required',
                summary: 'Summary is required',
                content: 'Content is required',
                coverImage: 'Please include an image',
            });
            // categoryId and scheduledFor produce no error (no key)
            expect(form.validationErrors.value.categoryId).toBeUndefined();
            expect(form.validationErrors.value.scheduledFor).toBeUndefined();
        });

        it('still adds coverImage error even when all fields are valid but no image passed', () => {
            form.setArticleData({
                title: 'A valid title',
                slug: 'a-valid-slug',
                summary: 'This is a sufficiently long summary.',
                content: 'x'.repeat(60),
                status: 'published',
            });
            const valid = form.validateForm(null);
            expect(valid).toBe(false);
            expect(form.validationErrors.value).toEqual({ coverImage: 'Please include an image' });
        });

        it('returns true with no errors when all fields valid and coverImage provided', () => {
            form.setArticleData({
                title: 'A valid title',
                slug: 'a-valid-slug',
                summary: 'This is a sufficiently long summary.',
                content: 'x'.repeat(60),
                status: 'published',
            });
            const valid = form.validateForm('data:image/png;base64,abc');
            expect(valid).toBe(true);
            expect(form.validationErrors.value).toEqual({});
        });
    });

    describe('generateSlug', () => {
        it('returns empty string when title is falsy', () => {
            expect(form.generateSlug('')).toBe('');
            expect(form.generateSlug(undefined)).toBe('');
            expect(form.generateSlug(null)).toBe('');
        });

        it('lowercases, strips special chars, collapses spaces and dashes', () => {
            expect(form.generateSlug('Hello,   World!!  --  Test')).toBe('hello-world-test');
        });

        it('truncates the slug to 255 characters', () => {
            const longTitle = 'a'.repeat(300);
            const slug = form.generateSlug(longTitle);
            expect(slug).toHaveLength(255);
        });
    });

    describe('resetForm', () => {
        it('restores article to initial data and clears validation errors', () => {
            form.setArticleData({ title: 'Changed' });
            form.validationErrors.value = { title: 'oops' };
            form.resetForm();
            expect(form.article.value).toEqual(form.getInitialData());
            expect(form.validationErrors.value).toEqual({});
        });
    });

    describe('setArticleData', () => {
        it('merges provided data over initial defaults', () => {
            form.setArticleData({ title: 'Hello', status: 'draft' });
            expect(form.article.value.title).toBe('Hello');
            expect(form.article.value.status).toBe('draft');
            // unspecified field keeps default
            expect(form.article.value.articleType).toBe('featured');
            expect(form.article.value.tags).toEqual([]);
        });
    });

    describe('processContentWithSources', () => {
        it('returns content unchanged when sources is null', () => {
            expect(form.processContentWithSources('body', null)).toBe('body');
        });

        it('returns content unchanged when sources is an empty array', () => {
            expect(form.processContentWithSources('body', [])).toBe('body');
        });

        it('appends a sources section when sources are present', () => {
            const result = form.processContentWithSources('body', ['Source A', 'Source B']);
            expect(result).toBe(
                'body<hr><h3>Sources:</h3><ul><li>Source A</li><li>Source B</li></ul>'
            );
        });

        it('treats falsy content as empty string when building sources section', () => {
            const result = form.processContentWithSources(null, ['Only Source']);
            expect(result).toBe('<hr><h3>Sources:</h3><ul><li>Only Source</li></ul>');
        });
    });

    describe('prepareForSubmission', () => {
        afterEach(() => {
            vi.useRealTimers();
        });

        it('sets scheduledFor to null when status is draft', () => {
            form.setArticleData({ status: 'draft', scheduledFor: '2030-01-01T00:00:00.000Z' });
            const data = form.prepareForSubmission('cover64', 'thumb64');
            expect(data.scheduledFor).toBeNull();
            expect(data.coverImage).toBe('cover64');
            expect(data.thumbnailImage).toBe('thumb64');
            expect(data.sourceId).toBeUndefined();
        });

        it('keeps existing scheduledFor when status is not draft and value present', () => {
            form.setArticleData({ status: 'scheduled', scheduledFor: '2030-05-05T00:00:00.000Z' });
            const data = form.prepareForSubmission('cover64', 'thumb64');
            expect(data.scheduledFor).toBe('2030-05-05T00:00:00.000Z');
        });

        it('falls back to current ISO time when not draft and scheduledFor missing', () => {
            vi.useFakeTimers();
            const now = new Date('2030-02-02T03:04:05.000Z');
            vi.setSystemTime(now);
            form.setArticleData({ status: 'published', scheduledFor: null });
            const data = form.prepareForSubmission('cover64', 'thumb64');
            expect(data.scheduledFor).toBe('2030-02-02T03:04:05.000Z');
        });

        it('defaults coverImage/thumbnailImage to empty strings when args omitted', () => {
            form.setArticleData({ status: 'draft' });
            const data = form.prepareForSubmission();
            expect(data.coverImage).toBe('');
            expect(data.thumbnailImage).toBe('');
        });

        it('removes the sourceId field from the payload', () => {
            form.setArticleData({ status: 'draft', sourceId: 42 });
            const data = form.prepareForSubmission('c', 't');
            expect('sourceId' in data).toBe(false);
        });
    });

    it('exposes all expected members', () => {
        expect(typeof form.validateForm).toBe('function');
        expect(typeof form.validateField).toBe('function');
        expect(typeof form.generateSlug).toBe('function');
        expect(typeof form.resetForm).toBe('function');
        expect(typeof form.setArticleData).toBe('function');
        expect(typeof form.processContentWithSources).toBe('function');
        expect(typeof form.prepareForSubmission).toBe('function');
        expect(typeof form.getInitialData).toBe('function');
        expect(form.article).toBeDefined();
        expect(form.validationErrors).toBeDefined();
    });
});
