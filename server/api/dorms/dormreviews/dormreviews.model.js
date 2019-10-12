const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Message = require('../../messages/messages.model')

const schema = new Schema(
  {
    title: { type: String, maxlength: 40, required: true },
    dorm: { type: mongoose.Schema.Types.ObjectId, ref: 'Dorm', required: true },
    // Previous versions of this review are simply other, older instances of Message
    previousEdits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    isAnonymous: { type: Boolean, default: false }
    // TODO ratings w/ populate? Research populate()
  }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = Message.discriminator('DormReview', schema)
