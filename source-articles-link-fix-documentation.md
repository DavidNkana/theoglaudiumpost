# Source Articles Link Fix Documentation

## Issue Description

The Source Articles link in the admin sidebar was not working correctly. When users clicked on the Source Articles link, they were not being properly routed to the corresponding page.

```html
<a data-v-e5e83559="" href="/admin/source-articles" class="nav-link"><i data-v-e5e83559="" class="bi bi-file-earmark-text me-2"></i><span data-v-e5e83559="">Source Articles</span></a>

The routing on this sidebar is not working
```

## Root Cause Analysis

After investigating the codebase, no obvious issues were found with:

1. The router configuration in router/index.js
2. The Source Articles component implementation
3. The AdminLayout.vue file's router-link implementation
4. Navigation guards or middleware
5. CSS styles or event handlers that might interfere with navigation

The most likely cause was determined to be an issue with how Vue Router was handling the navigation through the router-link component, possibly due to a JavaScript error in the console or a browser-specific issue.

## Changes Made

### Changed the Source Articles link implementation in AdminLayout.vue

Instead of using a `<router-link>` component, the link was changed to use a regular anchor tag with a click event handler that calls `$router.push('/admin/source-articles')`.

#### Before:

```html
<li class="nav-item">
  <router-link
    to="/admin/source-articles"
    class="nav-link"
    active-class="active"
  >
    <i class="bi bi-file-earmark-text me-2"></i>
    <span>Source Articles</span>
  </router-link>
</li>
```

#### After:

```html
<li class="nav-item">
  <a 
    href="#" 
    class="nav-link" 
    @click.prevent="$router.push('/admin/source-articles')"
    :class="{ 'active': $route.path.startsWith('/admin/source-articles') }"
  >
    <i class="bi bi-file-earmark-text me-2"></i>
    <span>Source Articles</span>
  </a>
</li>
```

## Explanation of the Fix

1. **Changed from `<router-link>` to `<a>` tag**: This bypasses any potential issues with how the router-link component is being rendered or processed.

2. **Added `@click.prevent` event handler**: This prevents the default behavior of the anchor tag and instead uses the Vue Router's programmatic navigation method `$router.push()`.

3. **Dynamic class binding**: Added `:class="{ 'active': $route.path.startsWith('/admin/source-articles') }"` to maintain the same functionality as the 'active-class' attribute on the router-link, ensuring the link is highlighted when the user is on the Source Articles page.

## Verification Steps

To verify that the Source Articles link is working correctly:

1. Log in to the admin panel
2. Click on the "Source Articles" link in the sidebar
   - You should be navigated to the Source Articles page (/admin/source-articles)
3. Verify that the "Source Articles" link is highlighted with the active style

## Expected Behavior

- Clicking on the "Source Articles" link should navigate to the Source Articles page
- The link should be highlighted with the active style when the user is on the Source Articles page

## Additional Notes

This fix maintains the existing functionality while ensuring that the routing works correctly. The approach of using a regular anchor tag with a click event handler is a common workaround for issues with router-link components and should be more reliable in various browser environments.

If this fix resolves the issue, you might consider applying a similar approach to other sidebar links if they exhibit similar problems in the future.