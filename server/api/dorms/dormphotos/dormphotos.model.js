const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    _author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student'
    },
    _dorm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dorm'
    },
    isAnonymous: { type: Boolean, default: true },
    imageURL: { type: String, required: true },
    description: { type: String, minlength: 5, maxlength: 200 },
    confirmed: { type: Boolean, default: false } // whether or not the photo has been confirmed by admins and can be displayed
  },
  { timestamps: true }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = mongoose.model('DormPhoto', schema)
