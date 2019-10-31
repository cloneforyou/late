const mongoose = require('mongoose')

const schema = new mongoose.Schema({
  _from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  value: { type: String, required: true, enum: ['POSITIVE', 'NEGATIVE'] },
  _isFor: { // What this rating is for, such as an entire dorm or a specific review of a dorm.
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'isForType',
    required: true
  },
  isForType: { // https://mongoosejs.com/docs/populate.html#dynamic-ref
    type: String,
    required: true,
    enum: ['Dorm', 'DormReview', 'DormPhoto', 'DormQuestion', 'DormQuestionAnswer']
  }
})

schema.set('toObject', { getters: true, virtuals: true })
schema.set('toJSON', { getters: true, virtuals: true })

module.exports = mongoose.model('DormRating', schema)
