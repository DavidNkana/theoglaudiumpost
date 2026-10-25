/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class ItemNotFoundException extends RuntimeException {

    private int code = 404;

    public int getCode() {
        return code;
    }

    public ItemNotFoundException() {
        super("Items Not Found");
    }

    public ItemNotFoundException(String message) {
        super(message);
        this.code = 404;
    }

    public ItemNotFoundException(String Plu, String Description) {
        super("Item Not Created use smartinv/product/create to Register product Product: " + Plu + ", Description: " + Description);
    }

}
