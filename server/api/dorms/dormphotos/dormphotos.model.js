const mongoose = require('mongoose')
const Schema = mongoose.Schema

const schema = new Schema(
  {
    _author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    _dorm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dorm',
      required: true
    },
    isAnonymous: { type: Boolean, default: true },
    imageURL: { type: String, required: true },
    description: { type: String, maxlength: 200, default: '' },
    confirmed: { type: Boolean, default: false } // whether or not the photo has been confirmed by admins and can be displayed
  },
  { timestamps: true }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = mongoose.model('DormPhoto', schema)
