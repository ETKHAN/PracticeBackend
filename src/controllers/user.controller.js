import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";



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




export {registerUser}