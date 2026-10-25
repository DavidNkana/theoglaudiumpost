/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Utils;

/**
 *
 * @author Junie
 */
import com.google.gson.TypeAdapter;
import com.google.gson.stream.JsonReader;
import com.google.gson.stream.JsonWriter;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

public class LocalDateAdapter extends TypeAdapter<LocalDate> {

    private static final DateTimeFormatter formatter = DateTimeFormatter.ISO_LOCAL_DATE;

    @Override
    public void write(JsonWriter out, LocalDate value) throws IOException {
        if (value == null) {
            out.nullValue();
        } else {
            out.value(value.format(formatter));
        }
    }

    @Override
    public LocalDate read(JsonReader in) throws IOException {
        String dateStr = in.nextString();
        if (dateStr == null || dateStr.isEmpty()) {
            return null;
        }
        return LocalDate.parse(dateStr, formatter);
    }
}