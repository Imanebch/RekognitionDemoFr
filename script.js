// Init AWS framework
var awsdata = {
  cognitoIdentyPool: "eu-west-1:4899eb2b-ccd2-4aa2-931c-c5300dd9b3fa",
  rekognitionCollectionId:"famouscollectionV2",
  bucketName:"abassfacematch",
  searchBucketName: "abasssafouatousite",
  starlink : "https://s3-eu-west-1.amazonaws.com/abassfacematch/"

};
AWS.config.update({region: "eu-west-1"});
AWS.config.credentials=new AWS.CognitoIdentityCredentials({
  IdentityPoolId: awsdata.cognitoIdentyPool

});

awsdata.bucket = new AWS.S3({ apiVersion: '2006-03-01', params: {Bucket: awsdata.searchBucketName} });
awsdata.rekognition = new AWS.Rekognition();



var listCollections = function(){
  var rekognition = new AWS.Rekognition();
  return rekognition.listCollections({}).promise();
};

var init = function(callback){
  // Detect the way to access to the camera
  if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    console.log("There's a camera");
  } else {
    alert('getUserMedia() is not supported by your browser');
  }
};

//Start to stream the video
var startStream = function(video){
  //var constraints = { video: {width: {exact: 320}, height: {exact: 200}} };
  //var constraints = { video: true };
  var constraints = { video: {width: {exact: 320}, height: {exact: 240}} };
  return navigator.mediaDevices
    .getUserMedia(constraints)
    .then(function handleSuccess(stream) {
      video.srcObject = stream;
    }).catch(function(err){
      console.log('Error: ', err);
    });
};

var takePicture = function(img, video, canvas){
  return new Promise(function(resolve, reject){
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    // Other browsers may fall back to image/png
    img.src = canvas.toDataURL('image/png');
    $(video).addClass("d-none");
    return resolve();
  });
}

function base64toBlob(base64Data, contentType) {
  contentType = contentType || '';
  var sliceSize = 1024;
  var byteCharacters = atob(base64Data);
  var bytesLength = byteCharacters.length;
  var slicesCount = Math.ceil(bytesLength / sliceSize);
  var byteArrays = new Array(slicesCount);

  for (var sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
      var begin = sliceIndex * sliceSize;
      var end = Math.min(begin + sliceSize, bytesLength);

      var bytes = new Array(end - begin);
      for (var offset = begin, i = 0 ; offset < end; ++i, ++offset) {
          bytes[i] = byteCharacters[offset].charCodeAt(0);
      }
      byteArrays[sliceIndex] = new Uint8Array(bytes);
  }
  return new Blob(byteArrays, { type: contentType });
}


  // retreive celebrity
  var findstar = function(image, id){
    return new Promise(function(resolve, reject){
      //1 send the image to s3 bucket
      var Similarity, imageid, starid;

      var contentType = image.src.split(";")[0].split(":")[1];
      var base64 = image.src.split(";")[1];
      var imageContent = base64.substring(7, base64.length);

      //1 send the image to s3 bucket

      var params = {
        Key: "people/"+"dude"+ id,
        ContentType: contentType,
        Body: base64toBlob(imageContent)
      };

    //  awsdata.bucket.upload( params, awsdata.bucketOptions ).promise().then(function(data){
      awsdata.bucket.upload( params ).promise().then(function(data){
        console.log('Upload is over');
        //2 use s3 url to search the image in the rekognition collection famouscollection
        //  --> we get back a faceId and a ExternalImageId
        var params = {
          CollectionId: awsdata.rekognitionCollectionId,
          FaceMatchThreshold: 20,
          Image: {
            S3Object: {
              Bucket: awsdata.searchBucketName,
              Name: "people/"+"dude"+ id
            }
          }
        };
        return awsdata.rekognition.searchFacesByImage(params).promise();
      }).then(function(data) {
        console.log("Search face in this image", data);
        if ( ! data.FaceMatches.length ){
          return reject(new Error("No faces recognized in this picture"));
        }

        var face = data.FaceMatches[0].Face;
        Similarity = Math.round(data.FaceMatches[0].Similarity,0);
        imageid = face.ExternalImageId;
        starid = imageid.split(':')[1];

        console.log(imageid);

        console.log("la photo de " + starid + " has been identified with a similarity of " + Similarity + "%");


        return resolve(data.FaceMatches[0]);


      }).catch(function(err) {
        return reject(err);
      });
    });
  };




  var findlabel = function(image, id){
    return new Promise(function(resolve, reject){
      //Params of the image
      var Similarity, imageid, starid;

      var contentType = image.src.split(";")[0].split(":")[1];
      var base64 = image.src.split(";")[1];
      var imageContent = base64.substring(7, base64.length);

      var params = {
        Image: {
          S3Object: {
            Bucket: awsdata.searchBucketName,
            Name: "people/"+"dude"+ id
          }
        },
        Attributes : ["ALL"]
      };

      //Detect labels of the  provided face
      awsdata.rekognition.detectFaces(params).promise().then(function(data) {
        console.log("Search for face label in this image", data);
        if ( ! data.FaceDetails ){
          return reject(new Error("No label found in this face"));
        }

        var facelabel = data.FaceDetails[0];


        console.log("data for face label", data);

        return resolve(data.FaceDetails[0]);

      }).catch(function(err) {
        return reject(err);
      });
    });
  };



