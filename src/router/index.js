/**
 * router/index.js
 *
 * Vue Router configuration for the Laudium Biz application.
 *
 * This file:
 * - Defines all application routes and their components
 * - Configures route meta information (titles, auth requirements)
 * - Sets up navigation guards for authentication and authorization
 * - Handles route transitions and scroll behavior
 * - Organizes routes into logical sections (public, business, admin)
 */

import { createWebHistory, createRouter } from "vue-router";
import AppLayout from "@/layouts/AppLayout.vue";
import AdminLayout from "@/layouts/AdminLayout.vue";
import BusinessLayout from "@/layouts/BusinessLayout.vue";
import { IS_DEV, BASE_URL } from "@/config/env";


/**
 * Application Routes
 *
 * Routes are organized into three main sections:
 * 1. Public routes - Available to all users without authentication
 * 2. Business routes - For business users with authentication
 * 3. Admin routes - For administrators with authentication and admin role
 */
const routes = [
  /**
   * Public Routes
   *
   * These routes use the AppLayout and are accessible to all users.
   * They include the home page, news, podcasts, notices, events, etc.
   */
  {
    path: "/",
    component: AppLayout,
    children: [
      {
        path: "", // this means '/'
        name: "Home",
        meta: {
          title: "Newspaper Gallery",
        },
        component: () => import("@/views/News/News.vue"),
      },
      {
        path: "news",
        // name: "News",
        children: [
          {
            path: "",
            name: "news",
            meta: { title: "Latest News" },
            component: () => import("@/views/News/News.vue"),
          },
          {
            path: "archive",
            name: "NewsArchive",
            meta: { title: "News Archive" },
            component: () => import("@/views/News/Archive.vue"),
          },
          {
            path: ":slug",
            name: "Article",
            meta: {
              title: "Article",
            },
            component: () => import("@/views/Article/Article.vue"),
          },
        ],
      },
      {
        path: "categories/:slug",
        name: "Category",
        meta: { title: "Category" },
        component: () => import("@/views/Category/Index.vue"),
      },
      {
        path: "tags/:slug",
        name: "Tag",
        meta: { title: "Tag" },
        component: () => import("@/views/Tag/Index.vue"),
      },
      {
        path: "community",
        children: [
          {
            path: "",
            name: "community notices",
            meta: { title: "Community" },
            component: () => import("@/views/Community/Index.vue"),
          },
          {
            path: ":slug",
            name: "Notice",
            meta: {
              title: "Notice",
            },
            component: () => import("@/views/Community/Notice.vue"),
          },
        ],
      },
        {
            path: "announcements",
            name: "Community Announcements",
            meta: {title: "Announcements"},
            component: () => import("@/views/Announcements/Index.vue"),
        },
        {
        path: "directory",
        children: [
          {
            path: "",
            name: "directory",
            meta: { title: "Business Directory" },
            component: () => import("@/views/Directory/Index.vue"),
          },
          {
            path: ":slug",
            name: "DirectoryItem",
            meta: {
              title: "Directory Item",
            },
            component: () => import("@/views/Directory/Item.vue"),
          },
        ],
      },
      {
        path: "events",
        name: "Events",
        meta: { title: "Community Events" },
        component: () => import("@/views/Events/Events.vue"),
      },
      {
        path: "search",
        name: "Search",
        meta: { title: "Search" },
        component: () => import("@/views/Search/Search.vue"),
      },
      //   {
      //     path: "profile",
      //     name: "Profile",
      //     component: Profile,
      //     meta: { title: "My Profile" },
      //   },
      {
        path: "terms-of-use",
        name: "Terms of Use",
        component: () => import("@/views/TermsOfUse.vue"),
        meta: { title: "Terms of Use" },
      },
      {
        path: "privacy-policy",
        name: "Privacy Policy",
        component: () => import("@/views/PrivacyPolicy.vue"),
        meta: { title: "Privacy Policy" },
      },
      {
        path: "about",
        name: "About Publisher",
        component: () => import("@/views/AboutPublisher.vue"),
        meta: { title: "About Laudium Post" },
      },
      {
        path: "editorial-policy",
        name: "Editorial Policy",
        component: () => import("@/views/EditorialPolicy.vue"),
        meta: { title: "Editorial Policy" },
      },
      {
        path: "corrections",
        name: "Corrections Policy",
        component: () => import("@/views/CorrectionsPolicy.vue"),
        meta: { title: "Corrections Policy" },
      },
      {
        path: "podcasts",
        name: "Podcasts",
        meta: { title: "YouTube Podcasts Videos" },
        component: () => import("@/views/YouTube/Index.vue"),
      },
    ],
  },
  {
    path: "/payment/success/:id",
    name: "PaymentSuccess",
    meta: { title: "Payfast Payment Success" },
    component: () => import("@/views/Payment/Success.vue"),
  },
  // {
  //   path: "/payment/receipt/:id",
  //   name: "PaymentReceipt",
  //   meta: { title: "Payment Receipt" },
  //   component: () => import("@/views/Payment/Receipt.vue"),
  // },
  {
    path: "/payment/cancel/:id",
    name: "PaymentCancel",
    meta: { title: "Payment Cancel" },
    component: () => import("@/views/Payment/Cancelled.vue"),
  },

  {
    path: "/project-documentation",
    name: "ProjectDocumentation",
    meta: {
      title: "Project Documentation",
      devOnly: true,
    },
    component: () => import("@/views/ProjectDocumentation.vue"),
    beforeEnter: (to, from, next) => {
      // Only allow access in development mode
      if (IS_DEV) {
        next();
      } else {
        next("/");
      }
    },
  },

  /**
   * Business Routes
   *
   * These routes are for business users and include:
   * - Public routes: login and registration
   * - Protected routes: dashboard, campaigns, ads management
   * All protected routes require authentication with the advertiser role.
   */
  {
    path: "/business",
    children: [
      {
        path: "login",
        name: "BusinessLogin",
        meta: { title: "Business Login" },
        component: () => import("@/views/Business/Login.vue"),
      },
      {
        path: "register",
        name: "BusinessRegister",
        meta: { title: "Business Register" },
        component: () => import("@/views/Business/Register.vue"),
      },
      {
        path: "",
        component: BusinessLayout,
        meta: { requiresAuth: true, adminRoute: false },
        children: [
          {
            path: "dashboard",
            name: "BusinessDashboard",
            meta: { title: "Business Dashboard", requiresAuth: true },
            component: () => import("@/views/Business/Dashboard/Index.vue"),
          },
          // {
          //   path: "campaigns",
          //   name: "BusinessCampaigns",
          //   meta: { title: "Business Campaigns", requiresAuth: true },
          //   component: () => import("@/views/Business/Campaigns/Index.vue"),
          // },
          {
            path: "ads",
            name: "BusinessAds",
            meta: { title: "Business Ads", requiresAuth: true },
            component: () => import("@/views/Business/Ads/Index.vue"),
          },
          {
            path: "advertise",
            name: "AdvertiseWithUs",
            meta: { title: "Advertise With Us", requiresAuth: true },
            component: () => import("@/views/Business/AdvertiseWithUs.vue"),
          },
          {
            path: "payments",
            name: "BusinessPayments",
            meta: { title: "Payment History", requiresAuth: true },
            component: () => import("@/views/Business/Payments/Index.vue"),
          },
        ],
      },
    ],
  },
  /**
   * Admin Routes
   *
   * These routes are for administrators and include:
   * - Public route: admin login
   * - Protected routes: dashboard, content management, user management
   * All protected routes require authentication with the admin role.
   */
  {
    path: "/admin/login",
    name: "AdminLogin",
    component: () => import("@/views/Admin/AdminLogin.vue"),
    meta: { title: "Admin Login", publicRoute: true },
  },
  // FIX LCP #712: Handre review - alias /admin/prompts → /admin/articles/prompts
  // Previous production candidate failed with app-404 at /admin/prompts.
  // The actual route is /admin/articles/prompts (ManagePrompts route below).
  // This standalone redirect preserves auth guards from the AdminLayout parent.
  {
    path: "/admin/prompts",
    redirect: "/admin/articles/prompts",
  },
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true, adminRoute: true },
    children: [
      {
        path: "dashboard",
        name: "AdminDashboard",
        //   component: AdminDashboard,
        meta: { title: "Admin Dashboard", requiresAuth: true },
        component: () => import("@/views/Admin/Dashboard/Index.vue"),
      },
      {
        path: "articles",
        // meta: { title: "Manage Articles", requiresAuth: true },
        children: [
          {
            path: "",
            name: "AdminArticles",
            meta: { title: "Admin Articles", requiresAuth: true },
            component: () => import("@/views/Admin/Articles/Index.vue"),
          },
          {
            path: "prompt",
            name: "ArticlePrompt",
            meta: { title: "Create Article", requiresAuth: true },
            component: () => import("@/views/Admin/Articles/ArticlePromptView.vue"),
          },
          {
            path: "create",
            name: "CreateArticle",
            meta: { title: "Create Article", requiresAuth: true },
            component: () => import("@/views/Admin/Articles/Create.vue"),
          },
          {
            path: "edit/:id",
            name: "EditArticle",
            meta: { title: "Edit Article", requiresAuth: true },
            component: () => import("@/views/Admin/Articles/Edit.vue"),
          },
          {
            path: "prompts",
            name: "ManagePrompts",
            meta: {
              title: "Manage AI Prompts",
              requiresAuth: true,
              // Removed superAdminRoute - only requires admin auth, not superadmin
              // FIX: LCP #712 PROMPT-001 - route was returning 403 because
              // superadmin-only requirement was incorrect for admin role users
            },
            component: () => import("@/views/Admin/Articles/PromptManager.vue"),
          },
        ],
      },
      {
        path: "source-articles",
        name: "AdminSourceArticles",
        meta: { title: "Source Articles", requiresAuth: true },
        component: () => import("@/views/Admin/Articles/SourceArticles.vue"),
      },
      {
        path: "ads",
        // meta: { title: "Manage Articles", requiresAuth: true },
        children: [
          {
            path: "",
            // meta: { title: "Manage Articles", requiresAuth: true },
            children: [
              {
                path: "",
                name: "AdsManagement",
                meta: { title: "Manage Ads", requiresAuth: true },
                component: () => import("@/views/Admin/Ads/Index.vue"),
              },
              {
                path: "create",
                name: "CreateAd",
                meta: { title: "Create Ad", requiresAuth: true },
                component: () => import("@/views/Admin/Ads/AdForm.vue"),
              },
              {
                path: "edit/:id",
                name: "EditAd",
                meta: { title: "Edit Ad", requiresAuth: true },
                component: () => import("@/views/Admin/Ads/AdForm.vue"),
              },
            ],
          },
          {
            path: "payments",

            children: [
              {
                path: "",
                name: "PaymentsManagement",
                meta: {
                  title: "Manage Payments",
                  requiresAuth: true,
                  superAdminRoute: true,
                },
                component: () => import("@/views/Admin/Ads/Payments/Index.vue"),
              },
            ],
          },
          // {
          //   path: "campaigns",
          //   // meta: { title: "Manage Articles", requiresAuth: true },
          //   children: [
          //     {
          //       path: "",
          //       name: "CampaignsManagement",
          //       meta: { title: "Manage Ads", requiresAuth: true },
          //       component: () => import("@/views/Admin/Campaigns/Index.vue"),
          //     },
          //     {
          //       path: "create",
          //       name: "CreateCampaign",
          //       meta: { title: "Create Campaign", requiresAuth: true },
          //       component: () =>
          //         import("@/views/Admin/Campaigns/CampaignForm.vue"),
          //     },
          //     {
          //       path: "edit/:id",
          //       name: "EditCampaign",
          //       meta: { title: "Edit Campaign", requiresAuth: true },
          //       component: () =>
          //         import("@/views/Admin/Campaigns/CampaignForm.vue"),
          //     },
          //   ],
          // },
          {
            path: "ad-placements",
            name: "AdPlacementsManagement",
            meta: {
              title: "Manage Ad Placements",
              requiresAuth: true,
              superAdminRoute: true,
            },
            component: () => import("@/views/Admin/AdPlacements/Index.vue"),
          },
        ],
      },
      {
        path: "businesses",
        name: "BusinessesManagement",
        meta: { title: "Manage Businesses", requiresAuth: true },
        component: () => import("@/views/Admin/Businesses/Index.vue"),
      },
      {
        path: "users",
        name: "UsersManagement",
        meta: { title: "Manage Users", requiresAuth: true },
        component: () => import("@/views/Admin/Users/Index.vue"),
      },
      // {
      //   path: "podcasts",
      //   name: "AdminPodcasts",
      //   component: () => import("@/views/Admin/Podcasts.vue"),
      //   meta: { title: "Manage Podcasts", requiresAuth: true },
      // },
      {
        path: "announcements",
        // meta: { title: "Manage Articles", requiresAuth: true },
        children: [
          {
            path: "",
            // meta: { title: "Manage Articles", requiresAuth: true },
            children: [
              {
                path: "",
                name: "Announcements Management",
                meta: { title: "Manage Announcements", requiresAuth: true },
                component: () =>
                  import("@/views/Admin/Announcements/Index.vue"),
              },
              {
                path: "create",
                name: "CreateAnnouncement",
                meta: { title: "Create Announcement", requiresAuth: true },
                component: () =>
                  import("@/views/Admin/Announcements/CreateOrEdit.vue"),
              },
              {
                path: "edit/:id",
                name: "EditAnnouncement",
                meta: { title: "Edit Announcement", requiresAuth: true },
                component: () =>
                  import("@/views/Admin/Announcements/CreateOrEdit.vue"),
              },
            ],
          },
          {
            path: "categories",
            name: "AnnouncementsCategories",
            meta: {
              title: "Manage Categories",
              requiresAuth: true,
              superAdminRoute: true,
            },
            component: () =>
              import("@/views/Admin/Announcements/Categories.vue"),
          },
        ],
      },
    ],
  },
];

