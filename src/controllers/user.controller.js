import { asyncHandler } from "../utils(utilities)/asyncHandler.js"; // for handling web requests
import { APIError } from "../utils(utilities)/APIError.js"; // used for validation
import { User } from "../models/user.model.js"; // used to add, delete and check if user exists or not
import { uploadOnCloudinary } from "../utils(utilities)/couldinary.js"; // used to upload files on clodinary server
import { APIResponse } from "../utils(utilities)/APIResponse.js"; // used to return structured and crafted response
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// ----------------------------------------------------------------------------------------------/
                    // METHODS -> FUNCTIONS that can called MULTIPLE TIMES //
// ----------------------------------------------------------------------------------------------/
    const generateAccessAndRefreshTokens = async(userId) => {
        
        try {
            const user = await User.findById(userId) //If we found the user's properties
            const accessToken = await user.generateAccessToken() // This is a methods thats why we add "()" after funtion name
            const refreshToken = await user.generateRefreshToken() // This is a methods as well
 
            user.refreshToken = refreshToken // storing the generated token in database for the perticular found user
            
            // Once generated token is updated for the user in db, then we save it in the mongo databse
            await user.save( {validateBeforeSave : false} )
            /* 
                Remember,
                    as we try to save, required fields in Mongoose model will kick-in (by default).
                    like, password is a required field, and in initially we don't have the password.
                    but, because we updating only a single field here (refresh token).
                    That's why we pass a parameter "validationBeforeSave" => false. 
                    Which means, don't put any validation, just go straight and save it.
            */


            /*
            Now, as we generated access key and refresh token and saved refresh token in database.
            we return both the values.

            Why we saved only refresh token and not access token in database?
            because access tokens are valid for shorter period of time, and only used while user is trying to access our server initially.
            but, refresh token is required as its valid for long period of time, and if we have it store. 
            we dont have to ask user to re-login as we can validate user with the refresh token in his cokies matching it with token present in the database for the user
            if refresh token (local cookies) === refresh token (in database) the user will be able to use the webapp without re-login
            if the refresh token is expired or didn't matched, user will be asked for re-login

            */
           return {accessToken, refreshToken}
           
           //user.accessToken = accessToken // storing the generated token in database for the perticular found user

        } catch (error) {
            // console.log(error)
            throw new APIError(500, "Something went wrong while generating access and refresh tokens!")        
        }
    }


// ----------------------------------------------------------------------------------------------/
                           // REGISTER USER //
// ----------------------------------------------------------------------------------------------/

/* 
The Algorithm we follow to register a user
    1) get user details from frontend
    2) validation - if any required field is empty or not
    3) check if user already exists: check through username or email
    4) check for images: check for avatar(required field)
    5) upload them to cloudinary- check avatar exist for the user or not
    6) create user object - create entry in DB
    7) remove password and refresh token field from response
    8) check for user creation 
    9) return response: null(failed) , response(successful) 
*/

