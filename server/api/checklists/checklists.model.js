const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const category = new Schema({
  title: {
    type: String,
    trim: true,
    minlength: 1,
    maxlength: 300,
    required: true
  },
  items: [
    {
      title: {
        type: String,
        trim: true,
        minlength: 1,
        maxlength: 300,
        required: true
      },
      count: { type: Number, required: true },
      progress: { type: Number, default: 0 }
    }
  ],
  private: { type: Boolean, default: false }
});

const schema = new Schema(
  {
    _student: {
      // author of checklist
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true
    },
    categories: [category]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Checklist', schema);
