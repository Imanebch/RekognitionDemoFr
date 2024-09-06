// Init AWS framework and store necessary credentials and configurations
var awsdata = {
  cognitoIdentyPool: "eu-west-1:4899eb2b-ccd2-4aa2-931c-c5300dd9b3fa", // Identity pool for AWS Cognito
  rekognitionCollectionId: "famouscollectionV2", // Rekognition collection ID
  bucketName: "abassfacematch", // S3 bucket name for face match
  searchBucketName: "abasssafouatousite", // S3 bucket for searching images
  starlink: "https://s3-eu-west-1.amazonaws.com/abassfacematch/" // S3 bucket URL for celebrity photos
};

// AWS config update and setting credentials for Cognito
AWS.config.update({ region: "eu-west-1" });
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: awsdata.cognitoIdentyPool
});

// Initialize S3 and Rekognition services
awsdata.bucket = new AWS.S3({ apiVersion: '2006-03-01', params: { Bucket: awsdata.searchBucketName } });
awsdata.rekognition = new AWS.Rekognition();

// Function to list Rekognition collections
var listCollections = function () {
  var rekognition = new AWS.Rekognition();
  return rekognition.listCollections({}).promise();
};

// Initialize media (camera) access and check if the camera is available
var init = function (callback) {
  if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    console.log("There's a camera");
  } else {
    alert('getUserMedia() is not supported by your browser');
  }
};

// Start streaming the video from the user's camera
var startStream = function (video) {
  var constraints = { video: { width: { exact: 320 }, height: { exact: 240 } } }; // Set video constraints
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function handleSuccess(stream) {
      video.srcObject = stream; // Set video source to the camera stream
    }).catch(function (err) {
      console.log('Error: ', err); // Handle any errors during streaming
    });
};

// Capture the video stream and convert it to an image
var takePicture = function (img, video, canvas) {
  return new Promise(function (resolve, reject) {
    // Set canvas size based on video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Draw the video frame on the canvas
    canvas.getContext('2d').drawImage(video, 0, 0);
    // Convert canvas to image and hide video
    img.src = canvas.toDataURL('image/png');
    $(video).addClass("d-none");
    return resolve();
  });
};

// Convert base64 image data to Blob format
function base64toBlob(base64Data, contentType) {
  contentType = contentType || ''; // Default to empty content type
  var sliceSize = 1024; // Size of each byte slice
  var byteCharacters = atob(base64Data); // Decode base64 string
  var bytesLength = byteCharacters.length;
  var slicesCount = Math.ceil(bytesLength / sliceSize); // Calculate the number of slices
  var byteArrays = new Array(slicesCount);

  // Loop through each slice and convert it to byte array
  for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
    var begin = sliceIndex * sliceSize;
    var end = Math.min(begin + sliceSize, bytesLength);
    var bytes = new Array(end - begin);
    for (var offset = begin, i = 0; offset < end; ++i, ++offset) {
      bytes[i] = byteCharacters[offset].charCodeAt(0); // Get byte value
    }
    byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  // Return Blob object
  return new Blob(byteArrays, { type: contentType });
}

// Function to delete the image from S3 bucket
var deleteImage = function(id) {
  return new Promise(function(resolve, reject) {
    // Define the S3 delete parameters
    var params = {
      Bucket: awsdata.searchBucketName, // Bucket name
      Key: "people/dude" + id // Image key (path in S3)
    };

    // Call S3's deleteObject method
    awsdata.bucket.deleteObject(params).promise().then(function(data) {
      console.log("Image deleted successfully");
      return resolve(data);
    }).catch(function(err) {
      console.log("Error deleting image: ", err);
      return reject(err);
    });
  });
};