/**
 * Error Routes
 *
 * These routes handle error scenarios:
 * - 403: Forbidden (unauthorized access)
 * - 404: Not Found (page doesn't exist)
 */
const errorRoutes = [
  {
    path: "/403",
    name: "Forbidden",
    component: () => import("@/views/Errors/403.vue"),
    meta: { title: "Access Forbidden" },
  },
  {
    path: "/404",
    name: "NotFound",
    component: () => import("@/views/Errors/404.vue"),
    meta: { title: "Page Not Found" },
  },
  // Catch-all route for 404 errors
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
  },
];

// Add error routes to the main routes array
routes.push(...errorRoutes);

/**
 * Router Configuration
 *
 * Creates the Vue Router instance with:
 * - HTML5 history mode for clean URLs
 * - Defined routes
 * - Custom scroll behavior to improve user experience
 */
const router = createRouter({
  // Use HTML5 History mode for clean URLs without hash
  history: createWebHistory(BASE_URL),
  // Use the routes defined above
  routes,
  // Custom scroll behavior for better user experience
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      // Back/forward button: restore previous scroll position
      return savedPosition;
    } else {
      // New navigation: scroll to top
      return { top: 0 };
    }
  },
});

/**
 * Navigation Guards
 *
 * Authentication and authorization flow:
 * 1. Public routes → Allow all users
 * 2. Auth required → Check if user is logged in
 * 3. Role verification → Ensure user has required permissions
 * 4. Business setup → Verify business profile exists for business routes
 *
 * @ModifiedByJunie 2025-12-09
 * Fixed: Read auth state directly from localStorage to avoid race conditions
 * with useLocalStorage reactive state that may not have synced yet after login
 */
