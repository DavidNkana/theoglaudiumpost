package com.laudiumbiz.Laudiumbiz.Utils.error;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */

import lombok.Getter;
import lombok.Setter;

/**
 *
 * @author Chris
 */
@Setter
@Getter
public class ErrorMessage {

  // Getters and setters
  private String message;
    private int code;

    public ErrorMessage() {
    }

    public ErrorMessage(String message, int code) {
        this.message = message;
        this.code = code;
    }

}
