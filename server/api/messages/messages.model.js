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
    body: { type: String, maxlength: 2000, required: true } // Markdown supported
  },
  { timestamps: true, discriminatorKey: 'type' }
)

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = mongoose.model('Message', schema)
