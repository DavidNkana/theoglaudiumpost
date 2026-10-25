# Gson Date/Time Adapters

## Overview

This document provides information about the date/time adapters implemented for Gson in the LaudiumbizAPI project.

## Changes Made

1. Added a new `LocalDateAdapter` class to handle serialization and deserialization of `LocalDate` objects
2. Updated the `Utils.getGson()` method to register the new adapter
3. Created a test class to verify the functionality

## Implementation Details

### LocalDateAdapter

The `LocalDateAdapter` class extends `TypeAdapter<LocalDate>` and provides custom serialization and deserialization for `LocalDate` objects. It uses the ISO_LOCAL_DATE format (e.g., "2025-08-02").

```java
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
```

### Utils.getGson() Update

The `Utils.getGson()` method was updated to register the new adapter:

```java
private static Gson g = new GsonBuilder()
        .serializeSpecialFloatingPointValues()
        .registerTypeAdapter(LocalDateTime.class, new LocalDateTimeAdapter())
        .registerTypeAdapter(LocalDate.class, new LocalDateAdapter())
        .create();
```

## Testing

A test class `DateAdapterTest` was created to verify the functionality of both adapters. The test:

1. Creates a test object with both `LocalDate` and `LocalDateTime` fields
2. Serializes the object to JSON
3. Deserializes the JSON back to an object
4. Verifies that the deserialized object has the correct values

To run the test:

```bash
mvn test -Dtest=DateAdapterTest
```

Expected output:

```
Serialized JSON: {"date":"2025-08-02","dateTime":"2025-08-02T22:14:00","name":"Test Object"}
```

The test should pass, confirming that both `LocalDate` and `LocalDateTime` are properly serialized and deserialized.

## Usage

No changes are needed in your code to use these adapters. Simply continue using `Utils.getGson()` to get a properly configured Gson instance:

```java
Gson gson = Utils.getGson();
String json = gson.toJson(yourObject);
YourObject deserializedObject = gson.fromJson(json, YourObject.class);
```

The adapters will automatically handle any `LocalDate` or `LocalDateTime` fields in your objects.