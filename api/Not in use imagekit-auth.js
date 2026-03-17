import ImageKit from 'imagekit';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
      console.error('Missing environment variables');
      return res.status(500).json({ 
        error: 'Missing environment variables',
        env: {
          hasPublic: !!process.env.IMAGEKIT_PUBLIC_KEY,
          hasPrivate: !!process.env.IMAGEKIT_PRIVATE_KEY,
          hasEndpoint: !!process.env.IMAGEKIT_URL_ENDPOINT
        }
      });
    }

    const imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });

    // ONE function call gives you token, expire, and signature
    const authParams = imagekit.getAuthenticationParameters();
    
    // Send everything directly to the frontend
    res.status(200).json(authParams);
    
  } catch (error) {
    console.error('ImageKit auth error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
}
