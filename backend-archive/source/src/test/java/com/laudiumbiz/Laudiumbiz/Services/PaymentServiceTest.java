package com.laudiumbiz.Laudiumbiz.Services;

import com.laudiumbiz.Laudiumbiz.Models.DB.Ad;
import com.laudiumbiz.Laudiumbiz.Models.DB.Media;
import com.laudiumbiz.Laudiumbiz.Models.DB.Payment;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentRequestDTO;
import com.laudiumbiz.Laudiumbiz.Models.DTO.PaymentResponseDTO;
import com.laudiumbiz.Laudiumbiz.Repositories.AdRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.MediaRepository;
import com.laudiumbiz.Laudiumbiz.Repositories.PaymentRepository;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.MockedStatic;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for PaymentService's create/update/delete payment logic — the logic
 * that previously lived in the broken {@code new PaymentLogic()} (whose @Autowired
 * repositories were always null). These tests prove the repositories are now
 * genuinely invoked and the behavior is correct.
 *
 * PaymentRequestDTO has package-private fields, so requests are built with a real
 * instance and ReflectionTestUtils.setField (the class cannot be Mockito-mocked on
 * this JDK, and only its date field has a setter).
 */
class PaymentServiceTest {

    private PaymentRepository paymentRepository;
    private AdRepository adRepository;
    private MediaRepository mediaRepository;
    private PaymentService service;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        adRepository = mock(AdRepository.class);
        mediaRepository = mock(MediaRepository.class);
        service = new PaymentService(paymentRepository, adRepository, mediaRepository);
    }

    private static PaymentRequestDTO request(Object... fieldValuePairs) {
        PaymentRequestDTO dto = new PaymentRequestDTO();
        for (int i = 0; i < fieldValuePairs.length; i += 2) {
            ReflectionTestUtils.setField(dto, (String) fieldValuePairs[i], fieldValuePairs[i + 1]);
        }
        return dto;
    }

    // ---------- updatePaymentRequest ----------

    @Test
    void updatePaymentRequest_whenFound_savesAndReturnsMappedDto() {
        Payment existing = new Payment();
        existing.setId(5);
        when(paymentRepository.findById(5)).thenReturn(Optional.of(existing));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponseDTO result = service.updatePaymentRequest(5,
                request("status", "paid", "item_name", "Banner spot"));

        assertNotNull(result);
        assertEquals("paid", result.getStatus());
        assertEquals("Banner spot", result.getItemName());
        verify(paymentRepository).save(existing);
    }

    @Test
    void updatePaymentRequest_whenNotFound_returnsNullAndNeverSaves() {
        when(paymentRepository.findById(99)).thenReturn(Optional.empty());

        PaymentResponseDTO result = service.updatePaymentRequest(99, request());

        assertNull(result);
        verify(paymentRepository, never()).save(any());
    }

    // ---------- deletePaymentRequest ----------

    @Test
    void deletePaymentRequest_whenFound_setsDeletedStatusAndReturnsDto() {
        Payment existing = new Payment();
        existing.setId(3);
        existing.setStatus("active");
        when(paymentRepository.findById(3)).thenReturn(Optional.of(existing));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponseDTO result = service.deletePaymentRequest(3);

        assertNotNull(result);
        assertEquals("DELETED", result.getStatus());
        assertEquals("DELETED", existing.getStatus());
        verify(paymentRepository).save(existing);
    }

    @Test
    void deletePaymentRequest_whenNotFound_returnsNullAndNeverSaves() {
        when(paymentRepository.findById(7)).thenReturn(Optional.empty());

        PaymentResponseDTO result = service.deletePaymentRequest(7);

        assertNull(result);
        verify(paymentRepository, never()).save(any());
    }

    // ---------- createPaymentRequest ----------

    @Test
    void createPaymentRequest_withNoImages_savesPaymentAndAdNoMedia() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(1);
            return p;
        });
        when(adRepository.save(any(Ad.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponseDTO result = service.createPaymentRequest(
                request("status", "pending", "item_name", "Promo", "images", List.of()));

        assertNotNull(result);
        assertEquals("Promo", result.getItemName());
        verify(paymentRepository).save(any(Payment.class));
        verify(adRepository).save(any(Ad.class));
        verify(mediaRepository, never()).save(any());
    }

    @Test
    void createPaymentRequest_withCoverImage_savesMediaAndSetsImageIdOnAd() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> {
            Payment p = inv.getArgument(0);
            p.setId(1);
            return p;
        });
        Media saved = new Media();
        saved.setId(42);
        when(mediaRepository.save(any(Media.class))).thenReturn(saved);
        when(adRepository.save(any(Ad.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentResponseDTO result = service.createPaymentRequest(
                request("images", List.of(), "image", "base64-cover"));

        assertNotNull(result);
        ArgumentCaptor<Ad> adCaptor = ArgumentCaptor.forClass(Ad.class);
        verify(mediaRepository).save(any(Media.class));
        verify(adRepository).save(adCaptor.capture());
        assertEquals(42, adCaptor.getValue().getImage_id().intValue());
    }

    @Test
    void createPaymentRequest_withBulkImages_savesEachMediaAndWritesAdImageRows() {
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(adRepository.save(any(Ad.class))).thenAnswer(inv -> {
            Ad a = inv.getArgument(0);
            a.setId(10);
            return a;
        });
        AtomicInteger mediaId = new AtomicInteger(100);
        when(mediaRepository.save(any(Media.class))).thenAnswer(inv -> {
            Media m = inv.getArgument(0);
            m.setId(mediaId.incrementAndGet());
            return m;
        });

        try (MockedStatic<LaudiumJdbcUtil> jdbc = mockStatic(LaudiumJdbcUtil.class)) {
            PaymentResponseDTO result = service.createPaymentRequest(
                    request("images", List.of("img-a", "img-b")));

            assertNotNull(result);
            verify(mediaRepository, times(2)).save(any(Media.class));
            // One DELETE for the ad's existing image rows...
            jdbc.verify(() -> LaudiumJdbcUtil.getInsertRawPrepared(
                    eq("DELETE FROM ad_images WHERE ad_id = ?"), eq(10)));
            // ...then one INSERT per saved media id (101, 102).
            jdbc.verify(() -> LaudiumJdbcUtil.getInsertRawPrepared(
                    eq("INSERT INTO ad_images (ad_id, image_id) VALUES (?, ?)"), eq(10), eq(101)));
            jdbc.verify(() -> LaudiumJdbcUtil.getInsertRawPrepared(
                    eq("INSERT INTO ad_images (ad_id, image_id) VALUES (?, ?)"), eq(10), eq(102)));
        }
    }
}
