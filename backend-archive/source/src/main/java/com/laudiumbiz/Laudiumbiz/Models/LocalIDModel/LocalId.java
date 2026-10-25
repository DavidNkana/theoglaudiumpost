/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package com.laudiumbiz.Laudiumbiz.Models.LocalIDModel;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.gson.JsonPrimitive;
import com.laudiumbiz.Laudiumbiz.Utils.CustomRs;
import com.laudiumbiz.Laudiumbiz.Utils.LaudiumJdbcUtil;
import com.laudiumbiz.Laudiumbiz.Utils.Utils;
import com.laudiumbiz.Laudiumbiz.Utils.error.ErrorMessage;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import lombok.Data;
import org.springframework.http.ResponseEntity;

/**
 *
 * @author Chris
 */
@Data
public class LocalId {

    String LocalID;
    String sentRoute;
    transient String jsonPayload;
    transient String responseString;
    JsonElement response;
    transient Object sent;
    transient Integer httpCode;
    String code;
    String date;
    boolean processed;
    static Gson g = Utils.getGson();

    public JsonElement getResponseElement() {
        return response;
    }

    private static JsonElement processElement(JsonElement element) {
        if (element.isJsonArray()) {
            JsonArray newArray = new JsonArray();
            element.getAsJsonArray().forEach(item -> newArray.add(processElement(item)));
            return newArray;
        } else if (element.isJsonObject()) {
            JsonObject newObject = new JsonObject();
            for (Map.Entry<String, JsonElement> entry : element.getAsJsonObject().entrySet()) {
                newObject.add(entry.getKey(), processElement(entry.getValue()));
            }
            return newObject;
        } else if (element.isJsonPrimitive()) {
            return processPrimitive(element.getAsJsonPrimitive());
        }
        return element;
    }

    private static JsonElement processPrimitive(JsonPrimitive value) {
        if (value.isNumber()) {
            double num = value.getAsDouble();
            if (num == Math.floor(num)) {
                return new JsonPrimitive((long) num);
            }
            return new JsonPrimitive(num);
        }
        return value;
    }

    public static LocalId getLocalId(String localId) {
        try {
            String q = "SELECT * FROM `querylogid` where localid = ?";
            try (CustomRs rs = LaudiumJdbcUtil.getSelectRawPrepared(q, localId)) {
                if (rs.next()) {
                    //LocalID, sentRoute, jsonPayload, response, code, date, processed, ApiKey, HttpCode
                    LocalId local = new LocalId();
                    local.setLocalID(localId);
                    local.setSent(rs.getString("sentRoute"));
                    local.setResponseString(rs.getString("response"));
                    local.setCode(rs.getString("code"));
                    local.setDate(rs.getString("date"));
                    local.setHttpCode(rs.getInt("HttpCode"));
                    if (local.getResponseString() != null) {
                        JsonElement jsonElement = JsonParser.parseString(local.getResponseString());
                        local.setResponse(processElement(jsonElement));
                    }
                    local.setProcessed(rs.getBoolean("processed"));
                    return local;
                } else {
                    return null;
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public LocalId create(String localId, String sentRoute, String jsonPayload) {
        try {

            String q = "insert into `querylogid` (LocalID, sentRoute, jsonPayload) values (?,?,?)";
            LaudiumJdbcUtil.getInsertRawPrepared(q, localId, sentRoute, jsonPayload);
            return LocalId.getLocalId(localId);
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }

    public void update(String body, String zraCode, Integer HttpsCode) throws Exception {
        String q = "update `querylogid` set response = ?, code= ?, httpCode =?, processed =? where LocalID = ?";
        System.err.println(body);
        LaudiumJdbcUtil.getInsertRawPrepared(q, body, zraCode, HttpsCode + "", "1", LocalID);
        this.httpCode = HttpsCode;
        responseString = body;
        if (responseString != null) {
            JsonElement jsonElement = JsonParser.parseString(responseString);
            response = response = processElement(jsonElement);
        }
        this.code = zraCode;
        this.processed = true;
    }

    public void setNotDone(String body) throws Exception {
        String q = "update `querylogid` set response = ?, code= ?, httpCode =?, processed =? where LocalID = ?";
        System.err.println(body);
        LaudiumJdbcUtil.getInsertRawPrepared(q, body, "102", 200 + "", "0", LocalID);
        this.httpCode = 200;
        responseString = body;
        if (responseString != null) {
            JsonElement jsonElement = JsonParser.parseString(responseString);
            response = response = processElement(jsonElement);
        }
        this.code = "102";
        this.processed = false;
    }

    public CompletableFuture<ResponseEntity> getResponse() {
        if (httpCode != null && httpCode != 0) {
            var res = ResponseEntity.status(this.httpCode).body(g.toJson(this));
            return CompletableFuture.completedFuture(res);
        } else {
            ErrorMessage error = new ErrorMessage();
            error.setCode(500);
            error.setMessage("PENDINNG");
            var res = ResponseEntity.status(500).body(g.toJson(this));
            return CompletableFuture.completedFuture(res);
        }
    }

}