const registerUser = asyncHandler(async (req, res) => {
    // 1) get user details from frontend
    const { fullName, email, username, password } = req.body
    /*  
    - req.body holds all the details required from front-end
    we can get data from req.body, if the data coming through a form or json body
    - we can extract data from the body by destructuring,--> const{} (object)
    while destructuring, we can define fields which we want from user
    like, username, fullName, email, username, password [in our case]
    */
   console.log("Details that a request body holds: \n" , req.body);
   /*
   Details that a request body holds: (req.body) <-- Details we get from the frontend
    [Object: null prototype] {
        fullName: 'Manuj Bandhu Sharma',
        email: 'manujbandhusharma@gmail.com',
        password: 'Manuj@7737',
        username: 'Manuj.24'
    }
   */
   console.log("-----------------------------------------------------------");
    console.log("Full Name: ", fullName);
    console.log("Email: ", email);
    console.log("User Name: ", username);
    console.log("Password: ", password);
    console.log("-----------------------------------------------------------");
    
    // 2) Validation
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
        /*
        Checking if any of the value/field exist or not by using (?). 
        if it exists and even after trimming(.trim()) it's still empty ("") 
        then send true otherwise false as response of IF condition
        */
    ) {// if the above condition is true, execute the below code.
        throw new APIError(
            400, // status code
            "All Fields are required" // message
        )
    }
    // 3) check if user already exists
    const existedUser = await User.findOne({
        // Here, findOne returns whatever value it finds first, from the database for the defined fields
        // and in last, we holding the reference into a variable (const existedUser) 
        $or: [{ username }, { email }] // it is the query
        /* Here, 
            $or - it is an operator property (key)
            [ { username },{ email } ] - array of objects (value)
            - It will return the fisrt value/document found in the db, matching to the user input
        */
    })
    console.log("Checking if User Existed? : ", existedUser);
    console.log("-----------------------------------------------------------");

    // Checking if user exists or not
    if (existedUser) { // if existedUser is true
        throw new APIError(409, "User with email or username already exists")
    }

    // 4) Getting the file path and checking for image's existance

/*
    console.log("Checking Response object : \n", req);
    console.log("-----------------------------------------------------------");
    console.log("Response object's details of uploaded images :\n", req.files);
    console.log("-----------------------------------------------------------");
    console.log("Checking if Path field exists in Response object? : ", req.files?.path);
    console.log("-----------------------------------------------------------");

*/
    const avatarLocalPath = req.files?.avatar[0]?.path

    
    /*
        Response object's details of uploaded images : (req.files) 
    [Object: null prototype] {
        avatar: [
            {
                fieldname: 'avatar',
                originalname: 'claudio-schwarz-k39RGHmLoV8-unsplash.jpg',
                encoding: '7bit',
                mimetype: 'image/jpeg',
                destination: './public/temp',
                filename: 'claudio-schwarz-k39RGHmLoV8-unsplash.jpg',
                path: 'public\\temp\\claudio-schwarz-k39RGHmLoV8-unsplash.jpg',
                size: 9145407
            }
        ],
            coverImage: [
                {
                    fieldname: 'coverImage',
                    originalname: 'ashish-kumar-UrNslyuxH6k-unsplash.jpg',
                    encoding: '7bit',
                    mimetype: 'image/jpeg',
                    destination: './public/temp',
                    filename: 'ashish-kumar-UrNslyuxH6k-unsplash.jpg',
                    path: 'public\\temp\\ashish-kumar-UrNslyuxH6k-unsplash.jpg',
                    size: 73202
                }
            ]
    }
     */

    //console.log("Avatar file's local path : ", avatarLocalPath);

    /* Here,
    as we get all the data in (req.body), but because we added a middleware in routes(multer),
    gives us additional functionality. i.e., multer gives an additional property (req.files) --> this is how we access the files
    so, if the file exists, we check it by using (?) optional chaining
    for the defined field "avatar". 
    we require its 1st property "[0]" cause it gives us an object which we again check by (?) optional chaining
    if we get that object, we can write a path (.path) provided by the multer
    
    In the end, we storing it in a variable named as "avatarLocalPath"
    cause till now this file is on our server, not yet gone to the cloudinary yet!!.
    */

    //const coverImageLocalPath = req.files?.coverImage[0]?.path
    //console.log("Cover Image Local Path: ", coverImageLocalPath);
    // console.log("Cover Image Existance : ", req.files?.coverImage);
    // console.log("-----------------------------------------------------------");

    // console.log("required file : ", req.files);
    // console.log("-----------------------------------------------------------");

    // console.log("Cover Image array : ", Array.isArray(req.files.coverImage));
    // console.log("-----------------------------------------------------------");
    
    // console.log("Cover Image array's length : ", req.files.coverImage.length);
    // console.log("-----------------------------------------------------------");


    let coverImageLocalPath; // initializing a variable which we going to use locally and it can be changed
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    // 4.2) As Avatar is a mendatory field, we going to check its existance
    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar Image is required")
    }

    // 5.1) upload them to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    /*
    NOTE: this step gonna take time surely as we uploading an Image File, 
    thats why we use "await" keyword. why?
    Because we want the preceeding code to wait (intensionally) until this step is complete.
    that is the reason we used "async" keyword in the initiation of the function
    
    once its uploaded,
    then give me a reference and i will store it in a variable (avatar)
    */

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // 5.2) Checking if avatar exists or not?
    if (!avatar) { throw new APIError(400, "Avatar Image is required") }

    // 6.1) create user object - create entry in DB
    const user = await User.create({
        fullName,
        email,
        password,
        username: username.toLowerCase(), // as we want to keep the username to be in lowercase always
        avatar: avatar.url, // We already validate it above and here we don't want to save everything about the image in database but only its url.
        coverImage: coverImage?.url || "", // This is optional
        /*
        NOTE: Corner case, Safety Measure
        Here, the cover image is not compulsory we have to apply a check to validate its existance.
        if the url exists then send it, otherwise send a empty string ("")
        */
    })


    /*
    Here, once this user is successfully created, MongoDB doesn't only store the provided data
    It also add (_id) field to each of the entry by default.
    */
    // 7) Validating created entry while removing password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    /* 
    so as we have a field named as "_id". 
    We can use it to validate by searching the entity's id in database. 
    if a user created or not
    After that, we will remove the password and refreshToken fields from the response before saving it to a variable
    And, we want to wait until this validation process is completed.
    */

    // 8) Check for User creation 
    if (!createdUser) {
        throw new APIError(500, "Something went wrong while registering a user")
    }

    // 9) return response
    return res.status(201).json(
        new APIResponse(200, createdUser, "User registed Successfully!!!")
    )
    /*
    Here, we are returning a response after creating a user. 
    Where, we provided its status as 201 --> .status(201) it will be read by postman while showing us the response
    and then, we send the data in json response.
    but, we want to send the response by our defined architecture... (to send it in a organized way)
    we will use an the APIResponse class,
        So, we created a new object of APIResponse class, where we have to provide
         1) status code
         2) data 
         3) message
    */
})



