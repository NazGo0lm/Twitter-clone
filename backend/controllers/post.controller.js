import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import cloudinary from 'cloudinary';
import Notification from "../models/notification.model.js";

export const createPost = async (req, res) => {
    try {
        //Extract Data:
        const { text } = req.body;
        let { img } = req.body;
        const userId = req.user._id.toString();

        //Find User:
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        //Validate Post Content:
        if (!text && !img) {
            return res.status(400).json({ error: "Post must have text or image" });
        }
        
        //Upload Image
        if (img) {
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        //Create New Post
        const newPost = new Post({
            user: userId,
            text,
            img,
        });

        //Save Post and Respond
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
        console.log("Internal server error ",error)
    }
}

export const deletePost = async(req, res) => {
    try {
        //Find Post
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ error: "Post not found" });

        }

        //Authorization Check:
        if (post.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({error:"You are not authorized to delete this post"})
        }
        //Delete Image (if exists):
        if (post.img) {
            const imgId = post.img.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(imgId); // Corrected method name
        }

        //Delete Post:
        await Post.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: "Post deleted successfully" });

    } catch (error) {
        console.log("Error in deletePost controller: ", error);
        res.status(500).json({ error: " Internal server Error" });
    }
}


export const commentOnPost = async (req, res) => {
    try {
        //Extract Data from Request:
        const { text } = req.body;
        const postId = req.params.id;
        const userId = req.user._id;

        //Validate Text Field:
        if (!text) {
            return res.status(400).json({error: "Text field is required"})
        }
        //Find the Post:
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({error: "Post not found"})
        }

        //Create Comment Object:
        const comment = { user: userId, text };

        //Add Comment to Post:
        post.comments.push(comment);
        await post.save();

        //Send Response:
        res.status(200).json(post);

    } catch (error) {
        console.log("Error in commentonPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}



//analyse from here

export const likeUnlikePost = async (req, res) => {
    try {
        // Extract Data from Request
        const userId = req.user._id;
        const { id: postId } = req.params;

        // Log extracted data
        //console.log("User ID:", userId);
        //console.log("Post ID:", postId);

        // Find the Post
        const post = await Post.findById(postId);
        if (!post) {
            console.log("Post not found");
            return res.status(404).json({ error: "Post not found" });
        }

        // Check if User Liked the Post
        const userLikedPost = post.likes.includes(userId);
        //console.log("User liked post:", userLikedPost);

        if (userLikedPost) {
            await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
            await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });
            console.log("Post unliked");
            res.status(200).json({ message: "Post unliked successfully" });

        } else {
            // Like Post (if not liked yet)
            post.likes.push(userId);
            await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
            await post.save();
            console.log("Post liked");

            // Log post and user after liking
            //console.log("Post after like:", post);
            const updatedUser = await User.findById(userId);
            //console.log("User after liking post:", updatedUser);

            // Create Notification
            const notification = new Notification({
                from: userId,
                to: post.user,
                type: "like"
            });

            // Save Notification
            await notification.save();
            console.log("Notification created");

            res.status(200).json({ message: "Post liked successfully" });
        }
    } catch (error) {
        console.log("Error in likeUnlikePost controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

//this analyse
export const getAllPosts = async (req, res) => {
    try {
        const posts = await Post.find().sort({ createdAt: -1 }).populate({
            path: "user",
            select:"-password",
        })
        .populate({
            path: "comments.user",
            select:"-password",
        });

        if (posts.length === 0) {
            return res.status(200).json([]);
        }
        res.status(200).json(posts);
    } catch (error) {
        console.log("Error in commentonPost controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

//this too
export const getLikedPosts = async (req, res) => {
    const userId = req.params.id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        //console.log("User liked posts:", user.likedPosts); // Add this line

        const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
            .populate({
                path: 'user',
                select: '-password',
            })
            .populate({
                path: "comments.user",
                select: "-password",
            });

        //console.log("Liked posts retrieved:", likedPosts); // Add this line

        res.status(200).json(likedPosts);
        
    } catch (error) {
        console.log("Error in getLikedPosts controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}



////analyse post controller

export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const following = user.following;
        const feedPosts = await Post.find({ user: { $in: following } })
            .sort({ createdAt: -1 })
            .populate({
                path: "user",
                select:"-password",
            })
            .populate({
                path: "comments.user",
                select:"-password",
            });
        res.status(200).json(feedPosts);

    } catch (error) {
        console.log("Error in getLikedPosts controller: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
}


//this too
export const getUserPosts = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "user",
        select: "-password",
      })
      .populate({
        path: "comments.user",
        select: "-password",
      });

    res.status(200).json(posts);
  } catch (error) {
    console.log("Error in getLikedPosts controller: ", error);
    res.status(500).json({ error: "Internal server error" });
  }
}; 

