/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class InvalidApiKeyException extends RuntimeException {

    private int code = 401;

    public int getCode() {
        return code;
    }

    public InvalidApiKeyException() {
        super("API KEY NOT FOUND, MAIL info@chrilantech.com for API Key");
    }

    public InvalidApiKeyException(String message) {
        super(message);
    }

}
