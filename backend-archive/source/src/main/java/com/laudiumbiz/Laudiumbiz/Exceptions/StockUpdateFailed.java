/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author Chris
 */
public class StockUpdateFailed extends RuntimeException {

    private int code = 500;

    public int getCode() {
        return code;
    }

    public StockUpdateFailed() {
        super("Items Not Found");
    }

    public StockUpdateFailed(String Plu, Double newQty) {
        super("Item level not updated: " + Plu + ", New Qty: " + newQty);
    }

}
