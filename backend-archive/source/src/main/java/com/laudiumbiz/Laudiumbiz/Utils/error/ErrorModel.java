/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils.error;

import com.google.gson.Gson;
import lombok.Data;

/**
 *
 * @author Chris
 */
@Data
public class ErrorModel {

    transient static Gson g = new Gson();
    String Message;
    String Code;

    public String toJson() {
        return g.toJson(this);
    }
}
