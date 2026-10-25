/**
 * utils/responses.js
 * 
 * User interface notification and response utilities for the Laudium Biz application.
 * 
 * This module:
 * - Provides standardized methods for displaying notifications to users
 * - Wraps SweetAlert2 (Swal) and Toast notifications with consistent styling
 * - Includes utilities for error handling and date formatting in the UI
 * - Creates a unified notification experience throughout the application
 */

import store from '../store/index'

/**
 * Response utility object containing methods for user notifications and UI feedback
 */
export const responses = {
    /**
     * Displays an error message to the user
     * 
     * @param {string} err - The error message to display
     * @param {string} title - The title of the error dialog (default: "Oops")
     * @returns {Promise} - The SweetAlert2 promise
     */
    throwErr(err, title = `Oops`){
        return Swal.fire({
            title: title,
            icon: `warning`,
            html : `<span>${err}</span>`,
            showCloseButton : true,
        })
    },

    /**
     * Device error handling (currently commented out)
     * This method would handle device registration errors and reset functionality
     * 
     * @param {string} err - The error message to display
     * @returns {Promise} - The SweetAlert2 promise
     */
    // async deviceErr (err) {
    //     await store.dispatch('fetchResetCount')
    //     let count = store.getters.getResetCount;
    //     console.log(count)
    //     return Swal.fire({
    //         title: `Registration Error`,
    //         icon: 'error',
    //         html: `
    //         <span>${err}</span><br/>
    //         <br/>
    //         <span>Number Of Reset Count(s): ${count.resets}</span><br/>
    //         <span>Remaining Resets Count(s): ${count.remainingResets}</span>
    //     `,
    //         showCloseButton: true,
    //         confirmButtonText: 'Reset Device',
    //     }).then((result) => {
    //         if (result.isConfirmed) {
    //             Swal.fire({
    //                 title: "Enter Your Name",
    //                 input: "text",
    //                 showCancelButton: true,
    //                 confirmButtonText: 'Reset',
    //             }).then((nameResult) => {
    //                 if (nameResult.value) {
    //                     store.dispatch('ResetDevices', nameResult.value)
    //                         .then(() => {
    //                             Swal.fire({
    //                                 title: "Devices Reset",
    //                                 icon: "success",
    //                                 text: "Your license have been reset successfully!. Please login again",
    //                             });
    //                         })
    //                         .catch((err) => {
    //                             Swal.fire({
    //                                 title: "Error",
    //                                 icon: "error",
    //                                 text: `An error occurred while resetting the devices: ${err.message}`,
    //                             });
    //                         });
    //                 }
    //             });
    //         }
    //     });
    // },

    /**
     * Displays a success toast notification
     * 
     * @param {string} msg - The success message to display
     * @returns {Promise} - The Toast promise
     */
    showSuccess(msg){
        return Toast.fire({
            icon: 'success',
            title: msg
        });
    },

    /**
     * Displays an informational toast notification
     * 
     * @param {string} msg - The information message to display
     * @returns {Promise} - The Toast promise
     */
    showInfo(msg){
        return Toast.fire({
            icon: 'info',
            title: msg
        });
    },

    /**
     * Displays a warning toast notification
     * 
     * @param {string} msg - The warning message to display
     * @returns {Promise} - The Toast promise
     */
    showWarning(msg){
        return Toast.fire({
            icon: 'warning',
            title: msg
        });
    },

    /**
     * Formats a date for display in the UI
     * 
     * @param {Date|string} date - The date to format
     * @returns {string} - The formatted date string
     */
    displayDate(date) {
        return dateTimeManager.shortenDisplay(date);
    },
}
