/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class ApiKeyBlockedException extends RuntimeException {

    private int code = 403;

    public int getCode() {
        return code;
    }

    public ApiKeyBlockedException() {
        super("API key is blocked, please whatsapp +260953029453 or mail info@chrilantech.com");
    }

    public ApiKeyBlockedException(String message) {
        super(message);
    }

    // Additional constructors for including causes or other information can be added here
}