// Function to find a celebrity using AWS Rekognition
var findstar = function (image, id) {
  return new Promise(function (resolve, reject) {
    var Similarity, imageid, starid;
    var contentType = image.src.split(";")[0].split(":")[1]; // Get content type from image data
    var base64 = image.src.split(";")[1]; // Get base64 data
    var imageContent = base64.substring(7, base64.length); // Extract base64 content

    // Upload image to S3 bucket
    var params = {
      Key: "people/" + "dude" + id, // Generate unique key for the image
      ContentType: contentType,
      Body: base64toBlob(imageContent)
    };

    // Upload image and search for a match in Rekognition
    awsdata.bucket.upload(params).promise().then(function (data) {
      console.log('Upload is over');
      // Search for the face in Rekognition collection
      var params = {
        CollectionId: awsdata.rekognitionCollectionId,
        FaceMatchThreshold: 20, // Minimum similarity threshold
        Image: {
          S3Object: {
            Bucket: awsdata.searchBucketName,
            Name: "people/" + "dude" + id // Image name in S3
          }
        }
      };
      return awsdata.rekognition.searchFacesByImage(params).promise();
    }).then(function (data) {
      // Process the results from Rekognition
      if (!data.FaceMatches.length) {
        return reject(new Error("No faces recognized in this picture"));
      }
      var face = data.FaceMatches[0].Face;
      Similarity = Math.round(data.FaceMatches[0].Similarity, 0); // Get similarity percentage
      imageid = face.ExternalImageId; // Get external image ID from Rekognition
      starid = imageid.split(':')[1]; // Extract star ID

      console.log("Photo of " + starid + " identified with " + Similarity + "% similarity");

      return resolve(data.FaceMatches[0]);
    }).catch(function (err) {
      return reject(err); // Handle any errors during face search
    });
  });
};

// Function to find labels (attributes) of the face using Rekognition
var findlabel = function (image, id) {
  return new Promise(function (resolve, reject) {
    var Similarity, imageid, starid;
    var contentType = image.src.split(";")[0].split(":")[1]; // Get content type
    var base64 = image.src.split(";")[1]; // Get base64 data
    var imageContent = base64.substring(7, base64.length); // Extract base64 content

    // Parameters for Rekognition face label detection
    var params = {
      Image: {
        S3Object: {
          Bucket: awsdata.searchBucketName,
          Name: "people/" + "dude" + id // Image name in S3
        }
      },
      Attributes: ["ALL"] // Detect all attributes
    };

    // Detect face labels using Rekognition
    awsdata.rekognition.detectFaces(params).promise().then(function (data) {
      console.log("Face label data", data);
      if (!data.FaceDetails) {
        return reject(new Error("No label found for this face"));
      }

      return resolve(data.FaceDetails[0]); // Return face details
    }).catch(function (err) {
      return reject(err); // Handle any errors during label detection
    });
  });
};

