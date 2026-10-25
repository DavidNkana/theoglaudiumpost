# Gemini API Dependency Resolution

**Project:** Laudiumbiz API  
**Issue:** NoSuchMethodError in RetrySettings.Builder  
**Date:** August 4, 2025

## Issue Description

When attempting to use the Gemini API, the following error was encountered:

```
java.lang.NoSuchMethodError: 'com.google.api.gax.retrying.RetrySettings$Builder com.google.api.gax.retrying.RetrySettings$Builder.setInitialRetryDelayDuration(java.time.Duration)'
	at com.google.longrunning.stub.OperationsStubSettings$Builder.<clinit>(OperationsStubSettings.java:245) ~[gax-grpc-2.53.0.jar:2.53.0]
	at com.google.longrunning.stub.OperationsStubSettings.newBuilder(OperationsStubSettings.java:136) ~[gax-grpc-2.53.0.jar:2.53.0]
	at com.google.longrunning.stub.GrpcOperationsStub.create(GrpcOperationsStub.java:133) ~[gax-grpc-2.53.0.jar:2.53.0]
	at com.google.cloud.vertexai.api.stub.GrpcPredictionServiceStub.<init>(GrpcPredictionServiceStub.java:331) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.api.stub.GrpcPredictionServiceStub.<init>(GrpcPredictionServiceStub.java:317) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.api.stub.GrpcPredictionServiceStub.create(GrpcPredictionServiceStub.java:295) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.api.stub.PredictionServiceStubSettings.createStub(PredictionServiceStubSettings.java:319) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.api.PredictionServiceClient.<init>(PredictionServiceClient.java:427) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.api.PredictionServiceClient.create(PredictionServiceClient.java:409) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.VertexAI.getPredictionServiceClient(VertexAI.java:289) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
	at com.google.cloud.vertexai.generativeai.GenerativeModel.generateContentStream(GenerativeModel.java:1055) ~[google-cloud-vertexai-0.6.0.jar:0.6.0]
```

This error occurred when trying to call `model.generateContentStream(combinedContent)` in the `GeminiService` class.

## Root Cause Analysis

The error was caused by a version mismatch between the Google API Common Libraries (gax) dependencies:

1. The project had `com.google.api:gax:jar:2.48.0` explicitly defined in the pom.xml
2. But `google-cloud-vertexai:0.6.0` was pulling in `com.google.api:gax-grpc:jar:2.53.0` transitively

This version mismatch caused the `NoSuchMethodError` because the code was trying to use a method (`setInitialRetryDelayDuration`) that exists in gax-grpc 2.53.0 but was expecting it to be in the gax 2.48.0 library. The method signature had changed or the method was added in a newer version of gax.

## Solution

The solution was to update the gax dependency to match the version of gax-grpc that was being pulled in by google-cloud-vertexai:

```xml
<!-- Add Google API Common dependency -->
<dependency>
    <groupId>com.google.api</groupId>
    <artifactId>gax</artifactId>
    <version>2.53.0</version>
</dependency>
```

By updating the gax dependency from version 2.48.0 to version 2.53.0, we ensured that the method being called exists in the library that's loaded.

## Verification

A test was created to verify that the fix resolved the issue:

```java
@Test
void testRetrySettingsBuilderMethod() {
    // Try to create a RetrySettings.Builder and call the method that was causing NoSuchMethodError
    RetrySettings.Builder builder = RetrySettings.newBuilder();
    builder.setInitialRetryDelayDuration(Duration.ofMillis(100));
    
    // If we get here, the method was successfully called
    Assertions.assertNotNull(builder, "RetrySettings.Builder should be created successfully");
}
```

The test passed successfully, confirming that the method can now be called without any errors.

## Lessons Learned

1. **Version Compatibility**: When using multiple related dependencies, ensure that their versions are compatible with each other. In this case, the gax and gax-grpc versions needed to match.

2. **Transitive Dependencies**: Be aware of transitive dependencies that are pulled in by direct dependencies. In this case, google-cloud-vertexai was pulling in gax-grpc, which had a different version than the explicitly defined gax dependency.

3. **Error Analysis**: The `NoSuchMethodError` is a clear indicator of a version mismatch. When encountering this error, check the versions of all related dependencies.

4. **Testing**: Always create tests to verify that fixes for dependency issues actually resolve the problem. In this case, a simple test that calls the method that was previously causing the error was sufficient.

## Recommendations for Future Development

1. **Dependency Management**: Consider using a dependency management tool like Maven's `<dependencyManagement>` section to ensure consistent versions across related dependencies.

2. **Version Updates**: When updating a dependency, check for any related dependencies that might also need to be updated to maintain compatibility.

3. **Documentation**: Document any dependency version constraints or requirements to help future developers avoid similar issues.

4. **Testing**: Include tests that verify the functionality of critical dependencies, especially when they involve complex interactions between multiple libraries.