import {asyncHandler} from '../utils/asyncHandler.js';
import {ApiError} from '../utils/ApiError.js';
import {ApiResponse} from '../utils/ApiResponse.js';
import {User} from '../models/user.models.js';
import {uploadOncloudinary} from '../utils/cloudinary.js'
import { deleteFromCloudinary} from '../utils/cloudinary.js';
import jwt from 'jsonwebtoken';

const generateAccessandRefreshToken = async(userId) => {
  try {
    const user = await User.findById(userId);
  
    // Small check for user
    if(!userId){
      console.log("User not found");
      throw new ApiError(410, "User Not Found");
    }
  
    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()
  
    user.refreshToken = refreshToken
    await user.save({validateBeforeSave: false})
    return {accessToken, refreshToken};
  
  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating ACCESS and REFESH tokens");
  }
}
const registerUser = asyncHandler(async (req, res) => {
  const {fullname, email, username, password} = req.body

  if([fullname, username, email, password].some((field) => field?.trim() === "")){
    throw new ApiError(404, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{username}, {email}]
  })

  if(existedUser){
    throw new ApiError(409, "User with email or username already exist");
  }

  console.warn(req.files)

  const avatarLocalPath = req.files?.avatar?.[0]?.path
  const coverLocalPath = req.files?.coverImage?.[0]?.path

  if(!avatarLocalPath){
    throw new ApiError(410, "Avatar file is missing");
  }

  if(!coverLocalPath){
    throw new ApiError(409, "Cover Image file is missing");
  }

  // const avatar = await uploadOncloudinary(avatarLocalPath);
  // const avatarImage = await uploadOncloudinary(coverLocalPath);

  let avatar;
  try {
    avatar = await uploadOncloudinary(avatarLocalPath);
    console.log("Uploaded avatar", avatar);
  } catch (error){
    console.log("Error uploading avatar", error);
    throw new ApiError(500, "Failed to load avatar");
  }

  let coverImage;
  try {
    coverImage = await uploadOncloudinary(coverLocalPath);
    console.log("Uploaded coverImage", coverImage);
  } catch (error){
    console.log("Error uploading coverImage", error);
    throw new ApiError(500, "Failed to load coverImage");
  }
  
  try {
    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase()
    })
  
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
  
    if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering");
    }
  
    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered succesfully"));
  } catch (error) {
    console.log("User creation failed");

    if(avatar){
      await deleteFromCloudinary(avatar.public_id)
    }

    if(coverImage){
      await deleteFromCloudinary(coverImage.public_id)
    }

    throw new ApiError(500, "Something went wrong while registering and Images were deleted");
  }

})

const loginUser = asyncHandler(async (req, res) => {
  // get data from body
  const {email, username, password} = req.body;
  
  if(!email || !username || !password){
    throw new ApiError(400, "All fields are required"); 
  }

  const user = await User.findOne({
    $or: [{username}, {email}]
  })

  if(!user){
    console.log("User not found");
    throw new ApiError(404, "User Not Found");
  }

  // validate password

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Inavlid user credentials");
  }

  const {accessToken, refreshToken} = await generateAccessandRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id)
    .select("-password -refreshToken");

  if(!loggedInUser){
    throw new ApiError(500, "User login failed");
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  } 

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(
      200, 
      {user: loggedInUser, accessToken, refreshToken},
      "User logged in successfully"
    ))

})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if(!incomingRefreshToken){
    throw new ApiError(401, "Failed to collect refresh token");
  }

  try {
    const decodeToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    )

    const user = await user.findById(decodeToken?._id)

    if(!user){
      throw new ApiError(401, "Invalid refresh token");
    }

    if(user?.refreshToken !== incomingRefreshToken){
      throw new ApiError(401, "Refresh Token Expired"); 
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    }

    const {accessToken, newRefreshToken} = await generateAccessandRefreshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(new ApiResponse(
        200,
        {
          accessToken,
          refreshToken: newRefreshToken
        },
        "Access token refreshed successfully"
      ))

  } catch (error) {
    
  }
})

