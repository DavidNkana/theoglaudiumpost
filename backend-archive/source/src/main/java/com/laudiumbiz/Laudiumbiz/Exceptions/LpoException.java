/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class LpoException extends RuntimeException {

    private int code = 500;

    public int getCode() {
        return code;
    }

    public LpoException(String LPO) {
        super("LPO is not Valid: " + LPO + " Len Must be 10");
    }

    public LpoException() {
        super("Tpin Not Complete Result Bigger Than 1");
    }
}
