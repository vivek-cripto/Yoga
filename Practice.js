let video;
let poseNet;
let pose;
let skeleton;
let poseLabel;
let brain;
let state = "waiting";

let posesArray = [
  "TADASANA",
  "VRIKSHASANA",
  "UTKATASANA",
  "VIRABHADRASANA I",
  "VIRABHADRASANA II",
  "TRIKONASANA",
  
];

let imgArray = [];
let targetLabel;
let errorCounter;
let iterationCounter;
let poseCounter;
let target;

let timeLeft;
let env;
let wave;

// --------------------------- SETUP ----------------------------------

function setup() {
  // Create canvas INSIDE your .box webcam container
  let cam = createCanvas(320, 240);
  cam.parent("webcamContainer");

  //----------------------------------------------------------
  // 1️⃣ Request camera (higher resolution + front camera)
  //----------------------------------------------------------
  try {
    video = createCapture({
      video: {
        width: { ideal: 320 },
        height: { ideal: 240 },
        facingMode: "user"     // selfie mode
      }
    });
  } catch (e) {
    video = createCapture(VIDEO);
  }

  // Match canvas size
  video.size(320, 240);

  //----------------------------------------------------------
  // 2️⃣ Make raw <video> element visible & styled
  //----------------------------------------------------------
  try {
    const container = document.getElementById("webcamContainer");

    if (container && video.elt) {
      video.show();                                // ensure visible
      video.elt.style.position = "absolute";
      video.elt.style.left = "0px";
      video.elt.style.top = "0px";
      video.elt.style.width = "320px";
      video.elt.style.height = "240px";
      video.elt.style.objectFit = "cover";
      video.elt.style.opacity = "1";
      video.elt.style.zIndex = "1";
      video.elt.setAttribute("playsinline", "");

      //----------------------------------------------------------
      // ⭐ Mirror (selfie flip)
      //----------------------------------------------------------
      video.elt.style.transform = "scaleX(-1)";
      video.elt.style.transformOrigin = "center center";

      //----------------------------------------------------------
      // Append inside container
      //----------------------------------------------------------
      container.appendChild(video.elt);

      console.log("Debug: appended raw video element into #webcamContainer");
    }
  } catch (e) {
    console.warn("Could not append raw video element for debugging", e);
  }

  //----------------------------------------------------------
  // 3️⃣ Debug UI (camera status badge)
  //----------------------------------------------------------
  try {
    const container = document.getElementById("webcamContainer");

    if (container) {
      container.style.border = "2px dashed rgba(0,200,0,0.6)";
      container.style.position = "relative";

      const status = document.createElement("div");
      status.id = "cameraStatus";
      status.style.position = "absolute";
      status.style.top = "8px";
      status.style.left = "8px";
      status.style.padding = "6px 8px";
      status.style.background = "rgba(0,0,0,0.6)";
      status.style.color = "#fff";
      status.style.fontSize = "12px";
      status.style.borderRadius = "4px";
      status.textContent = "Requesting camera...";
      container.appendChild(status);

      video.elt.addEventListener("loadeddata", () => {
        status.textContent = "Camera streaming";
        console.log("video loadeddata event");
      });

      setTimeout(() => {
        if (video.elt && video.elt.srcObject) {
          status.textContent = "Camera streaming";
        } else {
          status.textContent = "Camera not streaming — check permissions.";
          console.warn("Camera not streaming — check permissions or HTTPS.");
        }
      }, 2000);
    }
  } catch (e) {
    console.error("Error setting up camera debug UI", e);
  }

  //----------------------------------------------------------
  // 4️⃣ Initialize PoseNet
  //----------------------------------------------------------
  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on("pose", gotPoses);

  //----------------------------------------------------------
  // 5️⃣ Load sounds
  //----------------------------------------------------------
  env = loadSound("img/file.mp3");
  wave = loadSound("img/error.mp3");

  //----------------------------------------------------------
  // 6️⃣ Load Pose Images
  //----------------------------------------------------------
  imgArray[0] = new Image();
  imgArray[0].src = "img/Tadasana.jpeg";

  imgArray[1] = new Image();
  imgArray[1].src = "img/warrior1.gif";

  imgArray[2] = new Image();
  imgArray[2].src = "img/warrior2.gif";

  imgArray[3] = new Image();
  imgArray[3].src = "img/Tree.gif";

  imgArray[4] = new Image();
  imgArray[4].src = "img/Tri.gif";

  imgArray[5] = new Image();
  imgArray[5].src = "img/adhomukh.gif";

  //----------------------------------------------------------
  // 7️⃣ Initial Pose State
  //----------------------------------------------------------
  poseCounter = 0;
  targetLabel = 1;
  target = posesArray[poseCounter];

  document.getElementById("poseName").textContent = target;
  timeLeft = 30;
  document.getElementById("time").textContent = "00:30";
  errorCounter = 0;
  iterationCounter = 0;
  document.getElementById("poseImg").src = imgArray[poseCounter].src;

  //----------------------------------------------------------
  // 8️⃣ ML5 Neural Network Setup
  //----------------------------------------------------------
  let options = {
    inputs: 34,
    outputs: 6,
    task: "classification",
    debug: true
  };

  brain = ml5.neuralNetwork(options);

  const modelInfo = {
    model: "model/model.json",
    metadata: "model/model_meta.json",
    weights: "model/model.weights.bin"
  };

  brain.load(modelInfo, brainLoaded);
}


