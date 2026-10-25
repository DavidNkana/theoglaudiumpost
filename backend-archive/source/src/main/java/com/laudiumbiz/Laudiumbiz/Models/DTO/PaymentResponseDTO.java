/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.DTO;

import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;

/**
 *
 * @author issai
 */

/**
 * PURPOSE: Data transfer object for returning payment transaction details and status
 *
 * TYPE: Response DTO
 *
 * USED BY: PaymentController - GET /api/v1/payments/{paymentId}/status, POST /api/v1/payments/create, PUT /api/v1/payments/{id}, DELETE /api/v1/payments/{id}
 *
 * @modified 2025-12-09 - Added purpose documentation
 */
public class PaymentResponseDTO {

    String paymentId;

    String pfPaymentId;

    String userId;

    String status;

    Double amountGross;

    Double amountFee;

    Double amountNet;

    String currency;

    String itemName;

    String itemDescription;

    String customerEmail;

    String customerName;

    String paymentMethod;

    String eftReference;

    Double eftAmount;

    // Constructor mapping Payment -> DTO
    public PaymentResponseDTO(Payment payment) {
        this.paymentId = payment.getPayment_id();
        this.pfPaymentId = payment.getPf_payment_id();
        this.userId = payment.getUser_id() != null ? payment.getUser_id().toString() : null;
        this.status = payment.getStatus();
        this.amountGross = payment.getAmount_gross();
        this.amountFee = payment.getAmount_fee();
        this.amountNet = payment.getAmount_net();
        this.currency = payment.getCurrency();
        this.itemName = payment.getItem_name();
        this.itemDescription = payment.getItem_description();
        this.customerEmail = payment.getCustomer_email();
        this.customerName = payment.getCustomer_name();
        this.paymentMethod = payment.getPayment_method();
        this.eftReference = payment.getEft_reference();
        this.eftAmount = payment.getEft_amount();
    }

    public String getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(String paymentId) {
        this.paymentId = paymentId;
    }

    public String getPfPaymentId() {
        return pfPaymentId;
    }

    public void setPfPaymentId(String pfPaymentId) {
        this.pfPaymentId = pfPaymentId;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Double getAmountGross() {
        return amountGross;
    }

    public void setAmountGross(Double amountGross) {
        this.amountGross = amountGross;
    }

    public Double getAmountFee() {
        return amountFee;
    }

    public void setAmountFee(Double amountFee) {
        this.amountFee = amountFee;
    }

    public Double getAmountNet() {
        return amountNet;
    }

    public void setAmountNet(Double amountNet) {
        this.amountNet = amountNet;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getItemDescription() {
        return itemDescription;
    }

    public void setItemDescription(String itemDescription) {
        this.itemDescription = itemDescription;
    }

    public String getCustomerEmail() {
        return customerEmail;
    }

    public void setCustomerEmail(String customerEmail) {
        this.customerEmail = customerEmail;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public void setEftReference(String eftReference) {
        this.eftReference = eftReference;
    }

    public void setEftAmount(Double eftAmount) {
        this.eftAmount = eftAmount;
    }

}
