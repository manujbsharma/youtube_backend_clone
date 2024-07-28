/* 
NEXT WE MAKE ROUTES
Why creating Routes are important?
as we made methods, we wamt to define... when a perticular method will run? 
like, we show perticular data when we hit a perticular url on the website. 
That's why routing is necessary so that we handle all the methods swiftly and easily.
*/

import { Router } from "express";
import { changeCurrentPassword, 
         getCurrentUser, 
         getUserChennelProfile, 
         getWatchHistory, 
         loggedOutUser, 
         loginUser, 
         refreshAccessToken, 
         registerUser, 
         updateAccountDetails, 
         updateUserAvatar, 
         updateUserCoverImage 
        } from "../controllers/user.controller.js"; // Importing as an object as we export it as an object

// To handle files 
import { upload } from "../middlewares/multer.middleware.js"; 
import { verifyJWT } from "../middlewares/auth.middleware.js";
import multer from "multer";
// this handles the files rather then text, coming from the user
// as its a middleware so it will execute in the middle of process


const router = Router() // defining router constant while giving all the routes functionality to the route constant 

// register route
router.route("/register").post( // if someone requesting to register route
    // using our middleware from multer
    upload.fields( // its a function
        [ // which accept array of
        { // object1
            name: "avatar",
            maxCount: 1
        },
        { // object2
            name: "coverImage",
            maxCount: 1
        }
    ]), 
    registerUser // then the ending process
)
/* BREAKDOWN
router.route("/register") --> defined the route/ if this hit
.post(registerUser) --> What method it will run/ i will call this method
*/

router.route("/login").post(loginUser)


// Secured routes, cause user should be logged in to access these endpoints
router.route("/logout").post(verifyJWT, loggedOutUser) // Middleware used here just before loggedout function, just add the middlewares as many as you want by seprating them by comma 
router.route("/refresh-token").post(refreshAccessToken) // here we don't required middleware, cause we defined all the logic inside the code block already.
router.route("/change-password").post(verifyJWT, changeCurrentPassword) // change password, allowrd only to the logged-in users thats why we inject verify JWT middleware

router.route("/current-user").get(verifyJWT, getCurrentUser) // to fetch current loged in user
router.route("/channel/:username").get(verifyJWT, getUserChennelProfile) // as we fetching data from params of the logged in user. that's why, we write the rewrite path as "/c/:username" as we calling the function by the user's username
router.route("/watchHistory").get(verifyJWT, getWatchHistory) // to get the details related to a user's videos

router.route("/update-account").patch(verifyJWT, updateAccountDetails) // to allow a user, updating only specific account details. that's why we used patch as we modifying some fields
router.route("/avatar-update").patch(verifyJWT, upload.single("avatar"), updateUserAvatar) // to update only logged in user's avatar, verified the user and then uploading the file using multer(used single as we uploading single file as avatar) then we called the function
router.route("/coverImage-update").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage) // to update only logged in user's avatar, verified the user and then uploading the file using multer(used single as we uploading single file as avatar) then we called the function

export default router
// we import this to app.js file