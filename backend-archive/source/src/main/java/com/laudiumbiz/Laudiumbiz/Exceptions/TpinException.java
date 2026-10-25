/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class TpinException extends RuntimeException {

    private int code = 400;

    public int getCode() {
        return code;
    }

    public TpinException(String Tpin) {
        super("Tpin is not Found: " + Tpin);
    }

    public TpinException() {
        super("Tpin Not Complete Result Bigger Than 1");
    }
}
