/**
 * composables/useAuth.js
 *
 * Authentication composable for the Laudium Biz application.
 *
 * This composable:
 * - Manages user authentication state (login, logout, token handling)
 * - Provides JWT token decoding and validation
 * - Handles automatic logout when tokens expire
 * - Offers role-based access control functionality
 * - Manages redirection after authentication events
 */

import {computed} from "vue";
import {useRouter} from "vue-router";
import {formatDistanceToNow} from 'date-fns'
import {login as loginRequest} from "@/features/auth/AuthService";
import {register} from "@/features/businesses/BusinessesService";
import {devLog} from "@/utils/devLog";
import {useLocalStorage, useStorage} from "@vueuse/core";
import {jwtDecode} from "jwt-decode";

const MAX_BROWSER_TIMEOUT_MS = 2_147_483_647;

/**
 * Authentication composable that provides authentication functionality
 *
 * @returns {Object} - Authentication methods and state
 */
export function useAuth() {
    // Obtain the router from the injection context instead of importing the
    // singleton — that static import created a router <-> useAuth dependency
    // cycle (the class of bug that crashed the app at runtime).
    const router = useRouter();

    const persistedToken = () => localStorage.getItem("auth.token")

    const persistedUser = () => {
        const user = localStorage.getItem("auth.user")
        return user ? JSON.parse(user) : undefined;
    };
    // Reactive state for authentication
    const user = useLocalStorage(
        "auth.user",
        persistedUser,
        {
            listenToStorageChanges: true,
            serializer: {
                read: raw => JSON.parse(raw),
                write: value => JSON.stringify(value),
            }
        });
    /**
     *
     * @type {RemovableRef<{id:number,name:string,email:string,businessId:number|null,role:{id:number,name:string},business?: {id:string,name: string, email: string, phone: string, website: string, location: string}}>}
     */
    const token = useLocalStorage("auth.token", persistedToken, {
        listenToStorageChanges: true,
    });

    /**
     * Extracts the expiration timestamp from a JWT token
     *
     * @param {string} token - The JWT token to decode
     * @returns {number} - Expiration timestamp in milliseconds
     */
    function getTokenExpiration(token) {
        try {
            const decoded = jwtDecode(token);
            return decoded.exp * 1000; // convert to ms
        } catch {
            return 0;
        }
    }

    /**
     * Sets up automatic logout when the token expires
     *
     * @param {Function} logout - The logout function to call when token expires
     */
    function setupAutoLogout(logout) {
        if (!token.value) return;
        const expirationTime = getTokenExpiration(token.value);
        const expirationDate = new Date(expirationTime);
        // JWT exp is normalized to milliseconds by getTokenExpiration; do not
        // pass it through fromUnixTime again or browser timers overflow and
        // immediately clear localStorage after an otherwise successful login.
        const timeout = expirationTime - Date.now();
        devLog.debug("Auto log out on : ", formatDistanceToNow(expirationDate));
        devLog.debug("Auto log ", timeout, "ms from now");
        if (!expirationTime || timeout <= 0) {
            logout();
        } else {
            const delay = Math.min(timeout, MAX_BROWSER_TIMEOUT_MS);
            setTimeout(() => {
                setupAutoLogout(logout);
            }, delay);
        }
    }

    /**
     * Saves a new authentication token and updates user state
     *
     * @param {{ token: string, refreshToken: string, expiration: number, user: {id:number,name:string,email:string,businessId:number|null,role:{id:number,name:string},business?: {id:string,name: string, email: string, phone: string, website: string, location: string}}}} tokens - The new JWT token to save
     */
    const saveToken = (tokens) => {
        try {
            devLog.debug(tokens)
            token.value = tokens.token;
            user.value = tokens.user;
            localStorage.setItem("auth.token", tokens.token);
            localStorage.setItem("auth.user", JSON.stringify(tokens.user));
            localStorage.setItem("auth.refresh_token", tokens.refreshToken);
            devLog.info("User authenticated:", user.value);
            setupAutoLogout(logout);
        } catch (err) {
            console.error(err);
            throw err;
        }
    };

    /**
     * Authenticates a user with email and password
     *
     * @param {string} email - User's email address
     * @param {string} password - User's password
     * @returns {Promise<AxiosResponse>} - API response with authentication result
     */
    const login = async (email, password) => {
        const response = await loginRequest({email, password});
        // Check if response contains a token (JWT-based auth)
        if (response.data.token) {
            saveToken(response.data);
        } else {
            user.value = response.data.user;
            devLog.info("User authenticated:", user.value);
        }

        return response;
    };

    /**
     * Registers a new business user and logs them in
     *
     * @param {Object} payload - Business registration data
     * @returns {Promise<Object>} - API response with registration result
     */
    const businessRegisteration = async (payload) => {
        const response = await register(payload);
        if (response.status === 201) {
            return login(payload.email, payload.password);
        }
        throw new Error(response.data);
    };

    /**
     * Logs out the current user and redirects if necessary
     */
    const logout = () => {
        // Clear reactive refs
        token.value = null;
        user.value = null;

        // Explicitly remove all auth data from localStorage
        localStorage.removeItem("auth.token");
        localStorage.removeItem("auth.user");
        localStorage.removeItem("auth.refresh_token");
        localStorage.removeItem("auth.expiration");

        // Redirect to appropriate login page
        const currentPath = router.currentRoute.value.path;
        if (/^\/business(\/.*)?$/.test(currentPath)) {
            router.push("/business/login");
        } else {
            router.push("/admin/login");
        }
    };

    /**
     * Computed property that determines if a user is authenticated
     */
    const isAuthenticated = computed(() => !!user.value);
    const currentUser = computed(() => user.value);
    /**
     * Checks if the current user has a specific role
     *
     * @param {string} role - The role to check for
     * @returns {boolean} - True if the user has the specified role
     */
    const hasRole = (role) => {
        const roleName = user.value?.role?.name;
        if (!roleName || !role) {
            return false;
        }
        return roleName.toLowerCase() === role.toLowerCase();
    };

    // Initialize auto-logout on composable creation
    // setupAutoLogout(logout);

    return {
        user: currentUser,
        isAuthenticated,
        login,
        businessRegisteration,
        logout,
        hasRole,
    };
}