// jQuery document ready function to initialize event listeners
$(document).ready(function () {
  console.log("hello world");

  // Handle click event for 'list collections' button
  $("#btn-blue").click(function () {
    listCollections().then(function (data) {
      console.log("Rekognition collection list", data);
      $("#div-rekognition-collections")[0].innerHTML =
        "<li>" + data.CollectionIds.join("</li><li>") + "</li>"; // Display the list of collections
    }).catch(function (err) {
      console.log(err); // Log any errors
    });
  });

  // Handle click event for 'start demo' button
  $("#btn-start-reko").click(function () {
    listCollections().then(function (data) {
      console.log("Rekognition start video", data);

      var video = document.querySelector('#video-reko'); // Get video element
      startStream(video); // Start video stream
      $("#btn-reload").removeClass("d-none"); // Show 'reload' button
      $("#btn-show-label").removeClass("d-none"); // Show 'show label' button
      $("#btn-start-reko").addClass("d-none"); // Hide 'start demo' button
      $("#img-reko").addClass("d-none"); // Hide image preview
    }).catch(function (err) {
      console.log(err); // Log any errors
    });
  });

  // Handle click event for 'reload' button
  $("#btn-reload").click(function () {
    location.reload(); // Reload the page
  });

  // Handle click event for 'show label' button
  $("#btn-show-label").click(function () {
    var img = document.querySelector('#img-reko'); // Get image element
    var video = document.querySelector('#video-reko'); // Get video element
    var canvas = document.querySelector("#canvas-reko"); // Get canvas element
    console.log("Processing image label");

    var id = Math.floor((Math.random() * 10000) + 1); // Generate random ID for image

    // Show star and label sections
    $("#div-star").removeClass("d-none");
    $("#div-label1").removeClass("d-none");
    $("#div-label2").removeClass("d-none");

    takePicture(img, video, canvas).then(function () {
      $("#img-reko").removeClass("d-none"); // Show image preview
    });

    // Stop the video stream
    $("#video-reko")[0].srcObject.getTracks()[0].stop();

    // Find celebrity match
    findstar(img, id).then(function (data) {
      $("#p-reko-text")[0].innerHTML = "Are you ready...? ;)"; // Update text content

      var starurl = awsdata.starlink + data.Face.ExternalImageId.replace(":", "/"); // Get celebrity image URL
      console.log("Star URL", starurl);
      $("#img-private-star-photo").attr("src", starurl); // Set celebrity photo

      var fullstarname = data.Face.ExternalImageId.substr(14).replace(".", "_"); // Parse celebrity name
      var starname = fullstarname.split("_");
      $("#p-star-name-text")[0].innerHTML = "<H4 style='color:#3498db;'>You look like " + starname[1] + " " + starname[0] + " at " + Math.round(data.Similarity,0) + "% </H4>";// Display match details

      // Call the findlabel function after displaying the match
      return findlabel(img, id);

    }).then(function (data) {
      console.log("Label detection successful!", data);

      // Display facial attributes in the UI
      var gender = data.Gender;
      var age = data.AgeRange;
      var smile = data.Smile;
      var eyesglasses = data.Eyeglasses;
      var sunglasses = data.Sunglasses;
      var beard = data.Beard;
      var mustache = data.Mustache;
      var emotions = data.Emotions;

      $("#p-face-details")[0].innerHTML =
        "<h5 class=\"card-text\">You are a " + gender.Value + " (true at " +
        gender.Confidence.toFixed(2) + "%) between " +
        age.Low + " and " +
        age.High + " years old </h5><BR> " +
        "<h5>You have a smile</h5> <UL> " +
        "<LI>" + smile.Value + " at " +
        smile.Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR> " +
        "<h5>Your emotions are</h5> <UL> " +
        "<LI>" + emotions[0].Type + " at " + emotions[0].Confidence.toFixed(2) + "%</LI> " +
        "<LI>" + emotions[1].Type + " at " + emotions[1].Confidence.toFixed(2) + "%</LI> " +
        "<LI>" + emotions[2].Type + " at " + emotions[2].Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR>";

      $("#p-face-details-next")[0].innerHTML =
        "<h5>You wear eyeglasses</h5> <UL> " +
        "<LI>" + eyesglasses.Value + " at " +
        eyesglasses.Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR>" +
        "<h5>You wear sunglasses</h5> <UL> " +
        "<LI>" + sunglasses.Value + " at " +
        sunglasses.Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR>" +
        "<h5>You have a beard</h5> <UL> " +
        "<LI>" + beard.Value + " at " +
        beard.Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR>" +
        "<h5>You have a mustache</h5> <UL> " +
        "<LI>" + mustache.Value + " at " +
        mustache.Confidence.toFixed(2) + "%</LI> " +
        "</UL><BR>";

      // Finally, delete the image after displaying all details
      return deleteImage(id);

    }).then(function() {
      console.log("Image has been deleted");
    }).catch(function (err) {
      console.log(err); // Log any errors during processing
      $("#p-reko-text")[0].innerHTML = "Sorry, Rekognition does not see any faces. Could you try again, please?";
    });
  });
});
