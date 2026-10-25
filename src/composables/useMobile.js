import {ref, onMounted, onUnmounted} from "vue";

export function useMobile() {
    // Check viewport immediately on composable creation (not just on mount)
    const checkMobile = () => {
        return typeof window !== 'undefined' && window.innerWidth < 768;
    };

    // Initialize with current viewport state
    const isMobile = ref(checkMobile());

    const updateMobile = () => {
        isMobile.value = checkMobile();
    };

    // Also check on mount and window resize
    onMounted(() => {
        updateMobile();
        window.addEventListener('resize', updateMobile);
    });

    onUnmounted(() => {
        window.removeEventListener('resize', updateMobile);
    });

    return { isMobile };
}