/* If checking for single field
   if (fullName === "") { // If fullName field is empty, then?
        throw new APIError(
            400, // status code
            "fullName is required" // message
        )
   }
})
*/



/* Testing purpose while initializing 
const registerUser = asyncHandler(async (req, res) => {
    // Here async method is being used as parameter -in place of-> requestHandler
    res.status(200).json({ message: "ok" })
})
*/


// ----------------------------------------------------------------------------------------------/
                           // LOG IN USER //
// ----------------------------------------------------------------------------------------------/
    
/* 
The Algorithm we follow to login a user :
    1) get data from request body
    2) give uername or email based access
    3) find the user
    4) (if user exists) check the password
    5) (if password is varified) Generate access and refresh token
    6) send these token in cookies (secure cookies)
    7) response of login success
*/

    const loginUser = asyncHandler(async (req, res) => {
        // console.log(req.body)
// 1) get data from request body
        const {email, username, password} = req.body
        // console.log(`Email: ${email} and Username: ${username} and Password: ${password}`)

// 2) give uername or email based access
        // checking - Atleast username or email should exists:
        if (!username && !email) {
            throw new APIError(400, "Atleast one (username or email) is required")
        }

        // alternative :-
        // if (!(username || email)) {
        //     throw new APIError(400, "Atleast one (username or email) is required")
        // }


// 3) If Exist - find the user:
        // a) if we get [any one or both] of the required - Check in database
        const user = await User.findOne({ // Find User
            $or : [{username} , {email}] //--> MongoDB Operator
        })

        // b) if user doesn't exist / didn't find in database
        if (!user) {
            throw new APIError(404, "User does not exist!")
        }

// 4) if user exists ---> check the password
        // a) if user exists in database - ckeck password
        const isPasswordValid = await user.isPasswordCorrect(password) // Returns true or false

        // b) if password is invalid
        if (!isPasswordValid) { // if the value is false => notFalse(!False) = True, True === True
            throw new APIError(401, "Invalid User Credentials!")
        }

// 5) if password is varified ---> Generate access and refresh token
        const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id) // to access the required user by its unique id.
        // console.log(accessToken, refreshToken)
        // const { accessToken, refreshToken } is called destructure

// 6) send these token in cookies (secure cookies)
        // what information to send to the user. (picking out unwanted fields like, password and refeshToken)
        const loggedInUser = await User.findById(User._id).select("-password -refreshToken")

        // sending cookies
        const options = { // by tagging them true, cookies can only be modified from server and not through frontend 
            httpOnly : true,
            secure : true
        } // sending secure cookies
        console.log("User logged In Successfully")
        // can send cookies as we used cookie-parser
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(
                200,
                { /*
                As we already set tokens in cookies. 
                then why sending tokens again in data body?
                Because, here we trying to handle the situation where maybe the user 
                wants to save his tokens in local storage for safety reason, or trying to access through mobile app (there we are not able to set cookies)
                */
                    User : loggedInUser, accessToken, refreshToken // sending tokens are optional
                },
                "User logged In Successfully"
            )
        )
        
    })


// ----------------------------------------------------------------------------------------------/
                           // LOG OUT USER //
