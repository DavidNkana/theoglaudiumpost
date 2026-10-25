export const errorHandler = {
    throwNotFound() {
        return 'Failed to Connect to Server!';
    },

    throwTimeOut() {
        return 'Connection Time Out!';
    },

    franchiseLoginError(errorResponse) {
        console.error(errorResponse)
        if (errorResponse.response.status === 404) {
            return this.throwNotFound();
        }
        return errorResponse.response.data.message;
    },

    tomcatError(err, isSweetalert = false , title = null,) {
        let response = err.response;
        let errorMessage;
        if (response) {
            console.error(response)
            if (response.status === 404) {
                errorMessage = this.throwNotFound();
            } else {
                errorMessage = response.data;
                if (errorMessage.error && typeof errorMessage === 'object') {
                    errorMessage = errorMessage.error;
                } else if (errorMessage.Error && typeof errorMessage === 'object') {
                    errorMessage = errorMessage.Error;
                }else if (errorMessage.response_message && typeof errorMessage === 'object') {
                    errorMessage = errorMessage.response_message;
                }else if (errorMessage.message && typeof errorMessage === 'object') {
                    errorMessage = errorMessage.message;
                } else if (errorMessage.Print && errorMessage.Print.toString().contains('failed')) {
                    errorMessage = errorMessage.Print;
                }
            }
        } else if (err.code === `ECONNABORTED`){
            errorMessage = this.throwTimeOut()
        }else {
            console.error(err)
            errorMessage = err.message;
        }
        if (errorMessage === `Network Error`){
            title = errorMessage;
            errorMessage = `Please Check your Internet`;
        }
        if (!isSweetalert) {
            responses.throwErr(errorMessage,title);
        }
        throw new Error(errorMessage);
    },

    customerKazangError(err, isSweetalert = false) {
        console.log(err)
        let response = err.response;
        let errorMessage;
        if (response) {
            console.error(response)
            if (response.status === 404) {
                errorMessage = this.throwNotFound();
            } else {
                errorMessage = response.data;
            }
        }else if (err.Error){
            errorMessage = err.Message;
        }else if (err.code === `ECONNABORTED`){
            errorMessage = this.throwTimeOut()
        }
        if (!isSweetalert) {
            responses.throwErr(errorMessage);
        }
        throw new Error(errorMessage);
    },
}