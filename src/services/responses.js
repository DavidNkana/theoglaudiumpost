export const responses = {
    throwErr(err,title = `An Error Occurred`){
        return Swal.fire({
            title: title,
            icon: `error`,
            html : `<p>${err}</p>`,
            showCloseButton : true,
        })
    },

    showSuccess(msg){
        return Toast.fire({
            icon: 'success',
            title: msg
        });
    },

    showInfo(msg){
        return Toast.fire({
            icon: 'info',
            title: msg
        });
    },

    showWarning(msg){
        return Toast.fire({
            icon: 'warning',
            title: msg
        });
    },
}