// ----------------------------------------------------------------------------------------------/
const loggedOutUser = asyncHandler(async(req, res) => {
/*  
    The Algorithm we follow to login a user :
    1) remove user credentials
    2) remove/reset refresh token

    3) find the user
    4) (if user exists) check the password
    5) (if password is varified) Generate access and refresh token
    6) send these token in cookies (secure cookies)
    7) response of login success
*/
    // Didn't store it as we don't need to refer it later
    await User.findByIdAndUpdate(
        // for the specific found user
        req.USER._id,
        { // Clearing the refresh token
            $set: {
                refreshToken: undefined
            }
        },
        { // show response, once cleared
            new: true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    console.log("User logged Out Successfully")

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new APIResponse(200, {}, "User Logged Out Successfully !!!")
    )


})

//---------------------------------------------------------------//
//                  REFRESHING ACCESS TOKEN                      //
//---------------------------------------------------------------//
const refreshAccessToken = asyncHandler(async(req, res) =>{
    // we taking the token from the user end from cookies or body
    const incomingRefreshToken =  req.cookie.refreshToken || req.body.refreshToken

    // If we don't get the incomingRefreshToken
    if (!incomingRefreshToken) {
        throw new APIError(401, "Unauthorized Request")
    }

    // Just a safety measure, if something went wrong through out the process inside "try" OR to prevent the app from crashing
    try {
        // Verifying the incomingRefreshToken 
        const decodedToken = jwt.verify( // Why we decoded? 
            incomingRefreshToken, //Cause the token provided to the user was encrypted 
            process.env.REFRESH_TOKEN_SECRET // and to match this token with one saved in the database, we need to decode it.
        )
    
        // Accessing the user in database with the decoded token 
        const user = await User.findById(decodedToken?._id) // if user found by decoded token, save in a variable
        
        if (!user) { // If user not found, throw error
            throw new APIError(401, "Invalid Refresh Token!")
        }
    
        // If Refresh Token doesn't matches, throw error
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new APIError(401, "Refresh Token is Expired or Used")
        }
    
        // If Refresh Token matches, Generate new one
        const {newAccessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id) // As its a database quert, so it will take a bit of time that's why used await keyword
        
        // helps while sending cookies
        const options = { // by tagging them true, cookies can only be modified from server and not through frontend 
            httpOnly: true,
            secure: true
        }
    
        // returning a response with cookies to front end
        return res
        .status(200)
        .cookie("accessToken", newAccessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new APIResponse(
                200,
                {accessToken: newAccessToken, refreshToken: newRefreshToken}, // just as a refrence so that the data reach to the right place
                "Access Token Refreshed!"
            )
        )
    } catch (error) {
        throw new APIError(401, error?.message || "Invalid Refresh token")
    }

})


// ----------------------------------------------------------------------------------------------/
                                // CHANGE CURRENT PASSWORD //
// ----------------------------------------------------------------------------------------------/

const changeCurrentPassword = asyncHandler(async(req, res) => {

    const {oldPassword, newPassword} = req.body // What fields you want to take

    const user = await User.findById(req.user?._id)// Find old user from request body, as in auth.middleware req have access to user --> which will give us the user id

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword) // gives boolean as response

    if (!isPasswordCorrect) { // If old password is incorrect
        throw new APIError(401, "Invalid old Password")
    }

    // Changing it
    user.password = newPassword // this sets password variable as new password, it didn't modified or saved in database yet.
    
    //  to save modification in database or to update the user information in database
    await user.save({validateBeforeSave: false}) // as we don't want to validate the user before saving the changes in database, 
    // we just wanted to call only the hook associated with password

    return res
    .status(200)
    .json( new APIResponse(200, {}, "Password updated Successfully!!"))
})


// ----------------------------------------------------------------------------------------------/
                    // FETCHING CURRENT USER (if the user is logged in) //
// ----------------------------------------------------------------------------------------------/

const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new APIResponse(200, req.user, "Current User Fetched Successfully!!!")) // AS we injected user in request while making the middleware that's why we can fetch the user easily
})

// ----------------------------------------------------------------------------------------------/
                                // UPDATE ACCOUNT(user) DETAILS //
// ----------------------------------------------------------------------------------------------/

