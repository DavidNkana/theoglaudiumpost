# Gemini API Authentication Setup Guide

**Project:** Laudiumbiz API  
**Migration:** Perplexity → Gemini 2.5 Pro  
**Date:** August 4, 2025

## Overview

This document provides instructions for setting up authentication for the Gemini API in the Laudiumbiz API project. The Gemini API uses Google Cloud's Application Default Credentials (ADC) for authentication, which requires a service account key file.

## Prerequisites

1. Google Cloud Platform account with Vertex AI API access
2. Permissions to create service accounts and keys
3. Google Cloud SDK installed (optional, but recommended)

## Authentication Setup

### 1. Create a Service Account

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "IAM & Admin" > "Service Accounts"
3. Click "Create Service Account"
4. Enter a name (e.g., "gemini-api") and description
5. Click "Create and Continue"
6. Assign the following roles:
   - Vertex AI User
   - Vertex AI Service Agent
7. Click "Continue" and then "Done"

### 2. Create a Service Account Key

1. In the Service Accounts list, find the service account you just created
2. Click the three dots menu and select "Manage keys"
3. Click "Add Key" > "Create new key"
4. Select "JSON" as the key type
5. Click "Create"
6. The key file will be downloaded to your computer

### 3. Configure the Application

#### Option 1: Using System Property (Current Implementation)

The current implementation sets the `GOOGLE_APPLICATION_CREDENTIALS` system property in the `initializeClient()` method of `GeminiService.java`:

```java
// Set the path to the service account key file for Application Default Credentials
System.setProperty("GOOGLE_APPLICATION_CREDENTIALS", "lyt-soft-service-account.json");
```

For this to work:
1. Place the downloaded service account key file in the project root directory
2. Rename it to `lyt-soft-service-account.json` or update the path in the code

#### Option 2: Using Environment Variable (Recommended)

A more secure approach is to set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable at the system level:

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account-key.json"
```

**Windows (Command Prompt):**
```cmd
set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\service-account-key.json
```

**Linux/macOS:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

Then, you can remove the system property setting from the code.

#### Option 3: Using Google Cloud SDK (For Development)

For local development, you can use the Google Cloud SDK to set up ADC:

```bash
gcloud auth application-default login
```

This will open a browser window for you to log in with your Google account. After logging in, ADC will be set up for your user account.

## Security Considerations

1. **Never commit service account key files to version control**
   - Add `*.json` to your `.gitignore` file
   - Consider using a secrets management solution for production

2. **Restrict service account permissions**
   - Follow the principle of least privilege
   - Only grant the permissions needed for the application

3. **Rotate keys regularly**
   - Create a new key and update the application
   - Delete the old key

4. **Use environment variables**
   - Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable instead of hardcoding the path
   - Consider using a secrets management solution for production

## Troubleshooting

If you encounter authentication issues:

1. **Check the service account key file**
   - Ensure the file exists at the specified path
   - Verify that the file contains valid JSON
   - Check that the service account has the necessary permissions

2. **Check environment variables**
   - Verify that the `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set correctly
   - Restart the application after setting the environment variable

3. **Check Google Cloud API access**
   - Ensure that the Vertex AI API is enabled for your project
   - Verify that the service account has the necessary permissions

## Conclusion

By following these instructions, you should be able to set up authentication for the Gemini API in the Laudiumbiz API project. If you encounter any issues, refer to the [Google Cloud Authentication documentation](https://cloud.google.com/docs/authentication) for more information.