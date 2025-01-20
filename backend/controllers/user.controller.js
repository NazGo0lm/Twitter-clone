import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

//MODELS
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

/* import User from '../models/userModel'; // Adjust the path as needed
import bcrypt from 'bcryptjs';
import cloudinary from 'cloudinary'; // Ensure cloudinary is properly configured

 */

export const getUserProfile = async (req, res) => {
    const { username } = req.params;

    try {
        const user = await User.findOne({ username }).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });
        
        res.status(200).json(user);
    } catch (error) {
        console.log("Error in getUserProfile: ", error.message);
        res.status(500).json({ error: error.message });
    }
};

export const followUnfollowUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userToModify = await User.findById(id);
        const currentUser = await User.findById(req.user._id);

        //req.user._id.toString() it must be string not object
        if (id === req.user._id.toString()) {
            return res.status(400).json({ error: "You can't follow/unfollow yourself" }); 
        }
        if (!userToModify || !currentUser) {
            return res.status(400).json({error:"User not found"})
        }

        const isFollowing = currentUser.following.includes(id);
        if (isFollowing) {
            //unfollow the user
            await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });
            //remove *- $pull
             //TODO: return the id of the user as a response
            res.status(200).json({ message: "User unfollowed successfully" });
        } else {
            //follow the user
            //add *- $push
            await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
            await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
            //Send notification to the user
            const newNotification = new Notification({
                type: "follow",
                from: req.user._id,
                to: userToModify._id,
            });

            await newNotification.save();

            //TODO: return the id of the user as a response

            res.status(200).json({ message: "User followed successfully" });
        }
    } catch (error) {
        console.log("Error in followUnfollowUser: ", error.message);
        res.status(500).json({ error: error.message });
    }
}

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user._id;

    // Retrieve the list of users the current user is following
    const usersFollowedByMe = await User.findById(userId).select("following");

    // Aggregate to get a random sample of 10 users excluding the current user
    const users = await User.aggregate([
      {
        $match: {
          _id: { $ne: userId },
        },
      },
      { $sample: { size: 10 } },
    ]);

    // Filter out users already followed by the current user
    const filteredUsers = users.filter(
      (user) => !usersFollowedByMe.following.includes(user._id)
    );

    // Select the top 4 suggested users
    const suggestedUsers = filteredUsers.slice(0, 4);

    // Remove password field from each suggested user
    suggestedUsers.forEach((user) => (user.password = null));

    // Respond with the suggested users
    res.status(200).json({ suggestedUsers });
  } catch (error) {
    // Log any errors and respond with a server error
    console.log("Error in getSuggestedUsers: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
    const { fullName, email, username, currentPassword, newPassword, bio, link } = req.body;
    let { profileImg, coverImg } = req.body;

    const userId = req.user._id;

    try {
        // Find the user by their ID
        let user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check if both currentPassword and newPassword are provided together
        if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
            return res.status(400).json({ error: "Please provide both current password and new password" });
        }

        // Handle password change
        if (currentPassword && newPassword) {
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
            if (newPassword.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters long" });
            }

            const salt = await bcrypt.genSalt(10); // Corrected method name
            user.password = await bcrypt.hash(newPassword, salt);
        }

        // Profile Image Upload
        if (profileImg) {
            if (user.profileImg) {
                // Delete existing profile image from Cloudinary
                await cloudinary.uploader.destroy(user.profileImg.split("/").pop().split(".")[0]);
            }
            // Upload new profile image to Cloudinary
            const uploadedResponse = await cloudinary.uploader.upload(profileImg);
            profileImg = uploadedResponse.secure_url;
            //The secure_url is a property in the response object returned by Cloudinary
        }

        // Cover Image Upload
        if (coverImg) {
            if (user.coverImg) {
                // Delete existing cover image from Cloudinary
                await cloudinary.uploader.destroy(user.coverImg.split("/").pop().split(".")[0]);
            }
            // Upload new cover image to Cloudinary
            const uploadedResponse = await cloudinary.uploader.upload(coverImg);
            coverImg = uploadedResponse.secure_url;
        }

        // Update User Fields
        user.fullName = fullName || user.fullName;
        user.email = email || user.email;
        user.username = username || user.username; // Corrected this line
        user.bio = bio || user.bio;
        user.link = link || user.link;
        user.profileImg = profileImg || user.profileImg; // Corrected this line
        user.coverImg = coverImg || user.coverImg;

        // Save the updated user
        user = await user.save();

        // Remove password from response
        user.password = null;

        return res.status(200).json(user);
    } catch (error) {
        console.log("Error in updateUser: ", error.message); // Corrected log message
        res.status(500).json({ error: error.message });
    }
};