router.beforeEach((to, from, next) => {
    document.title = to.meta.title
        ? `${to.meta.title} | Laudium POST`
        : "Laudium POST";

    // Read auth state directly from localStorage for reliability
    // This avoids race conditions with useLocalStorage reactive state
    const token = localStorage.getItem("auth.token");
    const userJson = localStorage.getItem("auth.user");
    const user = userJson ? JSON.parse(userJson) : null;
    const isAuthenticated = !!token && !!user;

    // FIX: Only redirect to login and clear localStorage when entering /admin
    // if the user is NOT already authenticated.
    // This preserves valid auth sessions when navigating directly to /admin.
    if ((to.path === "/admin" || to.path === "/admin/")) {
        if (!isAuthenticated) {
            // User is not authenticated - clear any stale auth data and redirect to login
            localStorage.removeItem("auth.token");
            localStorage.removeItem("auth.user");
            localStorage.removeItem("auth.refresh_token");
            localStorage.removeItem("auth.expiration");

            return next({ path: "/admin/login", query: { redirect: "/admin/dashboard" } });
        }
        // User IS authenticated - allow through to /admin, which will show dashboard
        // No localStorage clearing needed
    }

    // Helper to check user role
    const hasRole = (role) => {
        const roleName = user?.role?.name;
        if (!roleName || !role) {
            return false;
        }
        return roleName.toLowerCase() === role.toLowerCase();
    };

    // Extract route requirements
    const requiresAuth = to.meta.requiresAuth || false;
    const isAdminRoute = to.meta.adminRoute || false;
    const isSuperAdminRoute = to.meta.superAdminRoute || false;
    const isBusinessRoute = to.path.startsWith("/business") && to.path !== "/business/login" && to.path !== "/business/register";

    // Public routes - no authentication needed
    if (!requiresAuth) {
        return next();
    }

    console.log("Router Authentication status:", isAuthenticated);
    console.log("Router Authentication user:", user);

    // Authentication check - redirect to appropriate login
    if (!isAuthenticated) {
        const redirectPath = to.fullPath;
        const loginPath = isAdminRoute ? "/admin/login" : "/business/register";
        return next({ path: loginPath, query: { redirect: redirectPath } });
    }

    // Super admin authorization - most restrictive check first
    if (isSuperAdminRoute && !hasRole("superadmin")) {
        return next("/403");
    }

    // Admin authorization
    if (isAdminRoute && !hasRole("admin") && !hasRole("superadmin")) {
        return next("/403");
    }

    // Business route authorization and setup verification
    if (isBusinessRoute) {
        // User must have advertiser role
        if (!hasRole("advertiser")) {
            return next("/403");
        }

        // Advertiser must complete business registration
        if (!user?.business) {
            return next({
                path: "/business/register",
                query: { redirect: to.fullPath }
            });
        }
    }

    // All checks passed
    next();
});

export default router;
