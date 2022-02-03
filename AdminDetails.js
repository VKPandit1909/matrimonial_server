const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
    name:String,
    username:{ type: String, required: true, unique: true },
    password:String,
    type:String,
    address:String,
},{ collection: 'AdminDetails' })

mongoose.model("AdminDetails",AdminSchema);