const logoutUser = asyncHandler( async (req, res) => {
  await User.findByIdAndUpdate(
    // need to comeback here after middleware video
    req.user_.id,{
      $set: {
        refreshToken: undefined,
      }
    },
    {new: true}
  )

  const options = {
    httpOnly: true,
    secure: process.eventNames.NODE_ENV === "production",
  }

  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const changeCurrentPassword = asyncHandler( async(req, res) => {
  const {oldPassword, newPassword} = req.body

  const user = await User.findById(req.user?._id )

  const isPasswordValid = await user.isPasswordCorrect(oldPassword);

  if(!isPasswordValid){
    throw new ApiError(401, "Incorrect password!");
  }

  user.password = newPassword

  await user.save({validateBeforeSave: false})

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler( async(req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user details"))
})

const updateAccountDetails = asyncHandler( async(req, res) => {
  const {fullname, email} = req.body

  if(!fullname || !email){
    throw new ApiError("Fullname and email are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,{
      $set: {
        fullname, 
        email: email
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Details updated successfully"))
})

const updateUserAvatar = asyncHandler( async(req, res) => {
  const avatarLocalPath = req.file?.path

  if(!avatarLocalPath){
    throw new ApiError(400, "File is required")
  }

  const avatar = await uploadOncloudinary(avatarLocalPath)

  if(!avatar.url){
    throw new ApiError(500, "Something went wrong while uploading avatar")
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    {new: true}
  ).select("-password -refreshToken")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
})

const updateUserCoverImage = asyncHandler( async(req, res) => {
  const coverLocalPath = req.file?.path

  if(!coverLocalPath){
    throw new ApiError(400, "File is required");
  }

  const coverImage = await uploadOncloudinary(coverLocalPath)

  if(!coverImage.url){
    throw new ApiError(500, "Cover Image not uploaded on cloudinary")
  }

  const user = await User.findByIdAndUpdate(
    req.file?.path,
    {
      $set: {
        coverImage: coverImage.url
      }
    }, 
    {new: true}
  ).select("-password -refreshToken")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover Image updated successfully"))

})

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const {username} = req.params

  if(!username?.trim()){
    throw new ApiError(400, "Username is required")
  }

  const channel = await User.aggregate(
    [
      {
        $match: {
          username: username?.toLowerCase()
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers" 
        }
      },
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriber",
          as: "subscribedTo"
        }
      },
      {
        $addFields:{
          subscribersCount: {
            $size: "$subscriber"
          },
          channelSubscriberCount: {
            $size: "$subscribedTo"
          },
          isSubscribed: {
            $cond: {
              if: {$in: [req.user?._id, "$subscribers.subscriber"
              ]},
              then: true,
              else: false
            }
          }
        }
      },
      {
        // Project only neccessary details
        $project: {
          fullname: 1,
          username: 1,
          avatar: 1,
          subscribersCount: 1,
          channelSubscriberCount: 1,
          isSubscribed: 1,
          email: 1,
          coverImage: 1,
        }
      }
    ]
  )

  if(!channel?.length){
    throw new ApiError(404, "Channel not found")
  }

  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      channel[0],
      "Channel profile fetched successfully"
    ))
})

const getWatchHistory = asyncHandler(async (req, res) => {

  const channel = await User.aggregate(
    [
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.user._id)
        }
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: 
          [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      fullname: 1,
                      username: 1,
                      avatar: 1,
                    }
                  }
                ]
              }
            },
            {
              $addFields: {
                owner: {
                  $first: "owner"
                }
              }
            }
          ]
        }
      }
    ]
  )

  return res
    .status(200)
    .json(new ApiResponse(
      200, 
      user[0]?.watchHistory,
      "User watch history fetched successfully"
    ))
})

export {
  registerUser,
  loginUser, 
  refreshAccessToken,
  logoutUser,
  changeCurrentPassword,
  getCurrentUser, 
  updateAccountDetails, 
  updateUserAvatar, 
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
}
