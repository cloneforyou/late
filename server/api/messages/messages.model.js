const mongoose = require('mongoose')
const Schema = mongoose.Schema

/**
 * Generalized model. Avoid controlling directly, instead
 * use controllers of discriminators (e.g. DormReviews).
 */
const schema = new Schema(
  {
    _author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    body: { type: String, maxlength: 2000, required: true }, // Markdown supported
    // Previous versions of this answer are simply other, older instances of Message
    _previousEdits: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    // Whether there is some message that contains this message's ID in it's _previousEdits array
    // It is necessary to use a boolean instead of an array of newer versions to avoid circular JSON structures on populate()
    hasBeenEdited: { type: Boolean, default: false }
  },
  { timestamps: true, discriminatorKey: 'type' }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = mongoose.model('Message', schema)
