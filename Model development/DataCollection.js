let video;
let poseNet;
let pose;
let skeleton;

let state = "waiting";
let targetLabel = "";

let brain;

function setup() {
  let canvas = createCanvas(640, 480);
  canvas.parent("cameraContainer");

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  // Load PoseNet
  poseNet = ml5.poseNet(video, () => {
    console.log("PoseNet Loaded");
  });

  poseNet.on("pose", (results) => {
    if (results.length > 0) {
      pose = results[0].pose;
      skeleton = results[0].skeleton;

      if (state === "collecting") {
        recordKeypoints();
      }
    }
  });

  // ⭐ Create ml5 neural network
  let options = {
    inputs: 34,
    outputs: 1,
    task: "classification",
    debug: true,
  };

  brain = ml5.neuralNetwork(options);
}

function draw() {
  image(video, 0, 0);

  if (pose) {
    // ⭐ Draw keypoints
    for (let kp of pose.keypoints) {
      fill(0, 255, 0);
      noStroke();
      circle(kp.position.x, kp.position.y, 10);
    }

    // ⭐ Draw skeleton
    stroke(255, 0, 0);
    strokeWeight(3);
    for (let bone of skeleton) {
      let a = bone[0];
      let b = bone[1];
      line(a.position.x, a.position.y, b.position.x, b.position.y);
    }
  }
}

// ⭐ Called when user clicks a pose button
function startCollection(label) {
  targetLabel = label;
  console.log("Starting collection for label:", label);

  state = "collecting";
}

// ⭐ Stop collecting
function stopCollection() {
  state = "waiting";
  console.log("Stopped collecting.");
}

// ⭐ Save keypoints to ml5 neural network
function recordKeypoints() {
  if (!pose) return;

  let inputs = [];

  // 34 keypoint values
  for (let kp of pose.keypoints) {
    inputs.push(kp.position.x);
    inputs.push(kp.position.y);
  }

  let target = {
    0: targetLabel,
  };

  brain.addData(inputs, target);
}

// ⭐ Save dataset in ml5 neural network dataset format
function saveData() {
  console.log("Saving dataset...");
  brain.saveData("basic");
}
