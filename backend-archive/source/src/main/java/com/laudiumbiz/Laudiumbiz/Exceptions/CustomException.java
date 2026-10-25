/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author User
 */
public class CustomException extends Exception {

    Integer code;

    public Integer getCode() {
        return code;
    }

    public CustomException(String message, int code) {
        super(message);
        this.code = code;
    }

    public CustomException(String message, Throwable cause, Integer code) {
        super(message, cause);
        this.code = code;
    }

    public CustomException(Exception cause, Integer code) {
        super(cause);
        this.code = code;
    }
}
