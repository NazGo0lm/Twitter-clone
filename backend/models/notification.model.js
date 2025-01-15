import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
{
    from: {
        type: mongoose.Schema.Types.ObjectId,
        //  throw new TypeError('Invalid value for schema path `' + fullPath +
        //^TypeError: Invalid value for schema path `from.type`, got value "undefined"
        ref: 'User',
        required:true
    },
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true,
    },
    type: {
        type: String,
        required: true,
        enum:["follow","like"],
    },
    read: {
        type: Boolean,
        default:false,
    },
},
{timestamps:true});

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;












