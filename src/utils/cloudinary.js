import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try{
    if(!localFilePath) return null;
    // Upload on cloudinary
    const response = await cloudinary.uploader.upload(loadEnvFile, {
      resource_type: 'auto'
    });

    // file has been uploaded successfully!
    console.log("cloudinary: file uploaded successfully! ", response.url);
    return response;
  }
  catch(error){
    fs.unlinkSync(localFilePath); // remove locally save temp file, in case of failure!
    return null;
  }
}


export {uploadOnCloudinary}
