const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Message = require('../../messages/messages.model')

const schema = new Schema(
  {
    title: { type: String, maxlength: 40, required: true },
    _dorm: { type: mongoose.Schema.Types.ObjectId, ref: 'Dorm', required: true },
    isAnonymous: { type: Boolean, default: false }
  }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

schema.methods.toJSON = function () {
  const obj = this.toObject()
  if (obj.isAnonymous) {
    delete obj._author
  }
  return obj
}

module.exports = Message.discriminator('DormReview', schema)
