const mongoose = require('mongoose')
const Schema = mongoose.Schema
const Message = require('../../../messages/messages.model')

const schema = new Schema(
  {
    _question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DormQuestion'
    },
    // Previous versions of this answer are simply other, older instances of Message
    _previousEdits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }]
    // TODO ratings w/ populate? Research populate()
  }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = Message.discriminator('DormQuestionAnswer', schema)
