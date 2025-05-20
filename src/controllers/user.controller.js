import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import  jwt  from "jsonwebtoken";



const registerUser = asyncHandler(async (req , res) => {
  
  const {username, email, fullname, password} = req.body
  if([fullname, email, username, password].some(field => field?.trim() === "")){
    throw new ApiError(400, "All fields Are compulsory")
  }

  const existedUser = await User.findOne({
    $or : [{ username }, { email }]
  })

  if(existedUser) throw new ApiError(409, "User with email or username already exist");

  const avatarLocalPath = req.files?.avatar[0]?.path;

  let coverImageLocalPath;
  if(req.files.coverImage)
    coverImageLocalPath = req.files.coverImage[0].path;

  if(!avatarLocalPath) throw new ApiError(400, "Avatar file is required!");


  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if(!avatar) throw new ApiError(400, "Avatar file is required!");

  const user = await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  });

  const isUserCreated = await User.findById(user._id).select(
    "-password -refreshToken"
  )


  if(!isUserCreated) throw new ApiError(500, "Something went wrong while registering user");



  try {
    return res.status(201).json(
      new ApiResponse(201, isUserCreated, "User registered successfully")
    );
  } catch (error) {
    console.error("User creation failed:", error);
    return res.status(500).json(
      new ApiResponse(500, null, "Internal Server Error")
    );
  }
  


});


const generateRefreshAccessToken = async (userId) => {
  try{

    const user = await User.findById(userId);
    const refreshToken = user.generateRefreshToken()
    const accessToken = user.generateAccessToken()

    user.refreshToken = refreshToken;
    await user.save({validateBeforeSave : false})

    return {accessToken, refreshToken};

  }catch(error){
    throw new ApiError(501, error.message || "Unable to create Tokens")
  }

}

const loginUser = asyncHandler(async (req, res) => {


  const {email, username, password} = req.body;

  if(!email && !username) throw new ApiError(401, "username or email is required");

  const user = await User.findOne({
    $or : [{username}, {email}]
  })

  const isPasswordValid = await user.isPasswordCorrect(password);

  
  if(!isPasswordValid) throw new ApiError(401, "Invalid Password")

  const {accessToken, refreshToken} = await generateRefreshAccessToken(user._id);


    const loggedInUser = User.findById(user._id)
      .select("-password -refreshToken");
  
    
    const options = {
      httpOnly : true,
      secure: false
    }

  


  res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            _id: loggedInUser._id,
            name: loggedInUser.name,
            email: loggedInUser.email,
          },
          accessToken,
          refreshToken,
        },
        "User Logged In Successfully!"
      )
  );

})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $set : {
        refreshToken : undefined
      }
    }
  );

  const options = {
    http : true,
    secure : false
  }


    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged out!"));

})


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie?.refreshToken || req.body?.refreshToken;

  if(!incomingRefreshToken) throw new ApiError(401, "Invalid refresh token");

  try{
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id);

    if(!user) throw new ApiError(401, "Invalid refresh Token");

    const {accessToken, newRefreshToken} = await generateRefreshAccessToken(user._id);

    user.refreshToken = newRefreshToken;

    await user.save({validateBeforeSave : false});


    const options = {
      httpOnly : true,
      secure: false
    }

    res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", newRefreshToken, options)
    .json(
      new ApiResponse(200, 
        {accessToken, refreshToken : newRefreshToken}, 
        "Access Token generated Successfully")
    )

  }catch(error){
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
})

const changeCurrentPassword = asyncHandler(async(req, res) => {
  const {oldPassword, newPassword} = req.body;

  const user = await User.findById(req.user?._id);

  const isPasswordCorrect = user.isPasswordCorrect(oldPassword);

  user.password = newPassword;
  await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));

})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current User fetched Successfully!");
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {fullname, email} = req.body;

  if(!fullname && !email) throw new ApiError("field to update are required!");
  
  const user = User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));

});


const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) throw new ApiError(400, "Avatar file is missing");

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) throw new ApiError(400, "Error while uploading on avatar");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatar.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath)
    throw new ApiError(400, "Cover image file is missing");

  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url)
    throw new ApiError(400, "Error while uploading on Cover Image");

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImage.url },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover Image updated successfully"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
}