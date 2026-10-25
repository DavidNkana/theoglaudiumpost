/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.LocalIDModel;

import com.laudiumbiz.Laudiumbiz.ServletInitializer;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 *
 * @author Chris
 */
@Data
@Valid
public class localidModel {

    @NotNull
    String localid;
}
