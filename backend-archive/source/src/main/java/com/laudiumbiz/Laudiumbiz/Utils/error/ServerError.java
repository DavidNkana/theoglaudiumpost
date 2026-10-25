/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils.error;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 *
 * @author Chris
 */
@Data
@AllArgsConstructor
public class ServerError extends ErrorMessage {

    String id;
    String type;
}
