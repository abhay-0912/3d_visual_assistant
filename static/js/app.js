// Three.js setup
let scene, camera, renderer, controls;
let robot;
let mixer; // Animation mixer
let currentEmotion = 'neutral';
const emotions = {
    neutral: { rotation: 0, color: 0xffffff, handRotation: 0 },
    happy: { rotation: 0.1, color: 0xffeb3b, handRotation: 0.5 },
    thinking: { rotation: -0.1, color: 0x4caf50, handRotation: 1.2 },
    confused: { rotation: 0.2, color: 0xff9800, handRotation: -0.3 }
};

let leftHand, rightHand; // References to hand bones
let handAnimations = {}; // Store hand animations

// Initialize Three.js scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);

    // Get container dimensions
    const container = document.getElementById('model-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    // Create camera
    camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add ground plane for shadow
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    // Add controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 10;
    controls.target.set(0, 1, 0);
    controls.update();

    // Load 3D model
    const loader = new THREE.GLTFLoader();
    loader.load(
        '/static/models/scene.gltf',
        function (gltf) {
            robot = gltf.scene;
            scene.add(robot);
            
            // Set up animation mixer
            mixer = new THREE.AnimationMixer(robot);
            
            // Center and scale the model
            const box = new THREE.Box3().setFromObject(robot);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            robot.scale.setScalar(scale);
            
            // Position the model
            robot.position.y = 0;
            robot.position.x = 0;
            robot.position.z = 0;

            // Find and store hand bones
            robot.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                    node.material.envMapIntensity = 1;
                }
                
                // Look for hand bones in the model
                if (node.isBone) {
                    if (node.name.toLowerCase().includes('hand_l') || 
                        node.name.toLowerCase().includes('lefthand')) {
                        leftHand = node;
                    }
                    if (node.name.toLowerCase().includes('hand_r') || 
                        node.name.toLowerCase().includes('righthand')) {
                        rightHand = node;
                    }
                }
            });

            // Create hand animations
            if (leftHand && rightHand) {
                setupHandAnimations();
            }

            // Initial emotion
            setEmotion('neutral');
        },
        // Loading progress
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        // Error handling
        function (error) {
            console.error('Error loading 3D model:', error);
        }
    );

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

// Set up hand animations for different emotions
function setupHandAnimations() {
    // Wave animation
    const waveAnimation = new THREE.AnimationClip('wave', 1.5, [
        new THREE.QuaternionKeyframeTrack(
            '.quaternion',
            [0, 0.5, 1, 1.5],
            new Float32Array([
                0, 0, 0, 1,
                0.3, 0, 0, 0.95,
                -0.3, 0, 0, 0.95,
                0, 0, 0, 1
            ])
        )
    ]);
    
    // Thinking animation
    const thinkingAnimation = new THREE.AnimationClip('thinking', 2, [
        new THREE.QuaternionKeyframeTrack(
            '.quaternion',
            [0, 1, 2],
            new Float32Array([
                0, 0, 0, 1,
                0.2, 0.1, 0, 0.97,
                0, 0, 0, 1
            ])
        )
    ]);

    // Store animations
    if (leftHand) {
        handAnimations.leftWave = mixer.clipAction(waveAnimation, leftHand);
        handAnimations.leftThink = mixer.clipAction(thinkingAnimation, leftHand);
    }
    if (rightHand) {
        handAnimations.rightWave = mixer.clipAction(waveAnimation, rightHand);
        handAnimations.rightThink = mixer.clipAction(thinkingAnimation, rightHand);
    }
}

// Play hand animation based on emotion
function playHandAnimation(emotion) {
    // Stop all current animations
    Object.values(handAnimations).forEach(animation => {
        animation.stop();
    });

    switch(emotion) {
        case 'happy':
            if (handAnimations.leftWave) handAnimations.leftWave.play();
            if (handAnimations.rightWave) handAnimations.rightWave.play();
            break;
        case 'thinking':
            if (handAnimations.rightThink) handAnimations.rightThink.play();
            break;
        case 'confused':
            if (handAnimations.leftThink) handAnimations.leftThink.play();
            if (handAnimations.rightThink) handAnimations.rightThink.play();
            break;
    }
}

// Handle window resize
function onWindowResize() {
    const container = document.getElementById('model-container');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    camera.aspect = containerWidth / containerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(containerWidth, containerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update animation mixer
    if (mixer) {
        mixer.update(0.016); // Update animations (assuming 60fps)
    }
    
    controls.update();
    
    if (robot) {
        // Smoothly interpolate to target rotation based on emotion
        const targetRotation = emotions[currentEmotion].rotation;
        robot.rotation.y += (targetRotation - robot.rotation.y) * 0.1;
    }
    
    renderer.render(scene, camera);
}

// Speech synthesis setup
const speechSynthesis = window.speechSynthesis;
let speaking = false;

function speak(text) {
    if (speaking) {
        speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    utterance.onstart = () => {
        speaking = true;
        setEmotion('happy');
    };
    
    utterance.onend = () => {
        speaking = false;
        setEmotion('neutral');
    };
    
    speechSynthesis.speak(utterance);
}

// Set robot emotion and update UI
function setEmotion(emotion) {
    currentEmotion = emotion;
    
    // Update emotion indicators
    document.querySelectorAll('.expression-dot').forEach(dot => {
        dot.classList.remove('active');
        if (dot.dataset.emotion === emotion) {
            dot.classList.add('active');
        }
    });
    
    // Update model color and play hand animation
    if (robot) {
        robot.traverse((child) => {
            if (child.isMesh) {
                child.material.emissive = new THREE.Color(emotions[emotion].color);
                child.material.emissiveIntensity = 0.2;
            }
        });
        
        playHandAnimation(emotion);
    }
}

// Initialize chat functionality
function initChat() {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');

    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage(message, 'user');
        userInput.value = '';
        
        setEmotion('thinking');

        try {
            // Call Flask backend
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });

            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Add AI response to chat
            addMessage(data.response, 'assistant');
            
            // Speak the response
            speak(data.response);

        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
            setEmotion('confused');
        }
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
}

// Initialize everything
init();
animate();
initChat();

// Set initial emotion
setEmotion('neutral'); 