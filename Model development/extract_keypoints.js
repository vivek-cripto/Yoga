const tf = require('@tensorflow/tfjs-node');
const posenet = require('@tensorflow-models/posenet');
const fs = require('fs');
const path = require('path');

// Load and process a single image
async function loadAndProcessImage(imagePath) {
    const image = fs.readFileSync(imagePath);
    const tfImage = tf.node.decodeImage(image);
    return tfImage;
}

// Extract keypoints from an image using PoseNet
async function extractKeypoints(imagePath) {
    try {
        // Load PoseNet model
        const net = await posenet.load({
            architecture: 'MobileNetV1',
            outputStride: 16,
            inputResolution: { width: 640, height: 480 },
            multiplier: 0.75
        });

        // Load and process image
        const input = await loadAndProcessImage(imagePath);
        
        // Get pose estimation
        const pose = await net.estimateSinglePose(input, {
            flipHorizontal: false
        });

        // Extract just the keypoints
        const keypoints = pose.keypoints.map(point => ({
            position: {
                x: point.position.x,
                y: point.position.y
            },
            score: point.score,
            part: point.part
        }));

        // Cleanup
        input.dispose();

        return keypoints;
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
        return null;
    }
}

// Process all images in a directory
async function processDirectory(inputDir, outputFile) {
    const poses = {};
    
    // Read all images from directory
    const files = fs.readdirSync(inputDir)
        .filter(file => file.toLowerCase().endsWith('.jpg') || 
                       file.toLowerCase().endsWith('.png'));

    console.log(`Found ${files.length} images to process...`);

    // Process each image
    for (const file of files) {
        const imagePath = path.join(inputDir, file);
        console.log(`Processing ${file}...`);
        
        const keypoints = await extractKeypoints(imagePath);
        if (keypoints) {
            // Use filename without extension as pose name
            const poseName = path.basename(file, path.extname(file));
            poses[poseName] = keypoints;
        }
    }

    // Save all keypoints to JSON file
    fs.writeFileSync(outputFile, JSON.stringify(poses, null, 2));
    console.log(`Saved keypoints to ${outputFile}`);
}

// Example usage
const inputDirectory = path.join(__dirname, 'reference_poses');
const outputFile = path.join(__dirname, 'reference_keypoints.json');

// Create reference_poses directory if it doesn't exist
if (!fs.existsSync(inputDirectory)) {
    fs.mkdirSync(inputDirectory);
    console.log('Created reference_poses directory. Please add your pose images there.');
}

// Run the extraction
processDirectory(inputDirectory, outputFile)
    .then(() => console.log('Done!'))
    .catch(console.error);