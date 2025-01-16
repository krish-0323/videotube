import mongoose, {Schema} from "mongoose";

/*
  comment ObjectId comments
  video ObjectId videos
  likedBy ObjectId users
  tweets ObjectId tweets
*/
const likeSchema = new Schema(
  {
    comments: {
      type: Schema.Types.ObjectId,
      ref: "Comment"
    },
    videos: {
      type: Schema.Types.ObjectId,
      ref: "Video"
    },
    likedBy: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    tweets: {
      type: Schema.Types.ObjectId,
      ref: "Tweet"
    }
  }, 
  {timestamps: true}
)

export const Like = mongoose.model("Like", likeSchema);