/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils.error;

import com.laudiumbiz.Laudiumbiz.Utils.ErrorHandlig;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.google.gson.Gson;

/**
 *
 * @author Chris
 */
public abstract class Controller {

    public Gson g = Utils.getGson();

    public ErrorHandlig error = new ErrorHandlig();

}