// --------------------------- MODEL READY ------------------------------

function modelLoaded() {
  console.log("PoseNet Ready");
}

function brainLoaded() {
  console.log("Classification Model Ready!");
  classifyPose();
}

// --------------------------- CLASSIFY POSE -----------------------------

function classifyPose() {
  if (pose) {
    let inputs = [];

    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      inputs.push(x);
      inputs.push(y);
    }

    brain.classify(inputs, gotResult);
  } else {
    console.log("Pose not detected...");
    setTimeout(classifyPose, 500);
  }
}

// --------------------------- RESULT LOGIC ------------------------------

function gotResult(error, results) {
  document.getElementById("welldone").textContent = "";
  document.getElementById("sparkles").style.display = "none";

  if (results[0].confidence > 0.75) {
    if (results[0].label == targetLabel.toString()) {
      iterationCounter++;

      if (iterationCounter === 30) {
        iterationCounter = 0;
        env.play();
        nextPose();
      } else {
        timeLeft--;
        document.getElementById("time").textContent =
          timeLeft < 10 ? `00:0${timeLeft}` : `00:${timeLeft}`;
        setTimeout(classifyPose, 1000);
      }
    } else {
      errorCounter++;

      if (errorCounter >= 4) {
        iterationCounter = 0;
        timeLeft = 30;
        wave.play();
        document.getElementById("time").textContent = "00:30";
        errorCounter = 0;
      }

      setTimeout(classifyPose, 100);
    }
  } else {
    setTimeout(classifyPose, 100);
  }
}

// --------------------------- POSE DETECTION ---------------------------

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
  }
}

// --------------------------- DRAW LOOP ---------------------------------

function draw() {
  push();
  // use canvas width/height rather than video.width/video.height to avoid NaN when
  // the video's dimensions aren't yet set on the media element
  translate(width, 0);
  scale(-1, 1);
  // Enable high-quality scaling when drawing the video to the canvas
  try {
    drawingContext.imageSmoothingEnabled = true;
    drawingContext.imageSmoothingQuality = 'high';
  } catch (e) {}
  image(video, 0, 0, width, height);

  if (pose) {
    // keypoints
    for (let i = 0; i < pose.keypoints.length; i++) {
      let x = pose.keypoints[i].position.x;
      let y = pose.keypoints[i].position.y;
      fill(0, 255, 0);
      ellipse(x, y, 12, 12);
    }

    // skeleton lines
    for (let i = 0; i < skeleton.length; i++) {
      let a = skeleton[i][0];
      let b = skeleton[i][1];
      strokeWeight(4);
      stroke(255);
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
  }

  pop();
}

// --------------------------- NEXT POSE ---------------------------------

function nextPose() {
  if (poseCounter >= 5) {
    document.getElementById("welldone").textContent =
      "All poses completed!";
    document.getElementById("sparkles").style.display = "block";

    document.getElementById("poseName").style.display = "none";
    document.getElementById("poseImg").style.display = "none";
    document.getElementById("time").style.display = "none";
    document.getElementById("sec").style.display = "none";
  } else {
    poseCounter++;
    targetLabel = poseCounter + 1;
    target = posesArray[poseCounter];

    document.getElementById("poseName").textContent = target;
    document.getElementById("welldone").textContent = "Great! Next pose!";
    document.getElementById("sparkles").style.display = "block";

    document.getElementById("poseImg").src = imgArray[poseCounter].src;

    timeLeft = 30;
    document.getElementById("time").textContent = "00:30";

    setTimeout(classifyPose, 3000);
  }
}