const updateAccountDetails = asyncHandler(async(req, res) => {
    const{fullName, email} = req.body

    if(!fullName || !email) {
        throw APIError(401, "all fields are empty")
    }

    const user = await User.findByIdAndUpdate( // const user will save the information returned, once this successfully run
        req.user?._id, // inserted query
        { // Object and associated mongoDB operators ($)
            $set : { // set receives an object which contains the required parameters to update
                    fullName : fullName, // 1st one is where to set : 2nd one is what to set
                    email: email // email --> we can also provide what to set directly, if we writing it in defined order
            }
        }, 
        {new : true} // if this is true, so the information we get after updation, will return here
    ).select("-password") // while returning the user, don't return password with it

/* 
WHY we used select method here?
 
to optimize the calls, otherwise we have to run another query as findByID on user._id and 
then we remove the password or any confidential data field from it in same manner (by calling select function) and then we return the user. 
but, here as we set new as true, which actually returns the user after saving in database. 
so, running another query makes no sense. 
*/

return res
.status(200)
.json(new APIResponse(200, user, "Account details updated successfully!!"))

})

// ----------------------------------------------------------------------------------------------/
                                // UPDATING User's Avatar Image //
// ----------------------------------------------------------------------------------------------/

/* 
TODOs (while setting the routes)
1) use of Multer Middleware, to accept the files
2) use of auth middleware, cause we want only those users who are already logged in
*/

const updateUserAvatar = asyncHandler(async(req, res) => {

    // fetching and Deleting the old avatar image
    const oldImageDeleted = await deleteFromCloudinary(req.user.avatar);
    
    // Check if the old avatar deletion was successful
    if (!oldImageDeleted) {
        throw new ApiError(400, "Failed to delete old avatar image.");
    }

//-------------------------------------------------------------------------------
    const avatarLocalPath = req.file?.path // if we get file in request the get only the path of the file 
    // we didn't write "req.files" here as we are expecting only one file not an array from the user.

    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar file is missing!!!")
    }

    // to save/upload the file on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)

    // if file is saved on cloudinary but we didn't get the url
    if(!avatar.url){
        throw new APIError(400, "Error while uploading the avatar")
    }

    // update the avatar for the user 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : { // we user only update cause we want to update only one field in the user not the whole user
                    avatar : avatar.url // as this will be saved in the database, which accepts the data as text not file
            }
        },
        {new: true}
     ).select("-password")

     return res
     .status(200)
     .json(new APIResponse(200, user, "Avatar Image updated successfully!!!"))
})

// ----------------------------------------------------------------------------------------------/
                            // UPDATING User's Cover Image //
// ----------------------------------------------------------------------------------------------/

/* 
TODOs (while setting the routes)
1) use of Multer Middleware, to accept the files
2) use of auth middleware, cause we want only those users who are already logged in
*/

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path // if we get file in request the get only the path of the file 
    // we didn't write "req.files" here as we are expecting only one file not an array from the user.

    if (!coverImageLocalPath) {
        throw new APIError(400, "Cover Image file is missing!!!")
    }
    
    // fetching and Deleting the old avatar image
    const oldCoverImageDeleted = await deleteFromCloudinary(req.user.avatar);

    // Check if the old avatar deletion was successful
    if (!oldCoverImageDeleted) {
        throw new ApiError(400, "Failed to delete old avatar image.");
    }
    else{
        console.log("Old Avatar File Deleted")
    }
    
    // to save/upload the file on cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    // if file is saved on cloudinary but we didn't get the url
    if(!coverImage.url){
        throw new APIError(400, "Error while uploading the Cover Image")
    }

    // update the avatar for the user 
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : { // we user only update cause we want to update only one field in the user not the whole user
                coverImage : coverImage.url // as this will be saved in the database, which accepts the data as text not file
            }
        },
        {new: true}
     ).select("-password")

     return res
     .status(200)
     .json(new APIResponse(200, user, "Cover Image updated successfully!!!"))
})

// ----------------------------------------------------------------------------------------------/
                                // Getting Details of the user using it's username //
// ----------------------------------------------------------------------------------------------/

const getUserChennelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params // Taking username from request body as it holds properties of a user

    if (!username?.trim()) {
        throw new APIError(400, "Username is missing")
    }
    // fetching count of subscribers to a channel 
    const channel = await User.aggregate(// using aggregate method of MongoDB
        [ // take Arrays as parameter. As output goes as an array
            {//Pipeline stages. like, Stage 1 ===> Filtering the document.
            $match: {username: username?.toLowerCase()} // $ defines field
            },

            {// Pipeline stage 2 ===> Selecting/Filtering all the users subscribing a perticular channel (it will store all the filtered documents)
                $lookup:{
                    from:"subscriptions", // from which (Subscription) model
                    localField:"_id", // local field, select all the ids'. From the defined model
                    foreignField: "channel", // forign field, who subscribed a perticular channel . From the defined model
                    as:"subscribers" // defining pipeline name, as it is storing multiple documents in an object
                }
            },

            {// Pipeline stage 3 ===> Selecting/Filtering all the users whom a perticular channel subscribed (it will store all the filtered documents)
                $lookup:{
                    from:"subscriptions", // from which (Subscription) model
                    localField:"_id", // local field, select all the ids'. From the defined model
                    foreignField: "subscriber", // forign field, whom a perticular channel subscribed. From the defined model
                    as:"subscribedTo" // defining field pipeline name, as it is storing multiple documents in an object
                }
            },

            {// Pipeline stage 4 ===> adding additional fields to the existing lookup object 
                $addFields:{
                    subscribersCount: {// name of the additional field, to store count of users 
                        $size: "$subscribers" // calculating size/ Counting documents(users) from the field of defined lookup object
                    },
                    subscribedToCount: {// Same for other field
                        $size: "$subscribedTo"
                    },
                    isSubscribed:{ // Adding field, to calculate if a perticular channel is subscribed by a user or not.
                        $cond: { // If condition 
                            if: {
                                $in: // use of $in, to check if a perticular condition is valid or not
                                [req.user?._id, // what to search, as user is already loggedIn, so we can fetch id from the user as it can be accessed by request
                                "$subscribers.subscriber" // to search from which object. As subscribers(object) is a defined field here, and then from this field we can fetch subscriber information 
                                ]
                                /*
                                In Short, in $in (field) it can check through array or object both
                                * In 1st paramater, we define what to search 
                                * In 2nd paramater, from which object, we want to search
                                */
                            }, 
                            then: true, // If the defined condition is valid
                            else: false // If not valid
                        }
                    }
                }
            },
            { // pipeline stage 5 ===> to (Project /pass on) selected fields/properties of an object (user object)
                $project: {
                    subscribersCount : 1,
                    subscribedToCount : 1,
                    isSubscribed : 1,
                    fullName : 1,
                    username : 1,
                    coverImage : 1, 
                    avatar : 1,
                    email : 1
                }
            }

        ])

        if(!channel?.lenght) {
            throw new APIError(404, "channel does not exist")
        }
        console.log("===================================================");
        console.log("Channels' details : \n", channel);
        console.log("===================================================");

        return res
        .status(200)
        .json(
            // new APIResponse(200, channel[0], "User channel fetched successfully")
        )
})

// To populate the details related to a video
const getWatchHistory = asyncHandler(async(req, res) => {
    const user = await User.aggregate([
        {
            $match: { // filtering records related to a perticular user
                _id: new mongoose.Types.ObjectId.createFromHexString(req.user._id)
            }
        },
        { // for a perticular user, we looking for videos he/she played  
            $lookup: {
                from: "videos", // from videos database
                localField: "watchHistory", // where local field of the user is watchHistory
                foreignField: "_id", // looking for videos by its id
                as: "watchHistory", // and, calling this lookup as watchHistory
                pipeline: [ // nested search / filter within the videos related to the user's profile
                    {
                        $lookup: { // filtering the videos own by the selected user 
                            from: 'users', // from users database
                            localField: 'owner', // where local field for those videos will be the owner of the selected videos (in earlier search)
                            foreignField: '_id', // looking for the owner by its id
                            as: "owner", // calling this lookup as owner
                            pipeline: [ // adding further pipeline as we are intrested in specific fields of the owner (not all)
                                {
                                    $project: { // that's why we projecting or populating the selective fields based on the filter above.
                                        userName: 1, // here 1 represent true or allowed 
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    { // to restructure the array for the front end, which we will get as result of the owner lookup field (OPTIONAL)
                        $addFields: {
                            owner : { // overwritting the existing owner field by giving the same name to this one
                                $first : "$owner" // fetching first value from the owner field( as owner is a field that's why we used $) array 
                                // to fetch first element from an array. 2 methods are there, 1. arrayelementat 2. $first (easier)
                            } // this will provide an object from which front end person can easily fetch the values
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new APIResponse(
            200,
            user[0].getWatchHistory,
            "Watch history fetched Successfully!!! "
        )
    )
})

// ----------------------------------------------------------------------------------------------/
                                // EXPORTING THE Functions //
// ----------------------------------------------------------------------------------------------/
export{
    registerUser,
    loginUser, 
    loggedOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChennelProfile,
    getWatchHistory
} // exporting as an object

// we import these to app.js file