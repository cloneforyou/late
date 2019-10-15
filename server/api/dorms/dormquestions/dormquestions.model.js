const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Message = require('../../messages/messages.model')

const schema = new Schema(
  {
    message: { maxlength: 100 },
    // If dorm == null then assume general question
    _dorm: { type: mongoose.Schema.Types.ObjectId, ref: 'Dorm', default: null },
    isAnonymous: { type: Boolean, default: true }
    // TODO responses w/ populate? Research populate()
    // TODO ratings w/ populate? Research populate()
  }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = Message.discriminator('DormQuestion', schema)
