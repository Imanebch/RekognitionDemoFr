# Amazon Rekognition Demo

This project is a web-based demo of Amazon Rekognition, showcasing how to recognize and compare faces using a private celebrity database. It utilizes AWS services like Rekognition and S3 to analyze images in real-time from a user's webcam.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Technologies Used](#technologies-used)
- [Setup and Installation](#setup-and-installation)
- [How to Use](#how-to-use)
- [AWS Configuration](#aws-configuration)
- [License](#license)

## Features

- Real-time face recognition using Amazon Rekognition.
- A private celebrity database stored on AWS S3 for matching.
- Stream video from a user's webcam.
- Capture images and analyze facial attributes like gender, age range, emotions, and more.
- Display recognition results with matching percentages.
- Fully responsive web design using Bootstrap.

## Project Structure

. ├── index.html # Main HTML file with Bootstrap layout and UI components ├── script.js # JavaScript file that handles AWS Rekognition, video streaming, and image processing └── Config # Configuration file (not accessible here, possibly for additional AWS settings)

## Technologies Used

- **HTML5**: Structure of the web page.
- **Bootstrap 4**: For responsive layout and styling.
- **JavaScript**: Handles AWS Rekognition integration, video streaming, and real-time image processing.
- **jQuery**: DOM manipulation and event handling.
- **AWS SDK for JavaScript**: Used for Rekognition and S3 services.
- **Amazon Rekognition**: Recognizes and matches faces from images.
- **Amazon S3**: Stores the private celebrity database.

## Setup and Installation

### Prerequisites

- Node.js (for local development)
- AWS Account with Rekognition and S3 configured
- Browser that supports WebRTC and `getUserMedia`

### Steps

1. Clone this repository or download the files.
2. Update the `awsdata` object in `script.js` with your AWS credentials and collection details:
   ```javascript
   var awsdata = {
     cognitoIdentyPool: "YOUR_COGNITO_IDENTITY_POOL_ID",
     rekognitionCollectionId: "YOUR_REKOGNITION_COLLECTION_ID",
     bucketName: "YOUR_S3_BUCKET_NAME",
     searchBucketName: "YOUR_SEARCH_BUCKET_NAME",
     starlink: "YOUR_S3_BUCKET_URL"
   };

## How to Use
Open index.html in your browser.
Click on Start Demo to begin streaming your webcam.
Rekognition will analyze your face and match it against the celebrity database.
The demo will display matching results, including similarity percentage and celebrity image.
Additional information about your facial attributes like gender, age, emotions, etc., will be displayed.

## AWS Configuration
Ensure that the following AWS services are properly configured:

Amazon Rekognition:
Set up a face collection with your celebrity images.
Amazon S3:
Store your celebrity images in an accessible S3 bucket.
Provide the correct bucketName and starlink in the script.js.

## License
This project is done by the French solution architect team and is meant for demo purposes. It may contain proprietary code for internal use.












