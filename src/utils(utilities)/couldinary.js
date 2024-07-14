import {v2 as cloudinary} from "cloudinary";
import fs from "fs"; // fs stands for file structure, it comes with its various methods 
// it comes preinstalled with Node js

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});

// ----------------------------------------------------------------------------------------------/
                        // Uploading Files(Images) on Cloudinary//
// ----------------------------------------------------------------------------------------------/

const uploadOnCloudinary = async (localFilePath) => {
    try {// if file path is not defined
        if(!localFilePath) return "Could not find file path";
        // else upload the file on cloudinary
        const response  = await cloudinary.uploader.upload( // as upload going to take a while to finish
            localFilePath, {
                resource_type: "auto"
            })
        // if successfully uploaded we print the statement with its url
       // console.log("file is uploaded on cloudinary", response.url);
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file, if file uploaded successfully to cloudinary
        return response // at last we return the response to the user
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove the locally saved temporary file as the upload opration got failed 
        return "File upload fail to cloudinary";
    }
}

// ----------------------------------------------------------------------------------------------/
                        // Fetching the public path of File(Image) from Cloudinary//
// ----------------------------------------------------------------------------------------------/

const imagePublicPathFromCloudinary = async(imageURL) => {
    try {
        const imagePublicPath = imageURL.split("/upload/")[1].split('/')[1].split(".")[0]
        /* 
        Eg: file local URL : "http://res.cloudinary.com/dquepbgjt/image/upload/v1719743655/xlwjirnwgdoh2xh4rmgg.jpg" 
           After spliting on "/upload/" image path splits and store as an array 
                like, [http://res.cloudinary.com/dquepbgjt/image, v1719743655/xlwjirnwgdoh2xh4rmgg.jpg]

            Similarly, if we further split on '/' for the 2nd part of above array. we will get
                like, [v1719743655, xlwjirnwgdoh2xh4rmgg.jpg]
            And, if we further split on '.' for the 1st part of above array. we will get
                like, "xlwjirnwgdoh2xh4rmgg",
            Lastly, we store "xlwjirnwgdoh2xh4rmgg" in imageLocalPath variable. 
        */
        return imagePublicPath
    } catch (error) {
        return "Uploaded File path not found!!!"
    }
}

// ----------------------------------------------------------------------------------------------/
                        // Deleting Old File(Image) from Cloudinary//
// ----------------------------------------------------------------------------------------------/

const deleteFromCloudinary = async (oldImageUrl) => {
    try {
        // Delete the old image from Cloudinary using the URL
        // console.log("Old Image Url:",oldImageUrl)
        const oldImagePublicPath = imagePublicPathFromCloudinary(oldImageUrl);
        console.log("Old Image's Public Id:", oldImagePublicPath)
        const isOldFileRemoved = await cloudinary.uploader.destroy(oldImagePublicPath);
        // console.log("Is Old Image Removed?", isOldFileRemoved)

        if (isOldFileRemoved.result !== 'ok') {
            console.log("Is Old Image Removed? FALSE");
            return false
        }
        else {
            // If the deletion was successful
            console.log("Is Old Image Removed? TRUE");
            return true
        }
    } catch (error) {
        console.log("Old Image not Found!!!")
        return false;
    }
}


// ----------------------------------------------------------------------------------------------/
                        // Exporting the created models//
// ----------------------------------------------------------------------------------------------/
export {
    uploadOnCloudinary, 
    imagePublicPathFromCloudinary,
    deleteFromCloudinary}