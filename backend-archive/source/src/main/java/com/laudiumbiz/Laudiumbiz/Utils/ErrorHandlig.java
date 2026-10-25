/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
package com.laudiumbiz.Laudiumbiz.Utils;

import com.laudiumbiz.Laudiumbiz.Models.LocalIDModel.LocalId;
import com.laudiumbiz.Laudiumbiz.Exceptions.ApiKeyBlockedException;
import com.laudiumbiz.Laudiumbiz.Exceptions.CodeException;
import com.laudiumbiz.Laudiumbiz.Exceptions.CustomException;
import com.laudiumbiz.Laudiumbiz.Exceptions.InitialisatiionFailedException;
import com.laudiumbiz.Laudiumbiz.Exceptions.InvalidApiKeyException;
import com.laudiumbiz.Laudiumbiz.Exceptions.ItemNotFoundException;
import com.laudiumbiz.Laudiumbiz.Exceptions.LpoException;
import com.laudiumbiz.Laudiumbiz.Exceptions.StockUpdateFailed;
import com.laudiumbiz.Laudiumbiz.Exceptions.TpinException;
import com.laudiumbiz.Laudiumbiz.Utils.error.ErrorModel;
import com.laudiumbiz.Laudiumbiz.Utils.error.ServerError;
import com.google.gson.Gson;
import io.sentry.Sentry;
import java.util.Arrays;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

/**
 *
 * @author Chris
 */
@Service
public class ErrorHandlig {

    private static Gson g = new Gson();

    public CompletableFuture<ResponseEntity> getError(Exception e, LocalId local) {
        try {
            e.printStackTrace();
            if (e instanceof ApiKeyBlockedException apiBlocked) {
                Sentry.captureException(apiBlocked);
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "ApiKeyBlockedException");
                error.setCode(403);
                error.setMessage(apiBlocked.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof InvalidApiKeyException key) {
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "InvalidApiKeyException");
                error.setCode(401);
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof ItemNotFoundException key) {
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "ItemNotFoundException");
                error.setCode(400);
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof InitialisatiionFailedException key) {
                Sentry.captureException(key);
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "InitialisatiionFailedException");
                error.setCode(403);
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof StockUpdateFailed key) {
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "StockUpdateFailed");
                error.setCode(403);
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof TpinException key) {
                Sentry.captureException(key);
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "TpinException");
                error.setCode(key.getCode());
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof LpoException key) {
                Sentry.captureException(key);
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "LPO Error");
                error.setCode(key.getCode());
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof CodeException key) {
                Sentry.captureException(key);
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "Result Code Error");
                error.setCode(key.getCode());
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            } else if (e instanceof CustomException key) {
                String id = UUID.randomUUID().toString();
                ServerError error = new ServerError(id, "Custom Error");
                error.setCode(key.getCode());
                error.setMessage(key.getMessage());
                local.update(g.toJson(error), error.getCode() + "", error.getCode());
                return local.getResponse();
            }
            Sentry.captureException(e);
            StackTraceElement[] stack = e.getStackTrace();
            String message = e + "\n";
            message += Arrays.stream(stack)
                    .map(s -> "\t" + s.getClassName() + " Method: " + s.getMethodName() + " Line Number: " + s.getLineNumber() + "\n")
                    .collect(Collectors.joining());
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, e + "");
            error.setCode(500);
            error.setMessage(message);
            local.update(g.toJson(error), error.getCode() + "", error.getCode());
            return local.getResponse();
        } catch (Exception ex) {
            ErrorModel error = new ErrorModel();
            error.setCode(500 + "");
            error.setMessage("SQL SERVER IS OFFLINE CALL SUPPORT +260953029453");
            return CompletableFuture.completedFuture(ResponseEntity.status(500).body(g.toJson(error)));

        }
    }

    public ResponseEntity<Object> getError(Exception e) {
        e.printStackTrace();
        if (e instanceof ApiKeyBlockedException) {
            ApiKeyBlockedException apiBlocked = (ApiKeyBlockedException) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "ApiKeyBlockedException");
            error.setCode(403);
            error.setMessage(apiBlocked.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof InvalidApiKeyException) {
            InvalidApiKeyException key = (InvalidApiKeyException) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "InvalidApiKeyException");
            error.setCode(401);
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof ItemNotFoundException) {
            ItemNotFoundException key = (ItemNotFoundException) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "ItemNotFoundException");
            error.setCode(key.getCode()); // 404 from ItemNotFoundException.code field
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof InitialisatiionFailedException) {
            InitialisatiionFailedException key = (InitialisatiionFailedException) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "InitialisatiionFailedException");
            error.setCode(403);
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof StockUpdateFailed) {
            StockUpdateFailed key = (StockUpdateFailed) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "StockUpdateFailed");
            error.setCode(403);
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof TpinException) {
            TpinException key = (TpinException) e;
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "TpinException");
            error.setCode(key.getCode());
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        } else if (e instanceof CustomException key) {
            String id = UUID.randomUUID().toString();
            ServerError error = new ServerError(id, "Custom Error");
            error.setCode(key.getCode());
            error.setMessage(key.getMessage());
            return ResponseEntity.status(error.getCode()).body(error);
        }

        StackTraceElement[] stack = e.getStackTrace();
        String message = e + "\n";
        message += Arrays.stream(stack)
                .map(s -> "\t" + s.getClassName() + " Method: " + s.getMethodName() + " Line Number: " + s.getLineNumber() + "\n")
                .collect(Collectors.joining());
        String id = UUID.randomUUID().toString();
        ServerError error = new ServerError(id, e + "");
        error.setCode(500);
        error.setMessage(message);
        return ResponseEntity.status(error.getCode()).body(error);

    }

    public String getErrorString(Exception e) {
        StackTraceElement[] stack = e.getStackTrace();
        String message = e + "\n";
        message += Arrays.stream(stack)
                .map(s -> "\t" + s.getClassName() + " Method: " + s.getMethodName() + " Line Number: " + s.getLineNumber() + "\n")
                .collect(Collectors.joining());
        return "An Error Occured: " + message;
    }
}
