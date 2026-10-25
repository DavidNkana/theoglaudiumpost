/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class InitialisatiionFailedException extends RuntimeException {

    private int code = 400;

    public int getCode() {
        return code;
    }

    public InitialisatiionFailedException(String message) {
        super(message);
    }

    // Additional constructors for including causes or other information can be added here
}
