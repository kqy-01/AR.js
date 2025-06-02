// AR.js initialization and controls
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-ar');
    const scene = document.querySelector('a-scene');
    let isARStarted = false;

    // Handle AR start button
    startButton.addEventListener('click', async () => {
        if (!isARStarted) {
            try {
                // Request camera permission
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                stream.getTracks().forEach(track => track.stop());
                
                // Start AR
                scene.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
                isARStarted = true;
                startButton.textContent = 'AR Active';
                startButton.style.background = '#2196F3';
            } catch (error) {
                console.error('Error accessing camera:', error);
                alert('Please allow camera access to use AR features');
            }
        }
    });

    // Handle marker found event
    scene.addEventListener('markerFound', (event) => {
        console.log('Marker found!');
        const model = document.querySelector('#model');
        if (model) {
            model.setAttribute('visible', true);
        }
    });

    // Handle marker lost event
    scene.addEventListener('markerLost', (event) => {
        console.log('Marker lost!');
        const model = document.querySelector('#model');
        if (model) {
            model.setAttribute('visible', false);
        }
    });

    // Handle model loading
    const model = document.querySelector('#model');
    model.addEventListener('model-loaded', () => {
        console.log('3D model loaded successfully');
    });

    model.addEventListener('model-error', (error) => {
        console.error('Error loading 3D model:', error);
    });
}); 