/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import lombok.Data;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Embedded data transfer object for payment information within ad requests
 *
 * TYPE: Request DTO (Nested/Embedded)
 *
 * USED BY: AdController - POST /api/v1/ads/create (nested within AdRequestDTO)
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
@Data
public class PaymentInfo {
    Double amount;
    String status;
    String reference;
    String paymentMethod;
    String customerName;
    String customerEmail;
}
