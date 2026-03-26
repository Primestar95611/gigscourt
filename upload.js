// upload.js - ImageKit upload functions

// Compress image before upload
function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                const MAX_WIDTH = 1600;
                const MAX_HEIGHT = 1600;
                
                let width = img.width;
                let height = img.height;
                
                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, 0.8);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// Convert file to base64
function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
    });
}

// Upload profile picture
window.openImageUpload = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = uploadProfileImage;
    input.click();
};

async function uploadProfileImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    alert('Uploading image...');
    
    try {
        const compressedFile = await compressImage(file);
        
        const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
        const authData = await authResponse.json();
        
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onload = function() {
            const base64 = reader.result.split(',')[1];
            
            imagekit.upload({
                file: base64,
                fileName: `profile_${Date.now()}.jpg`,
                folder: '/profiles',
                signature: authData.signature,
                token: authData.token,
                expire: authData.expire,
                useUniqueFileName: true
            }, function(err, result) {
                if (err) {
                    console.error('ImageKit error:', err);
                    alert('Upload failed: ' + err.message);
                    return;
                }
                
                firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
                    profileImage: result.url
                }).then(() => {
                    alert('Profile picture updated!');
                    
                    if (document.querySelector('.profile-container')) {
                        loadProfileTab();
                    } else if (document.querySelector('.edit-profile-container')) {
                        window.openEditProfile();
                    }
                }).catch(error => {
                    console.error('Firestore error:', error);
                    alert('Failed to save image URL');
                });
            });
        };
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload image: ' + error.message);
    }
}

// Add portfolio images
window.addPortfolioImages = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = uploadPortfolioImages;
    input.click();
};

async function uploadPortfolioImages(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    alert(`Uploading ${files.length} images...`);
    
    try {
        const uploadedUrls = [];
        
        for (const file of files) {
            const authResponse = await fetch('https://gigscourt.vercel.app/api/imagekit-auth');
            const authData = await authResponse.json();
            
            const compressedFile = await compressImage(file);
            const base64 = await readFileAsBase64(compressedFile);
            
            await new Promise((resolve, reject) => {
                imagekit.upload({
                    file: base64,
                    fileName: `portfolio_${Date.now()}_${Math.random()}.jpg`,
                    folder: '/portfolios',
                    signature: authData.signature,
                    token: authData.token,
                    expire: authData.expire,
                    useUniqueFileName: true
                }, function(err, result) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    uploadedUrls.push(result.url);
                    resolve();
                });
            });
        }
            
        await updateFirestoreWithPortfolio(uploadedUrls);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Failed to upload images: ' + error.message);
    }
}

async function updateFirestoreWithPortfolio(uploadedUrls) {
    try {
        const userDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
        const userData = userDoc.data();
        const existingImages = userData.portfolioImages || [];
        
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: [...existingImages, ...uploadedUrls]
        });
        
        alert(`${uploadedUrls.length} images uploaded successfully!`);
        loadProfileTab();
    } catch (error) {
        console.error('Firestore error:', error);
        alert('Failed to save image URLs');
    }
}

// Delete portfolio image
window.deleteImage = async (event, imageUrl) => {
    event.stopPropagation();
    
    if (!confirm('Delete this image?')) return;
    
    try {
        const userDoc = await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).get();
        const userData = userDoc.data();
        
        const updatedImages = (userData.portfolioImages || []).filter(url => url !== imageUrl);
        
        await firebase.firestore().collection('users').doc(firebase.auth().currentUser.uid).update({
            portfolioImages: updatedImages
        });
        
        alert('Image deleted');
        loadProfileTab();
    } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete image');
    }
};
