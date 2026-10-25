package com.laudiumbiz.Laudiumbiz.Exceptions;

import lombok.Getter;

@Getter
public class ApiException extends RuntimeException {

    String code;
    String description;

    public ApiException(String code, String description, String message) {
        super(message);
        this.code = code;
        this.description = description;
    }

}
