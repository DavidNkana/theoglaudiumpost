/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils;

/**
 *
 * @author Chris
 */
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

public class LocalDateTimeAdapter extends TypeAdapter<LocalDateTime> {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ISO_DATE_TIME;

    @Override
    public void write(JsonWriter out, LocalDateTime value) throws IOException {
        if (value == null) {
            out.nullValue();
        } else {
            // Convert LocalDateTime to UTC and format as ISO 8601 with 'Z' timezone
            out.value(value.atZone(ZoneOffset.UTC).format(formatter));
        }
    }

    @Override
    public LocalDateTime read(JsonReader in) throws IOException {
        String dateTimeStr = in.nextString();
        if (dateTimeStr == null || dateTimeStr.isEmpty()) {
            return null;
        }
        try {
            // Parse the ISO 8601 string with timezone information
            if (dateTimeStr.endsWith("Z")) {
                // Parse as ZonedDateTime and convert to LocalDateTime
                ZonedDateTime zdt = ZonedDateTime.parse(dateTimeStr);
                return zdt.toLocalDateTime();
            } else {
                // Try to parse as LocalDateTime
                return LocalDateTime.parse(dateTimeStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
            }
        } catch (Exception e) {
            // Fallback to basic parsing
            return LocalDateTime.parse(dateTimeStr);
        }
    }
}