$(document).ready(function(){
  console.log("hello world");


  $("#btn-blue").click(function(){
    listCollections().then(function(data){
      console.log("rekognition collection list", data);

      $("#div-rekognition-collections")[0].innerHTML =
      "<li>" +
      data.CollectionIds.join("</li><li>") +
      "</li>"
      ;

    }).catch(function(err){
      console.log(err);
    });

  });

  $("#btn-start-reko").click(function(){
    listCollections().then(function(data){
      console.log("rekognition start video", data);

      var video = document.querySelector('#video-reko');
      startStream(video);
      $("#btn-reload").removeClass("d-none");
      $("#btn-show-label").removeClass("d-none");
      $("#btn-start-reko").removeClass("btn-lg btn-primary");
      $("#btn-show-label").removeClass("btn-sm btn-outline-secondary");
      $("#btn-show-label").addClass("btn-lg btn-primary");
      $("#btn-start-reko").addClass("d-none");
      $("#img-reko").addClass("d-none");


    }).catch(function(err){
      console.log(err);
    });

  });

  $("#btn-reload").click(function(){
      location.reload();

  });

  $("#btn-show-label").click(function(){
    var img = document.querySelector('#img-reko');
    var video = document.querySelector('#video-reko');
    var canvas = document.querySelector("#canvas-reko");
    console.log("abass dans reko label");

    var id = Math.floor((Math.random() * 10000) + 1);

    $("#div-star").removeClass("d-none");
    $("#div-label1").removeClass("d-none");
    $("#div-label2").removeClass("d-none");

    takePicture(img, video, canvas).then(function(){
      $("#img-reko").removeClass("d-none");


    });
    $("#video-reko")[0].srcObject.getTracks()[0].stop();



    findstar(img,id).then(function(data){
      $("#p-reko-text")[0].innerHTML = "Are you ready...? ;)";

      var starurl = awsdata.starlink + data.Face.ExternalImageId.replace(":","/");
      console.log("URL de star", starurl);
      $("#img-private-star-photo").attr("src",starurl);
      var fullstarname = data.Face.ExternalImageId.substr(14).replace(".","_");
      var starname = fullstarname.split("_");
      $("#p-star-name-text")[0].innerHTML = "<H4>You look like " + starname[1] + " " + starname[0] + " at " + Math.round(data.Similarity,0) + "% </H4>";

    }).then(function(){
      console.log("lancement de findlabel");
      findlabel(img, id).then(function(data){
        console.log("lancement findlabel reussi !",data);

        var gender = data.Gender;
        var age = data.AgeRange;
        var smile = data.Smile;
        var eyesglasses = data.Eyeglasses;
        var sunglasses = data.Sunglasses;
        var beard = data.Beard;
        var mustache = data.Mustache;
        var emotions = data.Emotions;

        $("#p-face-details")[0].innerHTML =
        "<h5 class\=\"card-text\">You are a " + gender.Value + " (true at " +
        gender.Confidence.toFixed(2) + "% ) between "+
         age.Low + " and " +
        age.High + " years old   </H5> <BR> " +

        "<h5>You have a smile </h5> <UL> "+
        "<LI>" + smile.Value + " at " +
        smile.Confidence.toFixed(2) + "% </LI> " +
        "</UL> <BR> "+

        "<h5>Your emotions are</h5> <UL> "+
        "<LI >" + emotions[0].Type + " at " + emotions[0].Confidence.toFixed(2) + " %</LI> " +
        "<LI >" + emotions[1].Type + " at " + emotions[1].Confidence.toFixed(2) + " %</LI> " +
        "<LI >" + emotions[2].Type + " at " + emotions[2].Confidence.toFixed(2) + " %</LI> " +
        "</UL> <BR>";


        $("#p-face-details-next")[0].innerHTML =
        "<h5>You wear eyesglasses</h5> <UL> "+
        "<LI>" + eyesglasses.Value + " at " +
        eyesglasses.Confidence.toFixed(2) + "% </LI>" +
        "</UL> <BR>"+

        "<h5>You wear sunglasses</h5> <UL> "+
        "<LI>" + sunglasses.Value + " at " +
        sunglasses.Confidence.toFixed(2) + "% </LI> " +
        "</UL> <BR>"+

        "<h5>You have a beard </h5> <UL> "+
        "<LI>" + beard.Value + " at " +
        beard.Confidence.toFixed(2) + "% </LI> " +
        "</UL> <BR>"+

        "<h5>You have a mustache </h5>  <UL> "+
        "<LI>" + mustache.Value + " at " +
        mustache.Confidence.toFixed(2) + "% </LI> " +
        "</UL> <BR>";


      });

    }).catch(function(err){
        console.log(err);
        $("#p-reko-text")[0].innerHTML = "Sorry Rekognition does not see any faces, could you try again please?";
      });







  });

}) ;