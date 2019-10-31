const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Message = require('../../messages/messages.model')

const schema = new Schema(
  {
    // If dorm == null then assume general question
    _dorm: { type: mongoose.Schema.Types.ObjectId, ref: 'Dorm', default: null },
    isAnonymous: { type: Boolean, default: true }
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

module.exports = Message.discriminator('DormQuestion', schema)
