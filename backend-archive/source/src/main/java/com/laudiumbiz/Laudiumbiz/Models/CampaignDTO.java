/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models;

import java.time.LocalDateTime;
import lombok.Data;

/**
 *
 * @author Imran
 */
@Data
public class CampaignDTO {

    private String name;
    private String transactionRef;
    private Integer businessId;
    private Boolean isRecurring;
    private Boolean isDeleted;
    private Status status;
    private PaymentStatus paymentStatus;
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    public enum Status {
        pending, active, completed, cancelled
    }

    public enum PaymentStatus {
        pending, paid, failed
    }
}
