/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Exceptions;

/**
 *
 * @author User
 */
public class CodeException extends Exception {

    int code;
    String description;

    public CodeException(String resultCode) {
        super("Unknown Response Code : " + resultCode);
        this.code = 400;
        this.description = "Unknown Response Code : " + resultCode;
    }

    public int getCode() {
        return code;
    }

    public void setCode(int code) {
        this.code = code;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

}
