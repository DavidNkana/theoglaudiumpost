package com.laudiumbiz.Laudiumbiz.Controllers;

/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
/**
 * PURPOSE: Global exception handler for the application, providing centralized error handling and validation error formatting
 *
 * ENDPOINTS: N/A (Exception handler for all endpoints)
 * - Handles HttpMessageNotReadableException - JSON parsing errors
 * - Handles ConstraintViolationException - Validation errors
 * - Handles MethodArgumentTypeMismatchException - Type mismatch errors
 * - Handles ConversionFailedException - Conversion errors
 * - Handles MethodArgumentNotValidException - Method argument validation errors
 *
 * DEPENDENCIES:
 * - ErrorMessage: Custom error message structure
 * - Spring validation framework
 *
 * @author Chris
 */
import com.laudiumbiz.Laudiumbiz.Utils.error.ErrorMessage;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import jakarta.annotation.PostConstruct;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.validation.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@ControllerAdvice
public class CustomGlobalExceptionHandler {

    
    
    @PostConstruct
    public void init(){
        System.out.println("Glocbal Exception Handler");
    }
    
    // Method to create error responses, reused from your existing setup
    private ErrorMessage createErrorResponse(String message, int code) {
        return new ErrorMessage(message, code);
    }

    // Add a new exception handler for HttpMessageNotReadableException
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorMessage> handleHttpMessageNotReadableException(HttpMessageNotReadableException ex) {
        Throwable mostSpecificCause = ex.getMostSpecificCause();

        // Check if the cause is an InvalidFormatException (common for type mismatches in JSON parsing)
        if (mostSpecificCause instanceof InvalidFormatException) {
            InvalidFormatException invalidFormatException = (InvalidFormatException) mostSpecificCause;
            String error = String.format("JSON parse error: Cannot deserialize value of type `%s` from String \"%s\": not a valid `%s` value",
                    invalidFormatException.getTargetType().getSimpleName(),
                    invalidFormatException.getValue(),
                    invalidFormatException.getTargetType().getSimpleName());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(createErrorResponse(error, HttpStatus.BAD_REQUEST.value()));
        }

        // Generic error message for other types of parsing errors
        String errorMessage = "JSON parse error: " + (mostSpecificCause == null ? ex.getMessage() : mostSpecificCause.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(errorMessage, HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorMessage> handleValidationExceptions(ConstraintViolationException ex) {
        Set<ConstraintViolation<?>> violations = ex.getConstraintViolations();
        StringBuilder errorMessage = new StringBuilder();
        for (ConstraintViolation<?> violation : violations) {
            errorMessage.append(extractFieldName(violation.getPropertyPath())).append(": ")
                    .append(violation.getMessage()).append("; ");
        }
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(errorMessage.toString(), 400));
    }

    // Handler for MethodArgumentTypeMismatchException
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorMessage> handleTypeMismatchException(MethodArgumentTypeMismatchException ex) {
        String error = String.format("The parameter '%s' should be of type %s",
                ex.getName(), ex.getRequiredType().getSimpleName());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(error, HttpStatus.BAD_REQUEST.value()));
    }

    // Optionally, handle ConversionFailedException for cases where @RequestParam conversion fails
    @ExceptionHandler(ConversionFailedException.class)
    public ResponseEntity<ErrorMessage> handleConversionFailedException(ConversionFailedException ex) {
        String error = String.format("Failed to convert value: %s", ex.getMessage());

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(createErrorResponse(error, HttpStatus.BAD_REQUEST.value()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        BindingResult result = ex.getBindingResult();
        List<FieldError> fieldErrors = result.getFieldErrors();

        Map<String, List<String>> fieldErrorsMap = new HashMap<>();
        for (FieldError fieldError : fieldErrors) {
            String field = fieldError.getField();
            String defaultMessage = fieldError.getDefaultMessage();

            if (!fieldErrorsMap.containsKey(field)) {
                fieldErrorsMap.put(field, new ArrayList<>());
            }
            fieldErrorsMap.get(field).add(defaultMessage);
        }

        Map<String, Object> errorDetails = new HashMap<>();
        errorDetails.put("message", "Validation failed: '" + String.join("'; '", fieldErrorsMap.keySet()) + "'.");
        errorDetails.put("code", HttpStatus.BAD_REQUEST.value());
        Map<String, Object> fields = new HashMap<>();
        fields.put("fields", fieldErrorsMap);
        errorDetails.put("details", fields);

        Map<String, Object> errorWrapper = new HashMap<>();
        errorWrapper.put("error", errorDetails);

        return ResponseEntity.badRequest().body(errorWrapper);
    }

    private String extractFieldName(Path propertyPath) {
        String fieldName = "";
        for (Path.Node node : propertyPath) {
            fieldName = node.getName();
        }
        return fieldName;
    }
    
    

}
