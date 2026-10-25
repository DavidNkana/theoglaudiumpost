/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.Locale;
import java.util.UUID;
import org.apache.commons.io.FileUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 *
 * @author Chris
 */
public class Utils {

    public static String getDateVscd() {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
        return now.format(formatter);
    }

    public static String getTimeVscd() {
        LocalDateTime now = LocalDateTime.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("HHmmss");
        return now.format(formatter);
    }

    public static String getDateVscdShort() {
        LocalDate currentDate = LocalDate.now();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyyMMdd");
        return currentDate.format(formatter);
    }

    public File MovePDF(String From, String To) {
        try {
            return moveFile(From + ".pdf", To + ".pdf");
        } catch (IOException e) {
            e.printStackTrace();
        }
        return null;
    }

    public File moveFile(String from, String to) throws IOException {
        try (BufferedInputStream in = new BufferedInputStream(new FileInputStream(from)); BufferedOutputStream out = new BufferedOutputStream(new FileOutputStream(to))) {
            byte[] buffer = new byte[4000];
            int length;
            while ((length = in.read(buffer)) != -1) {
                out.write(buffer, 0, length);
            }
            File file = new File(to);
            return file;
        } catch (IOException e) {
            throw e;
        }
    }

    static NumberFormat f = NumberFormat.getNumberInstance(Locale.US);
    @FunctionalInterface
    public interface UncheckedFunction<T, R> {
        R apply(T t) throws Exception;
    }

    public static <T,R> Function<T,R> uncheck(UncheckedFunction<T,R> func){
      return (T arg)->{
        try{
          return func.apply(arg);
        } catch (Exception e) {
          throw new RuntimeException(e.getMessage(),e);
        }
      };
    }
    public interface UncheckedSupplier<R> extends Supplier<R> {

      R getValue() throws Exception;

      @Override
      default R get(){
        try {
          return getValue();
        }catch (Exception e){
          throw new RuntimeException(e.getMessage(),e);
        }
      }
    }
  public static <R> Supplier<R> uncheck(UncheckedSupplier<R> func){
    return ()->{
      try{
        return func.get();
      } catch (Exception e) {
        throw new RuntimeException(e.getMessage(),e);
      }
    };
  }
    public static String formatInv(double x) {
        f.setMinimumFractionDigits(2);
        f.setMaximumFractionDigits(2);
        BigDecimal fin = BigDecimal.valueOf(x);
        double total = fin.setScale(2, RoundingMode.HALF_UP).doubleValue();
        return f.format(total);

    }

    private static Gson g = new GsonBuilder()
            .serializeSpecialFloatingPointValues()
            .registerTypeAdapter(LocalDateTime.class, new LocalDateTimeAdapter())
            .registerTypeAdapter(LocalDate.class, new LocalDateAdapter())
            .create();

    public static Gson getGson() {
        return g;
    }

    public static String formatNoRound(double x) {
        f.setMinimumFractionDigits(0);
        f.setMaximumFractionDigits(2);
        BigDecimal fin = BigDecimal.valueOf(x);
        double total = fin.setScale(2, RoundingMode.HALF_UP).doubleValue();
        return f.format(total);

    }

    String fileSeparator = System.getProperty("file.separator");
    String basePath = fileSeparator + "opt" + fileSeparator + "tomcat"
            + fileSeparator + "temp" + fileSeparator;

    public File decodeBase64(String encoded) throws Exception {
        byte[] fileByte = Base64.getMimeDecoder().decode(encoded);
        String name = UUID.randomUUID().toString();
        try (OutputStream stream = new FileOutputStream(basePath + name + ".png")) {
            stream.write(fileByte);
        }
        return new File(basePath + name + ".png");
    }

    public String encodeBase64(File f) throws Exception {
        byte[] fileContent = FileUtils.readFileToByteArray(f);
        return Base64.getMimeEncoder().encodeToString(fileContent);
    }

    public enum fileType {
        PDF, CSV, Excel
    }

    public static ResponseEntity<?> returnFileSpring(File f, String Name, fileType file) throws Exception {
        byte[] fileContent = Files.readAllBytes(f.toPath());
        HttpHeaders headers = new HttpHeaders();
        switch (file) {
            case PDF ->
                headers.setContentType(MediaType.APPLICATION_PDF);
            case CSV ->
                headers.setContentType(MediaType.valueOf("text/csv"));
            case Excel ->
                headers.setContentType(MediaType.APPLICATION_XML);
            default -> {
                System.out.println("Unsupported file type");
                // Handle unsupported file types here
                throw new Exception("Unsupported file type in file return");
            }
        }
        headers.setContentDispositionFormData(Name, Name);
        headers.setCacheControl(
                "must-revalidate, post-check=0, pre-check=0");
        return new ResponseEntity<>(fileContent, headers, HttpStatus.OK);
    }

    
    /**
     * Formats a string by splitting it with the provided separator,
     * capitalizing the first letter of each word, and joining with spaces.
     *
     * Example: formatSeparatedString("my_cool_ad", "_") -> "My Cool Ad"
     *
     * @param input     The input string (e.g., "my_cool_ad")
     * @param separator The separator (e.g., "_")
     * @return Formatted string (e.g., "My Cool Ad")
     */
    public static String formatSeparatedString(String input, String separator) {
        if (input == null || input.isEmpty()) {
            return "";
        }

        String[] words = input.split(separator);
        StringBuilder formatted = new StringBuilder();

        for (String word : words) {
            if (!word.isEmpty()) {
                formatted.append(Character.toUpperCase(word.charAt(0)))
                         .append(word.substring(1).toLowerCase())
                         .append(" ");
            }
        }

        return formatted.toString().trim();
    }
    
    
    public static String getTimeAgo(LocalDateTime scheduledFor) {
        ZonedDateTime now = ZonedDateTime.now(ZoneId.systemDefault());
        ZonedDateTime scheduledTime = scheduledFor.atZone(ZoneId.systemDefault());

        Duration duration = Duration.between(scheduledTime, now);

        long seconds = duration.getSeconds();

        if (seconds < 60) return "just now";
        if (seconds < 3600) return (seconds / 60) + " minute(s) ago";
        if (seconds < 86400) return (seconds / 3600) + " hour(s) ago";
        if (seconds < 604800) return (seconds / 86400) + " day(s) ago";
        if (seconds < 2592000) return (seconds / 604800) + " week(s) ago";
        if (seconds < 31536000) return (seconds / 2592000) + " month(s) ago";

        return (seconds / 31536000) + " year(s) ago";
    }

}
