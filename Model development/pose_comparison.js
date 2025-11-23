// Add this at the top with other variables
let referenceKeypoints = {};
let poseScores = {};
const SIMILARITY_THRESHOLD = 0.7; // Adjust this threshold as needed

// Load reference keypoints
function preload() {
    // Load the keypoints we extracted
    loadJSON('reference_keypoints.json', function(data) {
        referenceKeypoints = data;
        console.log('Loaded reference keypoints for poses:', Object.keys(referenceKeypoints));
    });
}

// Add this function to compare poses
function comparePoseWithReference(currentPose, referencePose) {
    let totalScore = 0;
    let pointCount = 0;
    
    // Compare each keypoint
    currentPose.keypoints.forEach((keypoint, i) => {
        const reference = referencePose[i];
        
        // Only compare points that are detected with high confidence
        if (keypoint.score > 0.5 && reference.score > 0.5) {
            // Calculate distance between current and reference points
            const dx = keypoint.position.x - reference.position.x;
            const dy = keypoint.position.y - reference.position.y;
            const distance = Math.sqrt(dx*dx + dy*dy);
            
            // Convert distance to a similarity score (closer = higher score)
            const similarity = Math.max(0, 1 - (distance / 100)); // Adjust 100 based on your needs
            totalScore += similarity;
            pointCount++;
        }
    });
    
    // Return average similarity score
    return pointCount > 0 ? totalScore / pointCount : 0;
}

// Add this to your draw() function to show feedback
function drawPoseFeedback() {
    if (pose && targetLabel && referenceKeypoints[targetLabel]) {
        const score = comparePoseWithReference(pose, referenceKeypoints[targetLabel]);
        
        // Show score and feedback
        push();
        textSize(32);
        if (score > SIMILARITY_THRESHOLD) {
            fill(0, 255, 0);
            text('Good pose!', 10, 30);
        } else {
            fill(255, 0, 0);
            text('Adjust pose', 10, 30);
        }
        text(`Score: ${(score * 100).toFixed(1)}%`, 10, 70);
        pop();
        
        // Only collect data if pose is good
        if (state === 'collecting' && score > SIMILARITY_THRESHOLD) {
            collectPoseData();
        }
    }
}

// Extract the data collection logic
function collectPoseData() {
    let inputs = [];
    for(let i = 0; i < pose.keypoints.length; i++){
        let x = pose.keypoints[i].position.x;
        let y = pose.keypoints[i].position.y;
        inputs.push(x);
        inputs.push(y); 
    }
    let target = [targetLabel];
    brain.addData(inputs, target);
}