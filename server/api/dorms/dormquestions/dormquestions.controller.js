const logger = require('../../../modules/logger')
const DormQuestion = require('./dormquestions.model')
const DormRating = require('../dormratings/dormratings.model')
const Dorm = require('../dorms.model')
const mongoose = require('mongoose')

/**
 * Get all the questions that match the provided parameters (search or by dorm ID)
 * @param ctx {Koa context} ctx.query.dorm and ctx.query.search are used, if provided. If ctx.query.dorm is
 *   provided, it will only show questions that belong to that dorm ID. Otherwise it will show only general questions.
 *   If ctx.query.search is provided, it will only show questions that contain the search value.
 * @returns {Promise<void>}
 */
async function getQuestions (ctx) {
  // Must cast ID to ObjectId: https://github.com/Automattic/mongoose/issues/1399
  const queryObj = { hasBeenEdited: false }
  if (ctx.query.dorm) {
    queryObj._dorm = mongoose.Types.ObjectId(ctx.query.dorm)
  } else {
    queryObj._dorm = null
  }

  if (ctx.query.search) {
    queryObj.body = new RegExp('.*' + ctx.query.search + '.*', 'i')
  }

  // const questions = await DormQuestion.find(queryObj)
  let questions = await DormQuestion.aggregate()
    .match(queryObj)
    .lookup({ // Add dorm question answers
      from: 'messages',
      let: { questionId: '$_id' },
      pipeline: [{
        $match: { // Match any answers to this question
          $expr: {
            $and: [
              { $eq: ['$_question', '$$questionId'] },
              { $eq: ['$type', 'DormQuestionAnswer'] },
              { $eq: ['$hasBeenEdited', false] }
            ]
          } }
      }, {
        $lookup: { // Fill in the answer's author
          from: 'students',
          let: { authorid: '$_author' },
          pipeline: [
            { $match: { $expr: { $eq: ['$$authorid', '$_id'] } } },
            { $project: { name: 1, graduationYear: 1 } }
          ],
          as: '_author'
        }
      }, {
        $unwind: '$_author'
      }, {
        $lookup: { // Fill in previous edits data
          from: 'messages',
          let: { editId: '$_previousEdits' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$editId'] } } },
            { $project: { _author: 0 } } // Remove author from previous edits. It's implied
          ],
          as: '_previousEdits'
        }
      }, {
        $lookup: { // Stream ratings for this review into the 'rating' array
          from: 'dormratings',
          localField: '_id',
          foreignField: '_isFor',
          as: 'rating'
        }
      }, {
        $addFields: { // Reduce the array of ratings into a simple integer value
          rating: {
            $reduce: {
              input: '$rating',
              initialValue: 0,
              in: { $add: ['$$value', '$$this.value'] }
            }
          }
        }
      }
      ],
      as: 'answers'
    })
    .lookup({ // Stream ratings for this review into the 'rating' array
      from: 'dormratings',
      localField: '_id',
      foreignField: '_isFor',
      as: 'rating'
    })
    .addFields({ // Reduce the array of ratings into a simple integer value
      rating: { $reduce: {
        input: '$rating',
        initialValue: 0,
        in: { $add: ['$$value', '$$this.value'] }
      } }
    })
    .lookup({ // Populate _author with the author's name and grad year
      from: 'students',
      let: { authorid: '$_author', isAnonymous: '$isAnonymous' },
      pipeline: [
        { $match: { $expr: { $eq: ['$$authorid', '$_id'] } } },
        { $project: { name: 1, graduationYear: 1 } },
        { $redact: { $cond: [{ $eq: ['$$isAnonymous', true] }, '$$PRUNE', '$$KEEP'] } }
      ],
      as: '_author'
    })
    // Convert _author from array with one element into just object
    .unwind({ path: '$_author', preserveNullAndEmptyArrays: true })

  // populate _previousEdits to contain the actual edit data and dorm data
  // Author is removed from previous edits as it is implied and simplifies needing to remove it if isAnonymous is true.
  questions = await DormQuestion.populate(questions, { path: '_previousEdits', select: '-_author' })

  ctx.ok({ questions })
}

/**
 * Post a new question.
 * @param ctx {Koa context} body parameters "title", "dorm", and "isAnonymous" are used. "title" is required. "title"
 *  must be 5 characters or longer.
 *  "title" is the title of the question. "isAnonymous" is a boolean for whether the author wants their name to be shown
 *  next to the question. Defaults to true. "dorm" is the ID of the dorm this question pertains to. Defaults to "null",
 *  i.e. this is a general question.
 * @returns {Promise<void>}
 */
async function postQuestion (ctx) {
  if (!ctx.request.body.title || ctx.request.body.title.length < 5) {
    return ctx.badRequest('Please provide a longer question title')
  }
  // If a dorm is provided then make sure it exists
  if (ctx.request.body.dorm) {
    const d = await Dorm.findOne({ _id: ctx.request.body.dorm })
    if (!d) {
      return ctx.notFound('The dorm provided does not exist!')
    }
  }
  const question = new DormQuestion()
  question.isAnonymous = !!ctx.request.body.isAnonymous
  question.body = ctx.request.body.title
  question._dorm = ctx.request.body.dorm
  question._author = ctx.state.user._id

  await question.save()
  ctx.created()
}

async function editQuestion (ctx) {
  if (ctx.request.body.title && ctx.request.body.title.length < 5) {
    return ctx.badRequest('Please provide a longer question title')
  }

  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only edit their own questions unless they're admin
    searchObj._author = ctx.state.user._id
  }
  const original = await DormQuestion.findOne(searchObj)
  if (original == null) {
    return ctx.notFound()
  }
  if (original.hasBeenEdited) { // Cannot delete message if it is an outdated version of another message
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  const newMessage = new DormQuestion()
  newMessage.body = ctx.request.body.title === undefined ? original.body : ctx.request.body.title
  newMessage.isAnonymous = ctx.request.body.isAnonymous === undefined
    ? original.isAnonymous : !!ctx.request.body.isAnonymous
  newMessage._dorm = original._dorm
  newMessage._previousEdits = original._previousEdits // Copy list of old edits & add the original to it
  newMessage._previousEdits.push(original)
  newMessage._author = original._author
  original.hasBeenEdited = true
  original.save()
  newMessage.save()

  // Update ratings to point to the new message
  const ratings = await DormRating.find({ _isFor: original._id })
  if (ratings) {
    ratings.forEach((r) => {
      r._isFor = newMessage._id
      r.save()
    })
  }
  ctx.created()
}

async function deleteQuestion (ctx) {
  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only delete their own questions unless they're admin
    searchObj._author = ctx.state.user._id
  }
  const dq = await DormQuestion.findOne(searchObj)
  if (dq == null) {
    return ctx.notFound()
  }
  if (dq.hasBeenEdited) { // Cannot delete message if it is an outdated version of another message
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  if (dq._previousEdits) { // Delete all previous versions of this question
    for (const prev of dq._previousEdits) {
      await DormQuestion.deleteOne({ _id: prev._id })
    }
  }

  await DormQuestion.deleteOne({ _id: dq._id })
  ctx.noContent()
}

async function voteOnQuestion (ctx) {
  const dq = await DormQuestion.findOne({ _id: ctx.params.id })
  if (dq == null) {
    return ctx.notFound()
  }
  let rating

  rating = await DormRating.findOne({
    _isFor: ctx.params.id,
    isForType: 'DormQuestion',
    _from: ctx.state.user._id
  })

  if (rating == null) {
    rating = new DormRating()
  }

  rating._from = ctx.state.user._id
  rating._isFor = dq
  rating.isForType = 'DormQuestion'
  rating.value = ctx.request.body.value === 'POSITIVE' ? 1 : -1
  rating.save()
  ctx.noContent()
}

module.exports = {
  getQuestions,
  postQuestion,
  editQuestion,
  deleteQuestion,
  voteOnQuestion
}
